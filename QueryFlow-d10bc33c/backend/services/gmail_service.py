from __future__ import annotations
import base64
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
_QUERY_SUBJECT_PATTERN = re.compile(r"\bquery\b", re.IGNORECASE)


def _build_service(access_token: str, refresh_token: str):
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _extract_body(payload: dict) -> str:
    body = ""
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    elif mime.startswith("multipart/"):
        for part in payload.get("parts", []):
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
                    break
    return body.strip()


def fetch_query_emails(access_token: str, refresh_token: str) -> List[Dict[str, Any]]:
    service = _build_service(access_token, refresh_token)
    since = (datetime.now(tz=timezone.utc) - timedelta(days=30)).strftime("%Y/%m/%d")
    result = service.users().messages().list(
        userId="me",
        q=f"subject:query after:{since}",
        maxResults=200,
    ).execute()

    messages = result.get("messages", [])
    emails: List[Dict[str, Any]] = []

    for msg_ref in messages:
        msg = service.users().messages().get(
            userId="me",
            id=msg_ref["id"],
            format="full",
        ).execute()

        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        subject = headers.get("subject", "")
        sender = headers.get("from", "")
        date_str = headers.get("date", "")

        if not _QUERY_SUBJECT_PATTERN.search(subject):
            continue

        body = _extract_body(msg.get("payload", {}))
        if not body:
            continue

        date_received: Optional[datetime] = None
        try:
            from email.utils import parsedate_to_datetime
            date_received = parsedate_to_datetime(date_str)
        except Exception:
            date_received = datetime.now(tz=timezone.utc)

        emails.append({
            "subject": subject,
            "body": body,
            "sender": sender,
            "date_received": date_received,
        })

    return emails
