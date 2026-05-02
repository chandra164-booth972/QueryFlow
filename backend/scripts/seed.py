"""
Run from backend/ directory:
  .venv/bin/python scripts/seed.py amy@test.com

Inserts the 4 mock queries from the frontend mockData.ts into MongoDB
for the given user email.  Skips duplicates by email_subject+user_id.
"""
import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_db
from services.auth_service import get_user_by_email

BASE = datetime(2024, 5, 15, 12, 0, 0, tzinfo=timezone.utc)

MOCK_QUERIES = [
    {
        "author_name": "Eleanor Vance",
        "book_title": "The Last Bookseller of Prague",
        "email_subject": "QUERY: The Last Bookseller of Prague (Upmarket Historical Fiction)",
        "email_body": (
            "Dear Amy Keene,\n\nI am seeking representation for my 85,000-word upmarket historical fiction "
            "novel, THE LAST BOOKSELLER OF PRAGUE. Given your recent deals in narrative historical fiction "
            "and your stated interest in books about books, I thought this might be a strong fit for your list.\n\n"
            "Set against the backdrop of the 1989 Velvet Revolution, the story follows a disillusioned antiquarian "
            "bookseller who discovers a coded manuscript that could expose a decades-old secret police operation. "
            "It combines the atmospheric tension of Carlos Ruiz Zafón's The Shadow of the Wind with the historical "
            "grounding of Anthony Doerr's All the Light We Cannot See.\n\n"
            "I hold an MFA from the Iowa Writers' Workshop and my short fiction has appeared in The Paris Review.\n\n"
            "Thank you for your time and consideration.\n\nBest,\nEleanor Vance"
        ),
        "date_received": BASE - timedelta(hours=2),
        "status": "new",
        "ai_metadata": {
            "genre": "Upmarket Historical Fiction",
            "word_count": "85,000",
            "comps": ["The Shadow of the Wind", "All the Light We Cannot See"],
            "summary": "During the 1989 Velvet Revolution, an antiquarian bookseller finds a coded manuscript exposing a secret police operation.",
            "fit_score": "High",
            "fit_reason": "Matches your explicit MSWL for 'books about books' and recent deals in upmarket historical fiction.",
            "confidence": 95,
            "ai_processed": True,
        },
        "submissions": [],
    },
    {
        "author_name": "Marcus Thorne",
        "book_title": "Silicon Ghosts",
        "email_subject": "Query: SILICON GHOSTS - Narrative Nonfiction",
        "email_body": (
            "Hi Amy,\n\nI'm writing to query SILICON GHOSTS, a 70,000-word narrative nonfiction project "
            "exploring the forgotten women who programmed the earliest supercomputers.\n\n"
            "I noticed you represent several prominent tech journalists, and I believe this untold history "
            "would appeal to readers of Hidden Figures and The Innovators.\n\n"
            "I am a staff writer at Wired and have been researching this topic for three years.\n\n"
            "Best regards,\nMarcus Thorne"
        ),
        "date_received": BASE - timedelta(hours=24),
        "status": "reviewing",
        "ai_metadata": {
            "genre": "Narrative Nonfiction",
            "word_count": "70,000",
            "comps": ["Hidden Figures", "The Innovators"],
            "summary": "An exploration of the forgotten women who programmed early supercomputers, written by a Wired staff writer.",
            "fit_score": "High",
            "fit_reason": "Strong platform (Wired staff writer) and aligns with your narrative nonfiction focus.",
            "confidence": 92,
            "ai_processed": True,
        },
        "submissions": [],
    },
    {
        "author_name": "Sarah Jenkins",
        "book_title": "The Dragon's Tear",
        "email_subject": "Query: Epic Fantasy - The Dragon's Tear",
        "email_body": (
            "Dear Ms. Keene,\n\nPlease consider my 150,000 word epic fantasy, THE DRAGON'S TEAR. "
            "It is the first in a planned 7-book series.\n\n"
            "When young farm boy Elian discovers a glowing rock, he realizes he is the chosen one "
            "destined to defeat the Dark Lord Malakor.\n\nThank you,\nSarah"
        ),
        "date_received": BASE - timedelta(hours=48),
        "status": "new",
        "ai_metadata": {
            "genre": "Epic Fantasy",
            "word_count": "150,000",
            "comps": [],
            "summary": "A farm boy discovers he is the chosen one destined to defeat a Dark Lord in a 7-book epic fantasy series.",
            "fit_score": "Low",
            "fit_reason": "You do not typically represent Epic Fantasy, and the word count (150k) is unusually high for a debut.",
            "confidence": 88,
            "ai_processed": True,
        },
        "submissions": [],
    },
    {
        "author_name": "David Chen",
        "book_title": "Echoes of the Valley",
        "email_subject": "Query: Echoes of the Valley (Literary Fiction)",
        "email_body": (
            "Dear Amy,\n\nI am submitting ECHOES OF THE VALLEY, a 65,000-word literary debut about a "
            "fractured family reuniting in California's Central Valley after the death of their patriarch.\n\n"
            "It explores themes of generational trauma and agricultural decline, similar to the works of "
            "John Steinbeck but with a modern, diverse perspective.\n\nBest,\nDavid"
        ),
        "date_received": BASE - timedelta(hours=72),
        "status": "requested_partial",
        "ai_metadata": {
            "genre": "Literary Fiction",
            "word_count": "65,000",
            "comps": ["John Steinbeck (Thematic)"],
            "summary": "A literary debut about a fractured family reuniting in the Central Valley after their patriarch's death, exploring generational trauma.",
            "fit_score": "Medium",
            "fit_reason": "Fits your literary debut interest, though word count is slightly on the shorter side.",
            "confidence": 85,
            "ai_processed": True,
        },
        "submissions": [
            {
                "editor_name": "Julia Brown",
                "imprint": "Knopf",
                "date_sent": BASE - timedelta(days=5),
                "status": "Reading",
                "follow_up_date": BASE + timedelta(days=14),
            }
        ],
    },
]


async def seed(email: str):
    user = await get_user_by_email(email)
    if not user:
        print(f"User {email} not found — run signup first.")
        return

    user_id = str(user["_id"])
    db = get_db()
    inserted = 0
    skipped = 0

    for q in MOCK_QUERIES:
        existing = await db.queries.find_one(
            {"user_id": user_id, "email_subject": q["email_subject"]}
        )
        if existing:
            skipped += 1
            continue
        doc = {**q, "user_id": user_id, "created_at": datetime.utcnow()}
        await db.queries.insert_one(doc)
        inserted += 1

    print(f"Seeded {inserted} queries, skipped {skipped} duplicates for user {email}.")


if __name__ == "__main__":
    email_arg = sys.argv[1] if len(sys.argv) > 1 else "amy@test.com"
    asyncio.run(seed(email_arg))
