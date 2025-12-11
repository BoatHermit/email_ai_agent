from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db, get_ingestion_session
from app.db import models
from app.schemas import (
    FullIngestionBatchRequest,
    FullIngestionBatchResponse,
    FullIngestionStartRequest,
    FullIngestionStartResponse,
    FullIngestionStatusResponse,
)
from app.services.full_ingestion import ingest_full_batch, start_full_ingestion

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


def _to_full_ingestion_start_response(session: models.IngestionSession) -> FullIngestionStartResponse:
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


def _to_full_ingestion_status_response(session: models.IngestionSession) -> FullIngestionStatusResponse:
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


@router.post("/full/start", response_model=FullIngestionStartResponse)
def full_ingestion_start(
    payload: FullIngestionStartRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    åˆ›å»ºä¸€ä¸ªæ–°çš„å…¨é‡å¯¼å…¥ä¼šè¯ã€‚
    å‰ç«¯ / åŒæ­¥æœåŠ¡æ‹¿åˆ° session_id ä»¥åŽï¼Œå°±å¯ä»¥æŒ‰æ‰¹æ¬¡è°ƒç¨ /ingestion/full/batchã€‚
    """
    session = start_full_ingestion(db, payload, user_id=user_id)
    return _to_full_ingestion_start_response(session)


@router.post("/full/batch", response_model=FullIngestionBatchResponse)
def full_ingestion_batch(
    payload: FullIngestionBatchRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    ä¸ºæŸä¸ªå…¨é‡å¯¼å…¥ä¼šè¯å¯¼å…¥ä¸€æ‰¹é‚®ä»¶ã€‚
    - emails: æœ¬æ‰¹æ¬¡çš„é‚®ä»¶åˆ—è¡¨
    - next_checkpoint: å¤–éƒ¨é‚®ç®±æœåŠ¡çš„â€œä¸‹ä¸€é¡µâ€æ¸¸æ ‡
    - mark_completed: å¦‚æžœè¿™æ˜¯æœ€åŽä¸€æ‰¹ï¼Œå¯ä»¥ç½® true
    """
    session_before = get_ingestion_session(db, payload.session_id, user_id)
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


@router.get("/full/{session_id}", response_model=FullIngestionStatusResponse)
def full_ingestion_status(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    æŸ¥è¯¢æŸä¸ªå…¨é‡å¯¼å…¥ä¼šè¯çš„çŠ¶æ€ï¼ˆæ–­ç‚¹ç»­ä¼ ç”¨ï¼‰ã€‚
    å‰ç«¯å¯ä»¥æ‹¿ checkpoint_token åŽ»ç»§ç»­ä»Ž Gmail / IMAP æ‹‰ä¸‹ä¸€æ‰¹é‚®ä»¶ã€‚
    """
    session = get_ingestion_session(db, session_id, user_id)
    return _to_full_ingestion_status_response(session)
