from typing import List
from sqlalchemy.orm import Session

from app.schemas.email import EmailIngestItem
from app.db import models
from app.services.embeddings import embed_text
from app.services.search_index_es import index_email_document
from app.services.text_normalization import to_simplified


def _chunk_text(text: str, max_chars: int = 5000) -> list[str]:
    """
    简单按字符切片，避免超出 embedding 上限。可根据需要改为按 token 切分。
    """
    if not text:
        return [""]
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        chunks.append(text[start:end])
        start = end
    return chunks


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

        # 计算 embedding & 按 chunk 写入 ES
        subject_s = to_simplified(rec.subject or "")
        body_text_s = to_simplified(rec.body_text or "")
        text_for_embedding = f"{subject_s}\n\n{body_text_s}"
        chunks = _chunk_text(text_for_embedding)
        for idx, chunk in enumerate(chunks):
            vec = embed_text(chunk)
            index_email_document(
                user_id=user_id,
                email_id=rec.id,
                external_id=rec.external_id,
                thread_id=rec.thread_id,
                chunk_id=idx,
                subject=subject_s,
                body_text=chunk,
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
