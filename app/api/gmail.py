from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db
from app.schemas.gmail import GmailConnectRequest, GmailSyncRequest, GmailSyncResponse
from app.services.gmail_ingest import initial_gmail_import, sync_gmail_incremental

router = APIRouter(prefix="/gmail", tags=["gmail"])


@router.post("/connect", response_model=GmailSyncResponse)
def gmail_connect(
    payload: GmailConnectRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    åˆæ¬¡æŽ¥å…¥ Gmailï¼šä½¿ç”¨ access_token æ‹‰å–æœ€è¿‘ N å¤©é‚®ä»¶ï¼ˆé»˜è®¤ 90 å¤©ï¼‰ï¼Œå¹¶ä¿å­˜ historyIdã€‚
    """
    ingested, history_id, last_synced_at = initial_gmail_import(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        days_back=payload.days_back,
    )
    return GmailSyncResponse(ingested=ingested, history_id=history_id, last_synced_at=last_synced_at)


@router.post("/sync", response_model=GmailSyncResponse)
def gmail_sync(
    payload: GmailSyncRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    ç™»å½•æ—¶åŒæ­¥æœªåŒæ­¥çš„ Gmail é‚®ä»¶ï¼Ÿ
    - ä¼˜å…ˆä½¿ç”¨å·²æœ‰ historyId å¢žé‡åŒæ­¥
    - å¦‚æ—  historyIdï¼Œåˆ™å›žé€€æŠ“å–æœ€è¿‘ fallback_days_back å¤©
    """
    ingested, history_id, last_synced_at = sync_gmail_incremental(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        fallback_days_back=payload.fallback_days_back,
    )
    return GmailSyncResponse(ingested=ingested, history_id=history_id, last_synced_at=last_synced_at)
