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
from app.services.text_normalization import to_simplified


@dataclass
class QueryFeatures:
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    people: List[str] = None
    keywords: List[str] = None
    recency_bias: bool = False
    confidence: float = 0.5


@dataclass
class EmailFragment:
    email: models.Email
    snippet: str
    score: float


def _llm_query_rewrite(question: str, chat_history: Optional[str] = None, current_thread: Optional[str] = None) -> str:
    system_prompt = f"""
        You are a Query Resolver for an email search engine.
        Your goal is to make the user's query standalone by resolving pronouns and relative time references based on the context, WITHOUT changing the original intent or key terms.
        
        Instructions:
        1. REPLACE pronouns (he, she, it, they, that) with the specific names or entities they refer to from the conversation history.
        2. REPLACE relative dates (yesterday, last Friday) with specific absolute dates (e.g., 2023-10-27) if known; otherwise keep them as is.
        3. DO NOT rephrase the question type. (e.g., Do not change "How are you?" to "Search for greeting emails").
        4. DO NOT add keywords that were not implied.
        5. KEEP the original sentence structure as much as possible.
        
        Return ONLY the rewritten query text. No explanations.
        
        Example 1:
        Context: User is asking about John Smith.
        Query: "What did he send me yesterday?"
        Rewritten: "What did John Smith send me yesterday?"
        
        Example 2:
        Context: User is looking for the budget report.
        Query: "Find the latest version of it."
        Rewritten: "Find the latest version of the budget report."
        
        Example 3: (Negative Constraint)
        Context: None
        Query: "When is the team meeting?"
        Rewritten: "When is the team meeting?" (Do NOT change to "Search for team meeting schedules")
    """
    context = []
    if chat_history:
        context.append(f"Chat history:\n{chat_history}")
    if current_thread:
        context.append(f"Current thread:\n{current_thread}")
    user_prompt = "\n\n".join(context + [f"User question: {question}"])
    msg = chat_completion(system_prompt, user_prompt)
    return msg.get("content", question)


def _llm_feature_extract(query: str) -> QueryFeatures:
    current_time = datetime.now().isoformat()
    system_prompt = f"""You extract structured search features from a user query about email.

        Return ONLY a raw JSON object string.
        DO NOT use Markdown formatting (no ```json or ``` blocks).
        DO NOT include any explanation or conversational text.
        
        The JSON object must have keys: sent_date_range, people, keywords, recency_bias, confidence.
        
        - sent_date_range is {{"start": "ISO8601", "end": "ISO8601"}} or null objects.
          * IMPORTANT: This represents when the email was SENT/RECEIVED, not when the event happens.
          * If the user queries a future event (e.g., "When is my next meeting?"), keep sent_date_range null (search all history) and set recency_bias to true.
          * Only set dates if the user explicitly restricts the search window (e.g., "emails from last week").
        
        - people, keywords are string arrays.
          * Include synonyms for keywords (e.g., if "meeting", also add "sync", "call").
        - recency_bias is boolean.
        - confidence is float 0-1.
        
        Current time: {current_time}"""
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
        keywords=data.get("keywords") or [],
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
        chat_history: Optional[str] = None,
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
    reformulated = _llm_query_rewrite(
        question,
        chat_history=chat_history,
        current_thread=current_thread_text,
    )
    # reformulated = question
    # 2. Feature extraction
    features = _llm_feature_extract(reformulated)

    # 3. Embed query for knn（keywords 仅用于 filter，不混入向量/文本查询）
    query_vec = embed_text(reformulated)

    # 4. 调用 ES 搜索（keywords 放在 filter 阶段）
    hits = search_email_documents(
        user_id=user_id,
        query_text=reformulated,
        query_embedding=query_vec,
        date_start=features.date_start,
        date_end=features.date_end,
        keywords=features.keywords,
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

        # de-prioritize promotions
        if e.is_promotion:
            score -= 0.2

        snippet_source = src.get("body_text") or e.body_text or e.subject or ""
        snippet = _chunk_snippet(snippet_source)
        fragments.append(EmailFragment(email=e, snippet=snippet, score=score))

    fragments.sort(key=lambda f: f.score, reverse=True)
    return fragments[:max_results]
