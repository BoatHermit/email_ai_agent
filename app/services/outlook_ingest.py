from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.db import models
from app.services.email_ingest import ingest_emails
from app.services.outlook_client import fetch_outlook_messages, default_since_days


def _get_or_create_state(db: Session, user_id: str, email: str, legacy_provider: str = "outlook") -> models.MailboxSyncState:
    """
    provider 字段现在保存邮箱账号。这里尝试用邮箱命中；如果命中旧数据会自动迁移。
    """
    email_key = email.lower()
    state = (
        db.query(models.MailboxSyncState)
        .filter(models.MailboxSyncState.user_id == user_id, models.MailboxSyncState.provider == email_key)
        .first()
    )
    if state:
        return state

    legacy_state = (
        db.query(models.MailboxSyncState)
        .filter(models.MailboxSyncState.user_id == user_id, models.MailboxSyncState.provider == legacy_provider)
        .first()
    )
    if legacy_state:
        legacy_state.provider = email_key
        db.add(legacy_state)
        db.commit()
        db.refresh(legacy_state)
        return legacy_state

    state = models.MailboxSyncState(
        user_id=user_id,
        provider=email_key,
    )
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


def initial_outlook_import(
    db: Session,
    *,
    user_id: str,
    email: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    days_back: int = 90,
) -> Tuple[int, Optional[str], Optional[datetime]]:
    """
    首次接入 Outlook 时，自动拉取最近 N 天邮件并更新 delta link。
    返回 (ingested_count, delta_link, latest_ts)
    """
    state = _get_or_create_state(db, user_id=user_id, email=email, legacy_provider="outlook")
    state.access_token = access_token
    state.refresh_token = refresh_token
    db.add(state)
    db.commit()

    emails, delta_link, latest_ts = fetch_outlook_messages(
        access_token,
        since=default_since_days(days_back),
        delta_link=None,
        page_size=50,
    )

    ingested_count = ingest_emails(db, user_id, emails) if emails else 0

    state.delta_link = delta_link or state.delta_link
    state.last_synced_at = latest_ts or state.last_synced_at
    state.updated_at = datetime.utcnow()
    db.add(state)
    db.commit()
    return ingested_count, state.delta_link, state.last_synced_at


def sync_outlook_incremental(
    db: Session,
    *,
    user_id: str,
    email: str,
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None,
    fallback_days_back: int = 7,
) -> Tuple[int, Optional[str], Optional[datetime]]:
    """
    登录时增量同步未同步的邮件。
    优先使用存储的 delta_link；若不存在则回退到最近 fallback_days_back 天。
    """
    state = _get_or_create_state(db, user_id=user_id, email=email, legacy_provider="outlook")
    token_to_use = access_token or state.access_token
    if not token_to_use:
        raise RuntimeError("No Outlook access token available for sync")

    if access_token:
        state.access_token = access_token
    if refresh_token:
        state.refresh_token = refresh_token
    db.add(state)
    db.commit()

    emails, delta_link, latest_ts = fetch_outlook_messages(
        token_to_use,
        since=default_since_days(fallback_days_back) if not state.delta_link else None,
        delta_link=state.delta_link,
        page_size=50,
    )
    ingested_count = ingest_emails(db, user_id, emails) if emails else 0

    state.delta_link = delta_link or state.delta_link
    state.last_synced_at = latest_ts or state.last_synced_at
    state.updated_at = datetime.utcnow()
    db.add(state)
    db.commit()
    return ingested_count, state.delta_link, state.last_synced_at
