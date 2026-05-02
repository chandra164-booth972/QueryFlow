"""
Run from backend/ directory:
  .venv/bin/python scripts/seed_users.py

Seeds test users into MongoDB, then seeds their queries.
Skips any user whose email already exists.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import create_user, get_user_by_email

USERS = [
    {"email": "amy@test.com",    "password": "testpass1", "name": "Amy Keene"},
    {"email": "jane@test.com",   "password": "testpass1", "name": "Jane Brody"},
    {"email": "marcus@test.com", "password": "testpass1", "name": "Marcus Reid"},
]


async def seed_users():
    created = 0
    skipped = 0
    created_emails = []

    for u in USERS:
        existing = await get_user_by_email(u["email"])
        if existing:
            print(f"  skip  {u['email']} (already exists)")
            skipped += 1
            created_emails.append(u["email"])
            continue
        user = await create_user(u["email"], u["name"], u["password"])
        if user:
            print(f"  created  {u['email']}  (id={user.id})")
            created += 1
            created_emails.append(u["email"])
        else:
            print(f"  FAILED   {u['email']}")

    print(f"\nUsers: {created} created, {skipped} skipped.")
    return created_emails


async def main():
    print("=== Seeding users ===")
    emails = await seed_users()

    print("\n=== Seeding queries for each user ===")
    # Import here to avoid circular import issues at module load
    from scripts.seed import seed as seed_queries
    for email in emails:
        await seed_queries(email)


if __name__ == "__main__":
    asyncio.run(main())
