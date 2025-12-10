from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import httpx
from dateutil.parser import parse as parse_dt

from app.config import settings
from app.schemas.email import EmailIngestItem


def _auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _parse_recipients(entries: Optional[List[dict]]) -> List[str]:
    if not entries:
        return []
    results = []
    for entry in entries:
        addr = (entry or {}).get("emailAddress") or {}
        if addr.get("address"):
            results.append(addr["address"])
    return results


def _message_to_email_item(msg: dict) -> EmailIngestItem:
    # 优先使用 internetMessageId 作为外部唯一标识，退化到 graph id
    external_id = msg.get("internetMessageId") or msg.get("id")
    body = (msg.get("body") or {}).get("content") or msg.get("bodyPreview") or ""
    categories = msg.get("categories") or []
    received_raw = msg.get("receivedDateTime") or msg.get("sentDateTime")
    ts = parse_dt(received_raw) if received_raw else datetime.now(timezone.utc)

    return EmailIngestItem(
        external_id=external_id,
        thread_id=msg.get("conversationId") or msg.get("conversationIndex") or external_id,
        subject=msg.get("subject") or "(no subject)",
        sender=((msg.get("from") or {}).get("emailAddress") or {}).get("address", ""),
        recipients=_parse_recipients(msg.get("toRecipients")),
        cc=_parse_recipients(msg.get("ccRecipients")) or None,
        bcc=_parse_recipients(msg.get("bccRecipients")) or None,
        body_text=body,
        labels=categories or None,
        ts=ts,
        importance_score=1.0 if (msg.get("importance") == "high") else 0.0,
        is_promotion=False,
    )


def fetch_outlook_messages(
    access_token: str,
    *,
    since: Optional[datetime] = None,
    delta_link: Optional[str] = None,
    page_size: int = 50,
) -> Tuple[List[EmailIngestItem], Optional[str], Optional[datetime]]:
    """
    拉取 Outlook 邮件：
    - 首次同步：使用 since（例如 90 天前）过滤并返回最新 delta_link
    - 增量同步：传入 delta_link 继续增量
    返回 (emails, new_delta_link, latest_message_ts)
    """
    base_url = settings.OUTLOOK_GRAPH_BASE_URL.rstrip("/")
    url = delta_link or f"{base_url}/me/messages/delta"
    params = {
        "$top": page_size,
        "$select": (
            "id,subject,from,toRecipients,ccRecipients,bccRecipients,"
            "bodyPreview,body,receivedDateTime,sentDateTime,internetMessageId,"
            "conversationId,conversationIndex,categories,importance"
        ),
        "$orderby": "receivedDateTime desc",
    }
    if since and not delta_link:
        # Delta 支持 filter，便于限制初次同步范围
        params["$filter"] = f"receivedDateTime ge {since.isoformat()}"

    headers = _auth_headers(access_token)
    all_items: List[EmailIngestItem] = []
    latest_ts: Optional[datetime] = None
    new_delta_link: Optional[str] = None

    with httpx.Client(timeout=30.0) as client:
        next_url: Optional[str] = url
        next_params = params
        while next_url:
            resp = client.get(next_url, headers=headers, params=next_params)
            resp.raise_for_status()
            data = resp.json()
            for msg in data.get("value", []):
                item = _message_to_email_item(msg)
                all_items.append(item)
                latest_ts = max(latest_ts, item.ts) if latest_ts else item.ts

            # delta API 可能返回 nextLink 或 deltaLink
            next_url = data.get("@odata.nextLink")
            next_params = None  # nextLink 已经包含查询参数
            delta_candidate = data.get("@odata.deltaLink")
            if delta_candidate:
                new_delta_link = delta_candidate

    return all_items, new_delta_link, latest_ts


def default_since_days(days: int = 90) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)
