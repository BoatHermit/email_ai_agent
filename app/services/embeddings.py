from typing import List
import os

import httpx
import numpy as np
from openai import OpenAI

from app.config import settings


_http_client = httpx.Client(
    timeout=30.0,
    verify=False,
)

_client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL,
    # http_client=_http_client,
)

# ⚠️ 非常重要：这里的维度要和你选的 embedding 模型一致
# text-embedding-3-large = 3072 维；如果你换成 text-embedding-3-small（1536 维），一定要改这里和 ES mapping。
EMBED_DIM = 3072


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    批量计算 embedding。
    - 正常情况下返回真实 embedding
    - 网络 / OpenAI 挂掉时，返回全 0 占位向量，避免整个服务 500
    """
    try:
        resp = _client.embeddings.create(
            model=settings.OPENAI_MODEL_EMBEDDING,
            input=texts,
            encoding_format="float"
        )
        return [d.embedding for d in resp.data]
    except Exception as e:
        print("⚠️ OpenAI embeddings error:", repr(e))
        print("base-url:", settings.OPENAI_BASE_URL)
        print("Model:", settings.OPENAI_MODEL_EMBEDDING)
        # 兜底：返回全 0 向量避免调用方挂掉
        return [[0.0] * EMBED_DIM for _ in texts]


def embed_text(text: str) -> List[float]:
    return embed_texts([text])[0]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    余弦相似度计算，用于旧版纯 DB 向量搜索（如果你仍在使用）。
    """
    if a.shape != b.shape:
        raise ValueError("Shape mismatch")
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)
