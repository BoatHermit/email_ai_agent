from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db import models
from app import deps
from app.schemas import (
    EmailIngestRequest,
    EmailIngestResponse,
    AskRequest,
    AskResponse,
    SourceFragment,
    EmailListResponse,
    FullIngestionStartRequest,
    FullIngestionStartResponse,
    FullIngestionBatchRequest,
    FullIngestionBatchResponse,
    FullIngestionStatusResponse,
)
from app.schemas.outlook import (
    OutlookConnectRequest,
    OutlookSyncRequest,
    OutlookSyncResponse,
)
from app.schemas.gmail import (
    GmailConnectRequest,
    GmailSyncRequest,
    GmailSyncResponse,
)
from app.services.email_ingest import ingest_emails
from app.services.answer_engine import answer_question
from app.services.search_index_es import ensure_email_index
from app.services.full_ingestion import start_full_ingestion, ingest_full_batch
from app.services.outlook_ingest import initial_outlook_import, sync_outlook_incremental
from app.services.gmail_ingest import initial_gmail_import, sync_gmail_incremental
from app.services.chat_history import (
    get_chat_history,
    format_chat_history_text,
    save_chat_turn,
    ensure_chat_session_with_title,
)

# 创建 DB 表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email AI Agent (Shortwave-style) with ES & Multitenancy")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/ingestion/full/start", response_model=FullIngestionStartResponse)
def full_ingestion_start(
    payload: FullIngestionStartRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    创建一个新的全量导入会话。
    前端 / 同步服务拿到 session_id 以后，就可以按批次调用 /ingestion/full/batch。
    """
    session = start_full_ingestion(db, payload, user_id=user_id)
    return FullIngestionStartResponse(
        session_id=session.id,
        user_id=session.user_id,
        provider=session.provider,
        status=session.status,
        checkpoint_token=session.checkpoint_token,
        processed_count=session.processed_count,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@app.post("/ingestion/full/batch", response_model=FullIngestionBatchResponse)
def full_ingestion_batch(
    payload: FullIngestionBatchRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    为某个全量导入会话导入一批邮件。
    - emails: 本批次的邮件列表
    - next_checkpoint: 外部邮箱服务的“下一页”游标
    - mark_completed: 如果这是最后一批，可以置 true
    """
    session_before = (
        db.query(models.IngestionSession)
        .filter(models.IngestionSession.id == payload.session_id, models.IngestionSession.user_id == user_id)
        .first()
    )
    if not session_before:
        # 给出更友好的错误；也可以抛异常被全局捕获
        raise RuntimeError(f"IngestionSession {payload.session_id} not found")

    processed_before = session_before.processed_count

    session_after = ingest_full_batch(db, payload, user_id=user_id)
    ingested_in_batch = session_after.processed_count - processed_before

    return FullIngestionBatchResponse(
        session_id=session_after.id,
        ingested_in_batch=ingested_in_batch,
        total_processed_count=session_after.processed_count,
        status=session_after.status,
        checkpoint_token=session_after.checkpoint_token,
        updated_at=session_after.updated_at,
    )


@app.get("/ingestion/full/{session_id}", response_model=FullIngestionStatusResponse)
def full_ingestion_status(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    查询某个全量导入会话的状态（断点续传用）。
    前端可以拿 checkpoint_token 去继续从 Gmail / IMAP 拉下一批邮件。
    """
    session = (
        db.query(models.IngestionSession)
        .filter(models.IngestionSession.id == session_id, models.IngestionSession.user_id == user_id)
        .first()
    )
    if not session:
        raise RuntimeError(f"IngestionSession {session_id} not found")

    return FullIngestionStatusResponse(
        session_id=session.id,
        user_id=session.user_id,
        provider=session.provider,
        status=session.status,
        checkpoint_token=session.checkpoint_token,
        processed_count=session.processed_count,
        last_error=session.last_error,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@app.on_event("startup")
def on_startup():
    # 初始化 ES 索引
    ensure_email_index()


@app.post("/emails/ingest", response_model=EmailIngestResponse)
def ingest_endpoint(
    payload: EmailIngestRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    count = ingest_emails(db, user_id, payload.emails)
    return EmailIngestResponse(ingested=count)


@app.get("/emails", response_model=EmailListResponse)
def list_emails(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    分页查询当前用户的邮件，按时间逆序排列。
    """
    base_q = db.query(models.Email).filter(models.Email.user_id == user_id)
    total = base_q.count()
    rows = (
        base_q.order_by(models.Email.ts.desc(), models.Email.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    def _split_csv(val: str) -> list[str]:
        return [v for v in val.split(",") if v] if val else []

    items = []
    for e in rows:
        items.append(
            {
                "id": e.id,
                "external_id": e.external_id,
                "thread_id": e.thread_id,
                "subject": e.subject,
                "sender": e.sender,
                "recipients": _split_csv(e.recipients),
                "cc": _split_csv(e.cc),
                "bcc": _split_csv(e.bcc),
                "labels": _split_csv(e.labels),
                "body_snippet": (e.body_text or "")[:200],
                "ts": e.ts,
                "importance_score": e.importance_score or 0.0,
                "is_promotion": bool(e.is_promotion),
            }
        )

    return EmailListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@app.post("/ai/ask", response_model=AskResponse)
def ask_endpoint(
    payload: AskRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    chat_id = payload.chat_id or "default"
    ensure_chat_session_with_title(db, user_id, chat_id, payload.question)
    history_records = get_chat_history(db, user_id, chat_id)
    history_text = format_chat_history_text(history_records)

    answer, frags = answer_question(
        db,
        user_id=user_id,
        question=payload.question,
        current_thread_id=payload.current_thread_id,
        chat_id=chat_id,
        chat_history=history_text,
    )
    save_chat_turn(db, user_id, chat_id, payload.question, answer)
    return AskResponse(answer=answer, sources=frags)


@app.post("/outlook/connect", response_model=OutlookSyncResponse)
def outlook_connect(
    payload: OutlookConnectRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    初次接入 Outlook：使用 access_token 拉取最近 N 天邮件（默认 90 天），并保存 delta link。
    """
    ingested, delta_link, last_synced_at = initial_outlook_import(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        days_back=payload.days_back,
    )
    return OutlookSyncResponse(ingested=ingested, delta_link=delta_link, last_synced_at=last_synced_at)


@app.post("/outlook/sync", response_model=OutlookSyncResponse)
def outlook_sync(
    payload: OutlookSyncRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    登录时同步未同步的 Outlook 邮件：
    - 优先使用已有 delta_link 增量同步
    - 如无 delta_link，则回退抓取最近 fallback_days_back 天
    """
    ingested, delta_link, last_synced_at = sync_outlook_incremental(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        fallback_days_back=payload.fallback_days_back,
    )
    return OutlookSyncResponse(ingested=ingested, delta_link=delta_link, last_synced_at=last_synced_at)


@app.post("/gmail/connect", response_model=GmailSyncResponse)
def gmail_connect(
    payload: GmailConnectRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    初次接入 Gmail：使用 access_token 拉取最近 N 天邮件（默认 90 天），并保存 historyId。
    """
    ingested, history_id, last_synced_at = initial_gmail_import(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        days_back=payload.days_back,
    )
    return GmailSyncResponse(ingested=ingested, history_id=history_id, last_synced_at=last_synced_at)


@app.post("/gmail/sync", response_model=GmailSyncResponse)
def gmail_sync(
    payload: GmailSyncRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    登录时同步未同步的 Gmail 邮件：
    - 优先使用已有 historyId 增量同步
    - 如无 historyId，则回退抓取最近 fallback_days_back 天
    """
    ingested, history_id, last_synced_at = sync_gmail_incremental(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        fallback_days_back=payload.fallback_days_back,
    )
    return GmailSyncResponse(ingested=ingested, history_id=history_id, last_synced_at=last_synced_at)
