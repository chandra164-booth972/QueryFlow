from __future__ import annotations
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from models.user import UserPublic
from models.query import QueryResponse, PatchQueryRequest, AddSubmissionRequest, PatchSubmissionRequest
from services.query_service import (
    list_queries,
    get_query,
    patch_query,
    add_submission,
    patch_submission,
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/v1/queries", tags=["queries"])


@router.get("", response_model=List[QueryResponse])
async def get_queries(current_user: UserPublic = Depends(get_current_user)):
    queries = await list_queries(current_user.id)
    return queries


@router.get("/{query_id}", response_model=QueryResponse)
async def get_single_query(query_id: str, current_user: UserPublic = Depends(get_current_user)):
    q = await get_query(query_id, current_user.id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    return q


@router.patch("/{query_id}", response_model=QueryResponse)
async def update_query(
    query_id: str,
    body: PatchQueryRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    updated = await patch_query(
        query_id,
        current_user.id,
        body.status,
        body.ai_metadata,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    return updated


@router.post("/{query_id}/submissions", response_model=QueryResponse)
async def create_submission(
    query_id: str,
    body: AddSubmissionRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    sub_dict = body.model_dump()
    result = await add_submission(query_id, current_user.id, sub_dict)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    return result


@router.patch("/{query_id}/submissions/{index}", response_model=QueryResponse)
async def update_submission(
    query_id: str,
    index: int,
    body: PatchSubmissionRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = await patch_submission(query_id, current_user.id, index, updates)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query or submission not found",
        )
    return result
