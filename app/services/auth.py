import base64
import hashlib
import hmac
import time
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db import models


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def _sign_payload(user: models.User, issued_at: int) -> tuple[str, str]:
    payload = f"{user.user_id}:{issued_at}"
    secret = f"{settings.AUTH_SECRET}:{user.password_hash}"
    signature = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return payload, signature


def issue_token(user: models.User) -> str:
    issued_at = int(time.time())
    payload, signature = _sign_payload(user, issued_at)
    raw = f"{payload}:{signature}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def verify_token(db: Session, token: str) -> str:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        user_id, issued_at_str, signature = decoded.split(":", 2)
        issued_at = int(issued_at_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    payload, expected_signature = _sign_payload(user, issued_at)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if issued_at < int(time.time()) - settings.AUTH_TOKEN_TTL_SECONDS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    return user.user_id
