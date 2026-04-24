from __future__ import annotations
import re
from typing import List, Dict, Any
from datetime import datetime
from db import get_db


def _parse_author_name(sender: str) -> str:
    match = re.match(r'"?([^"<]+)"?\s*<', sender)
    if match:
        return match.group(1).strip()
    return sender.split("@")[0].replace(".", " ").title()


def _parse_book_title(subject: str) -> str:
    for pattern in [
        r'["\']([A-Z][^"\']+)["\']',
        r'(?:query|querying)[\s:]+(.+?)(?:\s*[-–(]|$)',
    ]:
        m = re.search(pattern, subject, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    parts = re.sub(r'(?i)\bquery[:\s]+', '', subject).strip()
    return parts[:80] if parts else subject[:80]


async def ingest_emails(user_id: str, emails: List[Dict[str, Any]]) -> int:
    db = get_db()
    inserted = 0

    for email in emails:
        subject = email.get("subject", "")
        date_received = email.get("date_received", datetime.utcnow())

        existing = await db.queries.find_one({
            "user_id": user_id,
            "email_subject": subject,
            "date_received": date_received,
        })
        if existing:
            continue

        author_name = _parse_author_name(email.get("sender", ""))
        book_title = _parse_book_title(subject)

        doc = {
            "user_id": user_id,
            "author_name": author_name,
            "book_title": book_title,
            "email_subject": subject,
            "email_body": email.get("body", ""),
            "date_received": date_received,
            "status": "new",
            "ai_metadata": {
                "genre": "",
                "word_count": "",
                "comps": [],
                "summary": "",
                "fit_score": "Medium",
                "fit_reason": "",
                "confidence": 0,
                "ai_processed": False,
            },
            "submissions": [],
            "created_at": datetime.utcnow(),
        }
        await db.queries.insert_one(doc)
        inserted += 1

    return inserted
