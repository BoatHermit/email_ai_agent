"""
Utility helpers to normalize text for search/index consistency.
- We convert Traditional Chinese to Simplified Chinese so embeddings and
  keyword search operate on the same script.
- If OpenCC is unavailable, we fall back to returning the original text.
"""
from functools import lru_cache
from typing import Optional


@lru_cache(maxsize=1)
def _get_converter():
    try:
        from opencc import OpenCC  # type: ignore

        return OpenCC("t2s")
    except Exception:
        return None


def to_simplified(text: Optional[str]) -> str:
    if not text:
        return ""
    converter = _get_converter()
    if not converter:
        return text
    try:
        return converter.convert(text)
    except Exception:
        return text
