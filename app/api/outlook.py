from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db
from app.schemas.outlook import OutlookConnectRequest, OutlookSyncRequest, OutlookSyncResponse
from app.services.outlook_ingest import initial_outlook_import, sync_outlook_incremental

router = APIRouter(prefix="/outlook", tags=["outlook"])


@router.post("/connect", response_model=OutlookSyncResponse)
def outlook_connect(
    payload: OutlookConnectRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    åˆæ¬¡æŽ¥å…¥ Outlookï¼šä½¿ç”¨ access_token æ‹‰å–æœ€è¿‘ N å¤©é‚®ä»¶ï¼ˆé»˜è®¤ 90 å¤©ï¼‰ï¼Œå¹¶ä¿å­˜ delta linkã€‚
    """
    ingested, delta_link, last_synced_at = initial_outlook_import(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        days_back=payload.days_back,
    )
    return OutlookSyncResponse(ingested=ingested, delta_link=delta_link, last_synced_at=last_synced_at)


@router.post("/sync", response_model=OutlookSyncResponse)
def outlook_sync(
    payload: OutlookSyncRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    ç™»å½•æ—¶åŒæ­¥æœªåŒæ­¥çš„ Outlook é‚®ä»¶ï¼Ÿ
    - ä¼˜å…ˆä½¿ç”¨å·²æœ‰ delta_link å¢žé‡åŒæ­¥
    - å¦‚æ—  delta_linkï¼Œåˆ™å›žé€€æŠ“å–æœ€è¿‘ fallback_days_back å¤©
    """
    ingested, delta_link, last_synced_at = sync_outlook_incremental(
        db,
        user_id=user_id,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        fallback_days_back=payload.fallback_days_back,
    )
    return OutlookSyncResponse(ingested=ingested, delta_link=delta_link, last_synced_at=last_synced_at)
