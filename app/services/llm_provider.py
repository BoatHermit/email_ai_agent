from typing import List, Dict, Any, Optional
import os

import httpx
from openai import OpenAI

from app.config import settings


# 创建 httpx 客户端（不直接传 proxies 参数，避免某些旧版本 httpx 不兼容）
_http_client = httpx.Client(
    timeout=30.0,  # 可以按需调大或调小
    verify=False,  # 有些代理会做 TLS 拦截，关闭 verify 可避免证书错误（生产环境按需调整）
)

_client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL,
    # http_client=_http_client,
)


def chat_completion(
        system_prompt: str,
        user_prompt: str,
        tools: Optional[List[Dict[str, Any]]] = None,
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
        "temperature": 0.1,
    }

    if tools:
        params["tools"] = tools
        params["tool_choice"] = "auto"

    try:
        resp = _client.chat.completions.create(**params)
    except Exception as e:
        # 这里可以按需打印日志 / 上报监控
        print("⚠️ OpenAI chat_completion error:", repr(e))
        raise

    # 返回统一结构：message dict
    return resp.choices[0].message.model_dump()
