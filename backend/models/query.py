from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class Submission(BaseModel):
    editor_name: str
    imprint: str
    date_sent: datetime
    status: Literal["Sent", "Reading", "Passed", "Offer"]
    follow_up_date: Optional[datetime] = None


class AiMetadata(BaseModel):
    genre: str = ""
    word_count: str = ""
    comps: List[str] = Field(default_factory=list)
    summary: str = ""
    fit_score: Literal["High", "Medium", "Low"] = "Medium"
    fit_reason: str = ""
    confidence: int = 0
    ai_processed: bool = False


QueryStatus = Literal[
    "new", "reviewing", "requested_partial", "requested_full", "passed", "offered"
]


class QueryDocument(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    author_name: str
    book_title: str
    email_subject: str
    email_body: str
    date_received: datetime
    status: QueryStatus = "new"
    ai_metadata: AiMetadata = Field(default_factory=AiMetadata)
    submissions: List[Submission] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True}


class QueryResponse(BaseModel):
    id: str
    user_id: str
    author_name: str
    book_title: str
    email_subject: str
    email_body: str
    date_received: datetime
    status: QueryStatus
    ai_metadata: AiMetadata
    submissions: List[Submission]
    created_at: datetime


class PatchQueryRequest(BaseModel):
    status: Optional[QueryStatus] = None
    ai_metadata: Optional[dict] = None


class AddSubmissionRequest(BaseModel):
    editor_name: str
    imprint: str
    date_sent: datetime
    status: Literal["Sent", "Reading", "Passed", "Offer"]
    follow_up_date: Optional[datetime] = None


class PatchSubmissionRequest(BaseModel):
    editor_name: Optional[str] = None
    imprint: Optional[str] = None
    date_sent: Optional[datetime] = None
    status: Optional[Literal["Sent", "Reading", "Passed", "Offer"]] = None
    follow_up_date: Optional[datetime] = None
