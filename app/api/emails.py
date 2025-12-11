from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db
from app.db import models
from app.schemas import EmailIngestRequest, EmailIngestResponse, EmailListResponse
from app.services.email_ingest import ingest_emails

router = APIRouter(prefix="/emails", tags=["emails"])


def _split_csv(val: str) -> list[str]:
    return [v for v in (val or "").split(",") if v]


@router.post("/ingest", response_model=EmailIngestResponse)
def ingest_endpoint(
    payload: EmailIngestRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    count = ingest_emails(db, user_id, payload.emails)
    return EmailIngestResponse(ingested=count)


@router.get("", response_model=EmailListResponse)
def list_emails(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    """
    åˆ†é¡µæŸ¥è¯¢å½“å‰ç”¨æˆ·çš„é‚®ä»¶ï¼ŒæŒ‰æ—¶é—´é€†åºæŽ’åˆ—ã€‚
    """
    base_q = db.query(models.Email).filter(models.Email.user_id == user_id)
    total = base_q.count()
    rows = (
        base_q.order_by(models.Email.ts.desc(), models.Email.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

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
