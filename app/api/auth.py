from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.db import models
from app.schemas import LoginRequest, LoginResponse
from app.services.auth import hash_password, issue_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user_id = (payload.user_id or "").strip()
    password = payload.password or ""
    if not user_id or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="user_id and password are required"
        )

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        user = models.User(user_id=user_id, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = issue_token(user)
    return LoginResponse(user_id=user.user_id, access_token=token)
