from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from bson import ObjectId
from db import get_db
from config import JWT_SECRET, JWT_EXPIRES_IN
from models.user import UserDocument, UserPublic

_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def create_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(tz=timezone.utc) + timedelta(seconds=JWT_EXPIRES_IN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


async def create_user(email: str, name: str, plain_password: str) -> Optional[UserPublic]:
    db = get_db()
    existing = await db.users.find_one({"email": email})
    if existing:
        return None
    doc = {
        "email": email,
        "name": name,
        "hashed_password": hash_password(plain_password),
        "gmail_connected": False,
        "gmail_refresh_token": None,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    return UserPublic(id=str(result.inserted_id), email=email, name=name, gmail_connected=False)


async def get_user_by_email(email: str) -> Optional[dict]:
    db = get_db()
    return await db.users.find_one({"email": email})


async def get_user_by_id(user_id: str) -> Optional[dict]:
    db = get_db()
    try:
        return await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
