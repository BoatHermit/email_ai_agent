from __future__ import annotations

from typing import List, Dict, Any, Optional
from datetime import datetime

from elasticsearch import Elasticsearch
from elasticsearch.exceptions import NotFoundError

from app.config import settings

es = Elasticsearch(settings.ELASTICSEARCH_URL)


def ensure_email_index():
    """
    创建/更新 emails 索引，包含 dense_vector 和一些结构化字段。
    """
    index_name = settings.ELASTICSEARCH_INDEX_EMAILS

    # 简化：如果不存在就创建，存在则不动 mapping
    if es.indices.exists(index=index_name):
        return

    body = {
        "mappings": {
            "properties": {
                "user_id": {"type": "keyword"},
                "email_id": {"type": "integer"},
                "external_id": {"type": "keyword"},
                "thread_id": {"type": "keyword"},
                "subject": {"type": "text"},
                "body_text": {"type": "text"},
                "sender": {"type": "keyword"},
                "recipients": {"type": "keyword"},
                "labels": {"type": "keyword"},
                "ts": {"type": "date"},
                "importance_score": {"type": "float"},
                "is_promotion": {"type": "boolean"},
                # 向量字段
                "embedding": {
                    "type": "dense_vector",
                    "dims": 3072,  # 对应 text-embedding-3-large 维度（如有变化需调整）
                    "index": True,
                    "similarity": "cosine",
                },
            }
        },
    }
    es.indices.create(index=index_name, body=body)


def index_email_document(
        user_id: str,
        email_id: int,
        external_id: str,
        thread_id: str,
        subject: str,
        body_text: str,
        sender: str,
        recipients: str,
        labels: str | None,
        ts: datetime,
        importance_score: float,
        is_promotion: bool,
        embedding: List[float],
) -> None:
    """
    将一封邮件写入 ES 索引。
    """
    doc = {
        "user_id": user_id,
        "email_id": email_id,
        "external_id": external_id,
        "thread_id": thread_id,
        "subject": subject,
        "body_text": body_text,
        "sender": sender,
        "recipients": recipients,
        "labels": (labels or "").split(",") if labels else [],
        "ts": ts,
        "importance_score": importance_score,
        "is_promotion": bool(is_promotion),
        "embedding": embedding,
    }
    index_name = settings.ELASTICSEARCH_INDEX_EMAILS
    es.index(index=index_name, id=f"{user_id}:{email_id}", document=doc)


def search_email_documents(
        user_id: str,
        query_text: str,
        query_embedding: List[float],
        *,
        date_start: Optional[datetime] = None,
        date_end: Optional[datetime] = None,
        labels: Optional[List[str]] = None,
        size: int = 50,
) -> List[Dict[str, Any]]:
    """
    在 ES 中做 hybrid 搜索：filter(user_id, date, labels) + match + knn。
    返回 hits 列表，每个 hit 包含 _source, _score 等。
    """
    index_name = settings.ELASTICSEARCH_INDEX_EMAILS

    filters: List[Dict[str, Any]] = [
        {"term": {"user_id": user_id}},
    ]
    if date_start:
        filters.append({"range": {"ts": {"gte": date_start.isoformat()}}})
    if date_end:
        filters.append({"range": {"ts": {"lte": date_end.isoformat()}}})
    if labels:
        filters.append({"terms": {"labels": labels}})

    body: Dict[str, Any] = {
        "size": size,
        "query": {
            "bool": {
                "filter": filters,
                "must": [
                    {
                        "multi_match": {
                            "query": query_text,
                            "fields": ["subject^3", "body_text"],
                        }
                    }
                ],
            }
        },
        "knn": {
            "field": "embedding",
            "query_vector": query_embedding,
            "k": size,
            "num_candidates": max(size * 2, 100),
            "filter": filters,
        },
    }

    try:
        resp = es.search(index=index_name, body=body)
    except NotFoundError:
        return []

    return resp.get("hits", {}).get("hits", [])
