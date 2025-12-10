from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.db import models
from app.schemas.ingestion import (
    FullIngestionStartRequest,
    FullIngestionBatchRequest,
)
from app.services.email_ingest import ingest_emails


def start_full_ingestion(db: Session, payload: FullIngestionStartRequest, user_id: str) -> models.IngestionSession:
    """
    创建一个新的全量导入会话。
    如果同一 user + provider 有尚未完成的会话，也可以选择复用/报错。
    这里简单起见：总是新建一个会话。
    """
    session = models.IngestionSession(
        user_id=user_id,
        provider=payload.provider,
        status="in_progress",
        checkpoint_token=payload.initial_checkpoint,
        processed_count=0,
        last_error=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def ingest_full_batch(db: Session, payload: FullIngestionBatchRequest, user_id: Optional[str] = None) -> models.IngestionSession:
    """
    将一批邮件写入 DB + ES，并更新对应 IngestionSession 的进度和 checkpoint。
    由于 ingest_emails 本身对 (user_id, external_id) 是幂等的，
    所以即便客户端重复发送某批数据，也不会造成数据重复，天然支持“重试/断点续传”。
    """
    session = (
        db.query(models.IngestionSession)
        .filter(models.IngestionSession.id == payload.session_id)
        .first()
    )
    if not session:
        raise ValueError(f"IngestionSession {payload.session_id} not found")
    if user_id and session.user_id != user_id:
        raise ValueError(f"IngestionSession {payload.session_id} does not belong to user {user_id}")

    if session.status not in ("in_progress",):
        # 你也可以选择允许对 completed 做补充，这里简单直接拒绝
        raise ValueError(f"IngestionSession {payload.session_id} is not in progress (status={session.status})")

    try:
        # 1) 先导入本批次邮件
        # 注意：EmailIngestItem 已经包含 user_id 字段吗？我们原来是从 EmailIngestRequest 传 user_id。
        # 在这里，我们直接使用 session.user_id 保证多租户隔离。
        from app.schemas.email import EmailIngestItem  # 仅为类型提示
        ingested_count = ingest_emails(db, session.user_id, payload.emails)

        # 2) 更新会话状态
        session.processed_count += ingested_count
        if payload.next_checkpoint is not None:
            session.checkpoint_token = payload.next_checkpoint

        if payload.mark_completed:
            session.status = "completed"

        session.last_error = None
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    except Exception as e:
        # 记录错误，方便之后排查/重试
        session.status = "failed"
        session.last_error = str(e)
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()
        db.refresh(session)
        raise
