from typing import List, Dict, Any, Optional
import os

import httpx
from openai import OpenAI

from app.config import settings


# 创建 httpx 客户端
client_kwargs = {
    "timeout": 30.0,
    "verify": False,
    "proxy": "http://127.0.0.1:7890",
}
if settings.OPENAI_PROXY:
    client_kwargs["proxy"] = settings.OPENAI_PROXY

_http_client = httpx.Client(**client_kwargs)

openai_kwargs = {
    "api_key": settings.OPENAI_API_KEY,
    "http_client": _http_client,
}

if settings.OPENAI_BASE_URL:
    openai_kwargs["base_url"] = settings.OPENAI_BASE_URL

_client = OpenAI(**openai_kwargs)


def chat_completion(
        system_prompt: str,
        user_prompt: str,
        tools: Optional[List[Dict[str, Any]]] = None,
        **kwargs,
) -> Dict[str, Any]:
    """
    封装一次 Chat Completion 调用。
    - 使用 settings.OPENAI_MODEL_GPT
    - 支持 optional tools（用于 tool selection）
    - 发生异常时抛出，让上层自己决定怎么兜底
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    params = {
        "model": settings.OPENAI_MODEL_GPT,
        "messages": messages,
    }

    if tools:
        params["tools"] = tools
        params["tool_choice"] = "auto"
    
    # Allow overriding/adding params (e.g. response_format)
    params.update(kwargs)

    try:
        resp = _client.chat.completions.create(**params)
    except Exception as e:
        # 这里可以按需打印日志 / 上报监控
        print(f"⚠️ OpenAI chat_completion error: {type(e).__name__}: {e}")
        if hasattr(e, '__cause__') and e.__cause__:
            print(f"   Caused by: {type(e.__cause__).__name__}: {e.__cause__}")
        raise

    # 返回统一结构：message dict
    return resp.choices[0].message.model_dump()
