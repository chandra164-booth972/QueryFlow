from __future__ import annotations
import json
import re
from typing import Optional
import anthropic
from config import ANTHROPIC_API_KEY
from db import get_db

AGENT_MSWL = (
    "You represent a literary agent who handles: upmarket fiction, literary fiction, "
    "narrative nonfiction, historical fiction, and commercial women's fiction. "
    "You typically do NOT represent: epic fantasy, sci-fi, horror, or children's books. "
    "Your preferred word count range for debut novels is 70,000–100,000 words."
)

EXTRACTION_PROMPT = """You are analyzing a literary agent query email. Extract metadata and assess fit.

Agent's MSWL (Manuscript Wish List):
{mswl}

Query email:
---
{email_body}
---

Return ONLY a valid JSON object with these exact fields:
{{
  "genre": "<primary genre, e.g. Literary Fiction>",
  "word_count": "<e.g. 85,000 or Unknown>",
  "comps": ["<comp title 1>", "<comp title 2>"],
  "summary": "<1-2 sentence plot summary>",
  "fit_score": "<High, Medium, or Low>",
  "fit_reason": "<1 sentence explaining why this does or does not fit the agent's list>",
  "confidence": <integer 0-100 reflecting how confident you are in these extractions>
}}

Return ONLY the JSON object. No markdown fences, no explanation."""


def _parse_ai_response(text: str) -> dict:
    text = text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        data = json.loads(text)
        return {
            "genre": str(data.get("genre", "Unknown")),
            "word_count": str(data.get("word_count", "Unknown")),
            "comps": [str(c) for c in data.get("comps", [])],
            "summary": str(data.get("summary", "")),
            "fit_score": data.get("fit_score", "Medium") if data.get("fit_score") in ("High", "Medium", "Low") else "Medium",
            "fit_reason": str(data.get("fit_reason", "")),
            "confidence": int(data.get("confidence", 50)),
        }
    except (json.JSONDecodeError, ValueError):
        return {
            "genre": "Unknown",
            "word_count": "Unknown",
            "comps": [],
            "summary": "",
            "fit_score": "Medium",
            "fit_reason": "Unable to analyze",
            "confidence": 0,
        }


def extract_query_metadata(email_body: str) -> dict:
    if not ANTHROPIC_API_KEY:
        return _parse_ai_response("{}")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    prompt = EXTRACTION_PROMPT.format(mswl=AGENT_MSWL, email_body=email_body[:4000])

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text if message.content else ""
    return _parse_ai_response(text)


async def process_unprocessed_queries(user_id: str) -> int:
    if not ANTHROPIC_API_KEY:
        return 0

    db = get_db()
    cursor = db.queries.find({"user_id": user_id, "ai_metadata.ai_processed": False})
    docs = await cursor.to_list(length=None)
    processed = 0

    for doc in docs:
        try:
            metadata = extract_query_metadata(doc.get("email_body", ""))
            await db.queries.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "ai_metadata.genre": metadata["genre"],
                        "ai_metadata.word_count": metadata["word_count"],
                        "ai_metadata.comps": metadata["comps"],
                        "ai_metadata.summary": metadata["summary"],
                        "ai_metadata.fit_score": metadata["fit_score"],
                        "ai_metadata.fit_reason": metadata["fit_reason"],
                        "ai_metadata.confidence": metadata["confidence"],
                        "ai_metadata.ai_processed": True,
                    }
                },
            )
            processed += 1
        except Exception as e:
            print(f"AI extraction failed for query {doc['_id']}: {e}")
            await db.queries.update_one(
                {"_id": doc["_id"]},
                {"$set": {"ai_metadata.ai_processed": True}},
            )

    return processed
