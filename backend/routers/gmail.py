from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, CORS_ORIGINS
from dependencies import get_current_user
from models.user import UserPublic
from db import get_db
from bson import ObjectId
from services.gmail_service import fetch_query_emails
from services.ingestion_service import ingest_emails
from services.token_service import encrypt_token, decrypt_token

router = APIRouter(prefix="/api/v1/gmail", tags=["gmail"])

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def _make_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )


@router.get("/connect")
async def connect_gmail(current_user: UserPublic = Depends(get_current_user)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Gmail integration not configured")
    flow = _make_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=current_user.id,
        prompt="consent",
    )
    return {"auth_url": auth_url}


async def _run_ingestion(user_id: str, access_token: str, refresh_token: str):
    try:
        emails = fetch_query_emails(access_token, refresh_token)
        await ingest_emails(user_id, emails)

        from services.ai_service import process_unprocessed_queries
        await process_unprocessed_queries(user_id)
    except Exception as e:
        print(f"Ingestion error for user {user_id}: {e}")


@router.get("/callback")
async def gmail_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    flow = _make_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    access_token = creds.token
    refresh_token = creds.refresh_token or ""

    db = get_db()
    try:
        oid = ObjectId(state)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state")

    encrypted = encrypt_token(refresh_token)
    await db.users.update_one(
        {"_id": oid},
        {"$set": {"gmail_connected": True, "gmail_refresh_token": encrypted}},
    )

    # Count before ingestion to return approximate number
    count_before = await db.queries.count_documents({"user_id": state})
    emails = fetch_query_emails(access_token, refresh_token)
    queries_found = len(emails)

    background_tasks.add_task(_run_ingestion, state, access_token, refresh_token)

    frontend_origin = CORS_ORIGINS[0] if CORS_ORIGINS else "http://localhost:3000"
    redirect_url = f"{frontend_origin}/?gmail_connected=true&queries_found={queries_found}"
    return RedirectResponse(url=redirect_url)


@router.post("/sync")
async def sync_gmail(
    background_tasks: BackgroundTasks,
    current_user: UserPublic = Depends(get_current_user),
):
    db = get_db()
    from bson import ObjectId
    user_doc = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not user_doc or not user_doc.get("gmail_connected"):
        raise HTTPException(status_code=400, detail="Gmail not connected")

    encrypted = user_doc.get("gmail_refresh_token", "")
    refresh_token = decrypt_token(encrypted)
    if not refresh_token:
        raise HTTPException(status_code=400, detail="No Gmail refresh token stored")

    background_tasks.add_task(_run_ingestion, current_user.id, "", refresh_token)
    return {"message": "Sync started"}
