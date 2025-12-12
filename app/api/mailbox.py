from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db
from app.db import models
from app.schemas.mailbox import MailboxState, MailboxStateListResponse

router = APIRouter(prefix="/mailboxes", tags=["mailboxes"])


def _infer_provider_type(state: models.MailboxSyncState) -> str:
    link = state.delta_link or ""
    if link.startswith("https://graph.microsoft.com"):
        return "outlook"
    return "gmail"


@router.get("", response_model=MailboxStateListResponse)
def list_mailboxes(
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    states = (
        db.query(models.MailboxSyncState)
        .filter(models.MailboxSyncState.user_id == user_id)
        .order_by(models.MailboxSyncState.created_at.desc())
        .all()
    )
    items = [
        MailboxState(
            provider=state.provider,
            provider_type=_infer_provider_type(state),
            last_synced_at=state.last_synced_at,
            created_at=state.created_at,
            updated_at=state.updated_at,
            has_refresh_token=bool(state.refresh_token),
            has_access_token=bool(state.access_token),
            delta_link=state.delta_link,
        )
        for state in states
    ]
    return MailboxStateListResponse(items=items)
