from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends, status
from models.user import SignupRequest, LoginRequest, AuthResponse, UserPublic
from services.auth_service import (
    create_user,
    get_user_by_email,
    verify_password,
    create_jwt,
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignupRequest):
    user = await create_user(body.email, body.name, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    token = create_jwt(user.id, user.email)
    return AuthResponse(token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    doc = await get_user_by_email(body.email)
    if not doc or not verify_password(body.password, doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    user = UserPublic(
        id=str(doc["_id"]),
        email=doc["email"],
        name=doc["name"],
        gmail_connected=doc.get("gmail_connected", False),
    )
    token = create_jwt(user.id, user.email)
    return AuthResponse(token=token, user=user)


@router.post("/logout")
async def logout(_: UserPublic = Depends(get_current_user)):
    return {"message": "logged out"}


@router.get("/me", response_model=UserPublic)
async def me(current_user: UserPublic = Depends(get_current_user)):
    return current_user
