from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from db import get_db
from models.query import QueryResponse, AiMetadata, Submission


def _doc_to_response(doc: dict) -> QueryResponse:
    ai_raw = doc.get("ai_metadata", {})
    subs_raw = doc.get("submissions", [])
    return QueryResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        author_name=doc["author_name"],
        book_title=doc["book_title"],
        email_subject=doc["email_subject"],
        email_body=doc["email_body"],
        date_received=doc["date_received"],
        status=doc.get("status", "new"),
        ai_metadata=AiMetadata(**ai_raw) if ai_raw else AiMetadata(),
        submissions=[Submission(**s) for s in subs_raw],
        created_at=doc.get("created_at", datetime.utcnow()),
    )


async def list_queries(user_id: str) -> List[QueryResponse]:
    db = get_db()
    cursor = db.queries.find({"user_id": user_id}).sort("date_received", -1)
    docs = await cursor.to_list(length=None)
    return [_doc_to_response(d) for d in docs]


async def get_query(query_id: str, user_id: str) -> Optional[QueryResponse]:
    db = get_db()
    try:
        doc = await db.queries.find_one({"_id": ObjectId(query_id), "user_id": user_id})
    except Exception:
        return None
    return _doc_to_response(doc) if doc else None


async def patch_query(
    query_id: str,
    user_id: str,
    status: Optional[str],
    ai_metadata_overrides: Optional[dict],
) -> Optional[QueryResponse]:
    db = get_db()
    try:
        oid = ObjectId(query_id)
    except Exception:
        return None

    update: dict = {}
    if status:
        update["status"] = status
    if ai_metadata_overrides:
        for key in ("genre", "word_count"):
            if key in ai_metadata_overrides:
                update[f"ai_metadata.{key}"] = ai_metadata_overrides[key]

    if not update:
        return await get_query(query_id, user_id)

    result = await db.queries.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$set": update},
        return_document=True,
    )
    return _doc_to_response(result) if result else None


async def add_submission(query_id: str, user_id: str, submission: dict) -> Optional[QueryResponse]:
    db = get_db()
    try:
        oid = ObjectId(query_id)
    except Exception:
        return None
    result = await db.queries.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$push": {"submissions": submission}},
        return_document=True,
    )
    return _doc_to_response(result) if result else None


async def patch_submission(
    query_id: str,
    user_id: str,
    index: int,
    updates: dict,
) -> Optional[QueryResponse]:
    db = get_db()
    try:
        oid = ObjectId(query_id)
    except Exception:
        return None

    doc = await db.queries.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        return None
    subs = doc.get("submissions", [])
    if index < 0 or index >= len(subs):
        return None

    set_fields = {f"submissions.{index}.{k}": v for k, v in updates.items() if v is not None}
    if not set_fields:
        return _doc_to_response(doc)

    result = await db.queries.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$set": set_fields},
        return_document=True,
    )
    return _doc_to_response(result) if result else None
