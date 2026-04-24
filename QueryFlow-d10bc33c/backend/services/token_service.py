from __future__ import annotations
import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
from config import GMAIL_TOKEN_ENCRYPTION_KEY


def _get_fernet() -> Optional[Fernet]:
    key = GMAIL_TOKEN_ENCRYPTION_KEY
    if not key:
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt_token(plain: str) -> str:
    f = _get_fernet()
    if not f:
        return plain
    return f.encrypt(plain.encode()).decode()


def decrypt_token(cipher: str) -> str:
    f = _get_fernet()
    if not f:
        return cipher
    try:
        return f.decrypt(cipher.encode()).decode()
    except Exception:
        return cipher
