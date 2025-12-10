from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.db import models
from app.services.email_ingest import ingest_emails
from app.services.gmail_client import fetch_gmail_messages, default_since_days


def _get_or_create_state(db: Session, user_id: str, provider: str = "gmail") -> models.MailboxSyncState:
    state = (
        db.query(models.MailboxSyncState)
        .filter(models.MailboxSyncState.user_id == user_id, models.MailboxSyncState.provider == provider)
        .first()
    )
    if state:
        return state
    state = models.MailboxSyncState(user_id=user_id, provider=provider)
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


def initial_gmail_import(
    db: Session,
    *,
    user_id: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    days_back: int = 90,
) -> Tuple[int, Optional[str], Optional[datetime]]:
    state = _get_or_create_state(db, user_id=user_id, provider="gmail")
    state.access_token = access_token
    state.refresh_token = refresh_token
    db.add(state)
    db.commit()

    emails, history_id, latest_ts = fetch_gmail_messages(
        access_token,
        since=default_since_days(days_back),
        history_id=None,
    )
    ingested = ingest_emails(db, user_id, emails) if emails else 0

    state.delta_link = history_id or state.delta_link  # 复用 delta_link 字段存 historyId
    state.last_synced_at = latest_ts or state.last_synced_at
    state.updated_at = datetime.utcnow()
    db.add(state)
    db.commit()
    return ingested, state.delta_link, state.last_synced_at


def sync_gmail_incremental(
    db: Session,
    *,
    user_id: str,
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None,
    fallback_days_back: int = 7,
) -> Tuple[int, Optional[str], Optional[datetime]]:
    state = _get_or_create_state(db, user_id=user_id, provider="gmail")
    token_to_use = access_token or state.access_token
    if not token_to_use:
        raise RuntimeError("No Gmail access token available for sync")

    if access_token:
        state.access_token = access_token
    if refresh_token:
        state.refresh_token = refresh_token
    db.add(state)
    db.commit()

    emails, history_id, latest_ts = fetch_gmail_messages(
        token_to_use,
        since=default_since_days(fallback_days_back) if not state.delta_link else None,
        history_id=state.delta_link,
    )
    ingested = ingest_emails(db, user_id, emails) if emails else 0

    state.delta_link = history_id or state.delta_link
    state.last_synced_at = latest_ts or state.last_synced_at
    state.updated_at = datetime.utcnow()
    db.add(state)
    db.commit()
    return ingested, state.delta_link, state.last_synced_at
