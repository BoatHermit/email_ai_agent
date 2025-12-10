from typing import List
from sqlalchemy.orm import Session

from app.schemas.email import EmailIngestItem
from app.db import models
from app.services.embeddings import embed_text
from app.services.search_index_es import index_email_document


def ingest_emails(db: Session, user_id: str, emails: List[EmailIngestItem]) -> int:
    count = 0
    for item in emails:
        # 多租户：idempotency 以 (user_id, external_id) 为键
        existing = (
            db.query(models.Email)
            .filter(models.Email.user_id == user_id, models.Email.external_id == item.external_id)
            .first()
        )
        if existing:
            continue

        rec = models.Email(
            user_id=user_id,
            external_id=item.external_id,
            thread_id=item.thread_id,
            subject=item.subject,
            sender=item.sender,
            recipients=",".join(item.recipients),
            cc=",".join(item.cc) if item.cc else None,
            bcc=",".join(item.bcc) if item.bcc else None,
            body_text=item.body_text,
            labels=",".join(item.labels) if item.labels else None,
            ts=item.ts,
            importance_score=item.importance_score,
            is_promotion=1 if item.is_promotion else 0,
        )
        db.add(rec)
        db.flush()  # 得到 rec.id

        # 计算 embedding & 写入 ES
        text_for_embedding = f"{rec.subject}\n\n{rec.body_text}"
        vec = embed_text(text_for_embedding)

        index_email_document(
            user_id=user_id,
            email_id=rec.id,
            external_id=rec.external_id,
            thread_id=rec.thread_id,
            subject=rec.subject,
            body_text=rec.body_text,
            sender=rec.sender,
            recipients=rec.recipients,
            labels=rec.labels,
            ts=rec.ts,
            importance_score=rec.importance_score,
            is_promotion=bool(rec.is_promotion),
            embedding=vec,
        )

        count += 1

    db.commit()
    return count
