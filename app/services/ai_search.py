from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
import json

from sqlalchemy.orm import Session
from dateutil.parser import parse as parse_dt

from app.db import models
from app.services.llm_provider import chat_completion
from app.services.embeddings import embed_text
from app.services.search_index_es import search_email_documents


@dataclass
class QueryFeatures:
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    people: List[str] = None
    labels: List[str] = None
    recency_bias: bool = False
    confidence: float = 0.5


@dataclass
class EmailFragment:
    email: models.Email
    snippet: str
    score: float


def _llm_query_rewrite(question: str, chat_history: str | None = None, current_thread: str | None = None) -> str:
    system_prompt = (
        "You rewrite user queries about email into standalone queries that include needed context. "
        "Return only the rewritten query text."
    )
    context = []
    if chat_history:
        context.append(f"Chat history:\n{chat_history}")
    if current_thread:
        context.append(f"Current thread:\n{current_thread}")
    user_prompt = "\n\n".join(context + [f"User question: {question}"])
    msg = chat_completion(system_prompt, user_prompt)
    return msg.get("content", question)


def _llm_feature_extract(query: str) -> QueryFeatures:
    system_prompt = (
        "You extract structured search features from a user query about email. "
        "Return ONLY a JSON object with keys: date_range, people, labels, recency_bias, confidence. "
        "date_range is {\"start\": ISO8601 or null, \"end\": ISO8601 or null}. "
        "people, labels are string arrays. recency_bias is boolean, confidence is float 0-1."
    )
    msg = chat_completion(system_prompt, query)
    raw = msg.get("content", "{}")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return QueryFeatures()

    date_start = date_end = None
    dr = data.get("date_range") or {}
    if dr.get("start"):
        date_start = parse_dt(dr["start"])
    if dr.get("end"):
        date_end = parse_dt(dr["end"])

    return QueryFeatures(
        date_start=date_start,
        date_end=date_end,
        people=data.get("people") or [],
        labels=data.get("labels") or [],
        recency_bias=bool(data.get("recency_bias", False)),
        confidence=float(data.get("confidence", 0.5)),
    )


def _chunk_snippet(text: str, max_len: int = 400) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def ai_search(
        db: Session,
        user_id: str,
        question: str,
        current_thread_text: Optional[str] = None,
        max_results: int = 20,
) -> List[EmailFragment]:
    """
    使用 LLM + Elasticsearch 实现 Shortwave 风格 AI Search：
    1) Query rewrite
    2) Feature extract
    3) ES hybrid search (filter + match + knn)
    4) 简单 heuristic rerank
    """
    # 1. Query rewrite
    reformulated = _llm_query_rewrite(question, chat_history=None, current_thread=current_thread_text)

    # 2. Feature extraction
    features = _llm_feature_extract(reformulated)

    # 3. Embed query for knn
    query_vec = embed_text(reformulated)

    # 4. 调用 ES 搜索（多租户 filter 在 ES 里强制过滤）
    hits = search_email_documents(
        user_id=user_id,
        query_text=reformulated,
        query_embedding=query_vec,
        date_start=features.date_start,
        date_end=features.date_end,
        labels=features.labels,
        size=max_results * 3,  # 取多一点供 rerank
    )
    if not hits:
        return []

    # 5. Heuristic rerank + 重新装配 ORM 对象（再次按 user_id 过滤，多一层保险）
    now = datetime.utcnow()
    fragments: List[EmailFragment] = []

    # 预取所有涉及的 email_id
    email_ids = [hit["_source"]["email_id"] for hit in hits]
    emails = (
        db.query(models.Email)
        .filter(models.Email.user_id == user_id, models.Email.id.in_(email_ids))
        .all()
    )
    id2email = {e.id: e for e in emails}

    for hit in hits:
        src = hit["_source"]
        es_score = float(hit.get("_score") or 0.0)
        email_id = src["email_id"]
        e = id2email.get(email_id)
        if not e:
            continue

        score = es_score

        # recency bias
        if features.recency_bias:
            days_ago = max((now - e.ts).days, 0)
            recency_boost = max(0.0, 1.0 - min(days_ago / 365.0, 1.0))
            score += 0.3 * recency_boost

        # importance_score
        score += 0.2 * (e.importance_score or 0.0)

        # labels overlap（ES 已经 filter/boost 过，这里再给一点加权也可以）
        if features.labels and e.labels:
            labels_set = set((e.labels or "").split(","))
            overlap = len(labels_set.intersection(features.labels))
            if overlap > 0:
                score += 0.05 * overlap

        # de-prioritize promotions
        if e.is_promotion:
            score -= 0.2

        snippet_source = e.body_text or e.subject or ""
        snippet = _chunk_snippet(snippet_source)
        fragments.append(EmailFragment(email=e, snippet=snippet, score=score))

    fragments.sort(key=lambda f: f.score, reverse=True)
    return fragments[:max_results]
