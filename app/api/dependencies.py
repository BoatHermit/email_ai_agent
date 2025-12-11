from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db import models
from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_ingestion_session(db: Session, session_id: int, user_id: str) -> models.IngestionSession:
    session = (
        db.query(models.IngestionSession)
        .filter(models.IngestionSession.id == session_id, models.IngestionSession.user_id == user_id)
        .first()
    )
    if not session:
        raise RuntimeError(f"IngestionSession {session_id} not found")
    return session
