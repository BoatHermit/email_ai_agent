from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db import models
from app.schemas import (
    EmailIngestRequest,
    EmailIngestResponse,
    AskRequest,
    AskResponse,
    SourceFragment,
    FullIngestionStartRequest,
    FullIngestionStartResponse,
    FullIngestionBatchRequest,
    FullIngestionBatchResponse,
    FullIngestionStatusResponse,
)
from app.services.email_ingest import ingest_emails
from app.services.answer_engine import answer_question
from app.services.search_index_es import ensure_email_index
from app.services.full_ingestion import start_full_ingestion, ingest_full_batch

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
def full_ingestion_start(payload: FullIngestionStartRequest, db: Session = Depends(get_db)):
    """
    创建一个新的全量导入会话。
    前端 / 同步服务拿到 session_id 以后，就可以按批次调用 /ingestion/full/batch。
    """
    session = start_full_ingestion(db, payload)
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
def full_ingestion_batch(payload: FullIngestionBatchRequest, db: Session = Depends(get_db)):
    """
    为某个全量导入会话导入一批邮件。
    - emails: 本批次的邮件列表
    - next_checkpoint: 外部邮箱服务的“下一页”游标
    - mark_completed: 如果这是最后一批，可以置 true
    """
    session_before = (
        db.query(models.IngestionSession)
        .filter(models.IngestionSession.id == payload.session_id)
        .first()
    )
    if not session_before:
        # 给出更友好的错误；也可以抛异常被全局捕获
        raise RuntimeError(f"IngestionSession {payload.session_id} not found")

    processed_before = session_before.processed_count

    session_after = ingest_full_batch(db, payload)
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
def full_ingestion_status(session_id: int, db: Session = Depends(get_db)):
    """
    查询某个全量导入会话的状态（断点续传用）。
    前端可以拿 checkpoint_token 去继续从 Gmail / IMAP 拉下一批邮件。
    """
    session = (
        db.query(models.IngestionSession)
        .filter(models.IngestionSession.id == session_id)
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
def ingest_endpoint(payload: EmailIngestRequest, db: Session = Depends(get_db)):
    count = ingest_emails(db, payload.user_id, payload.emails)
    return EmailIngestResponse(ingested=count)


@app.post("/ai/ask", response_model=AskResponse)
def ask_endpoint(payload: AskRequest, db: Session = Depends(get_db)):
    answer, frags = answer_question(
        db,
        user_id=payload.user_id,
        question=payload.question,
        current_thread_id=payload.current_thread_id,
    )
    sources = [
        SourceFragment(
            email_id=f.email.id,
            snippet=f.snippet,
            score=f.score,
        )
        for f in frags
    ]
    return AskResponse(answer=answer, sources=sources)
