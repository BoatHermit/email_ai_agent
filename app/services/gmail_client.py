from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import httpx
from dateutil.parser import parse as parse_dt
import re
from html import unescape

from app.config import settings
from app.schemas.email import EmailIngestItem


def _auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _parse_header(headers: List[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _parse_address_list(header_val: str) -> List[str]:
    # 简化：分号/逗号拆分；真实场景可用 email.utils.getaddresses
    if not header_val:
        return []
    parts = [p.strip() for p in header_val.replace(";", ",").split(",")]
    return [p for p in parts if p]


def _strip_html(content: str) -> str:
    """
    简单移除 HTML 标签并解码实体，压缩多余空白。
    """
    if not content:
        return ""
    # 去掉 DOCTYPE、注释
    content = re.sub(r"(?is)<!DOCTYPE.*?>", " ", content)
    content = re.sub(r"(?is)<!--.*?-->", " ", content)
    # 去掉 head/style/script 块及其内部内容
    content = re.sub(r"(?is)<style.*?>.*?</style>", " ", content)
    content = re.sub(r"(?is)<script.*?>.*?</script>", " ", content)
    content = re.sub(r"(?is)<head.*?>.*?</head>", " ", content)
    # 去掉剩余标签
    text = unescape(re.sub(r"<[^>]+>", " ", content))
    # 去掉换行/回车、零宽字符并压缩空白
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"[\u200b\u200c\u200d\u202c\u202d\u2060]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_body(payload: dict) -> str:
    """
    仅解码 text/plain 或 text/html，忽略附件/图片（有 attachmentId 或非文本 mimeType）。
    优先 text/plain，其次 text/html。
    """
    if not payload:
        return ""

    def walk_parts(part):
        mime_type = (part.get("mimeType") or "").lower()
        body = part.get("body") or {}

        # 忽略附件/图片/非文本
        if body.get("attachmentId"):
            return ""
        if not (mime_type.startswith("text/plain") or mime_type.startswith("text/html") or mime_type.startswith("multipart/")):
            return ""

        data = body.get("data")
        if data and (mime_type.startswith("text/plain") or mime_type.startswith("text/html")):
            import base64
            try:
                decoded = base64.urlsafe_b64decode(data.encode()).decode(errors="ignore")
                # 有些邮件把 HTML 放在 text/plain 里，包含样式标签，统一用 _strip_html 处理含标签的文本
                if mime_type.startswith("text/html"):
                    return _strip_html(decoded)
                if "<" in decoded and ">" in decoded:
                    return _strip_html(decoded)
                return decoded
            except Exception:
                return ""

        # multipart 继续递归
        for p in part.get("parts", []) or []:
            text = walk_parts(p)
            if text:
                return text
        return ""

    # 优先抓 text/plain
    if "parts" in payload:
        for p in payload["parts"]:
            if (p.get("mimeType") or "").lower().startswith("text/plain"):
                txt = walk_parts(p)
                if txt:
                    return txt
    # 其次 text/html 或整体递归
    txt = walk_parts(payload)
    return txt or ""


def _message_to_email_item(msg: dict) -> EmailIngestItem:
    payload = msg.get("payload") or {}
    headers = payload.get("headers") or []

    subject = _parse_header(headers, "Subject") or "(no subject)"
    sender = _parse_header(headers, "From")
    to_header = _parse_header(headers, "To")
    cc_header = _parse_header(headers, "Cc")
    bcc_header = _parse_header(headers, "Bcc")

    received_internal = msg.get("internalDate")
    ts = None
    if received_internal:
        try:
            ts = datetime.fromtimestamp(int(received_internal) / 1000, tz=timezone.utc)
        except Exception:
            ts = None
    if not ts:
        date_header = _parse_header(headers, "Date")
        ts = parse_dt(date_header) if date_header else datetime.now(timezone.utc)

    body_text = _extract_body(payload) or msg.get("snippet") or ""
    labels = msg.get("labelIds") or []

    return EmailIngestItem(
        external_id=msg.get("id"),
        thread_id=msg.get("threadId") or msg.get("id"),
        subject=subject,
        sender=sender,
        recipients=_parse_address_list(to_header),
        cc=_parse_address_list(cc_header) or None,
        bcc=_parse_address_list(bcc_header) or None,
        body_text=body_text,
        labels=labels or None,
        ts=ts,
        importance_score=0.0,
        is_promotion=("CATEGORY_PROMOTIONS" in labels),
    )


def _list_message_ids(client: httpx.Client, access_token: str, since: Optional[datetime], page_token: Optional[str]) -> dict:
    base_url = settings.GMAIL_API_BASE_URL.rstrip("/")
    url = f"{base_url}/users/me/messages"
    params = {
        "maxResults": settings.GMAIL_PAGE_SIZE,
    }
    if page_token:
        params["pageToken"] = page_token
    if since:
        # Gmail 支持 after:<unix_ts> 过滤
        after_ts = int(since.timestamp())
        params["q"] = f"after:{after_ts}"
    headers = _auth_headers(access_token)
    resp = client.get(url, headers=headers, params=params)
    resp.raise_for_status()
    return resp.json()


def _get_message(client: httpx.Client, access_token: str, message_id: str) -> dict:
    base_url = settings.GMAIL_API_BASE_URL.rstrip("/")
    url = f"{base_url}/users/me/messages/{message_id}"
    params = {"format": "full"}
    headers = _auth_headers(access_token)
    resp = client.get(url, headers=headers, params=params)
    resp.raise_for_status()
    return resp.json()


def fetch_gmail_messages(
    access_token: str,
    *,
    since: Optional[datetime] = None,
    history_id: Optional[str] = None,
) -> Tuple[List[EmailIngestItem], Optional[str], Optional[datetime]]:
    """
    - 初次/补偿同步：使用 since 过滤（默认 90 天）
    - 增量：使用 history_id（Gmail history API），返回最新 historyId
    返回 (emails, new_history_id, latest_ts)
    """
    headers = _auth_headers(access_token)
    base_url = settings.GMAIL_API_BASE_URL.rstrip("/")
    all_items: List[EmailIngestItem] = []
    latest_ts: Optional[datetime] = None
    new_history_id: Optional[str] = None

    with httpx.Client(timeout=30.0) as client:
        if history_id:
            # 增量：用 history API
            next_page: Optional[str] = None
            while True:
                url = f"{base_url}/users/me/history"
                params = {
                    "startHistoryId": history_id,
                    "historyTypes": "messageAdded",
                    "maxResults": settings.GMAIL_PAGE_SIZE,
                }
                if next_page:
                    params["pageToken"] = next_page
                resp = client.get(url, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                new_history_id = data.get("historyId", new_history_id)
                for h in data.get("history", []):
                    for m in h.get("messagesAdded", []):
                        mid = (m.get("message") or {}).get("id")
                        if not mid:
                            continue
                        msg = _get_message(client, access_token, mid)
                        item = _message_to_email_item(msg)
                        all_items.append(item)
                        latest_ts = max(latest_ts, item.ts) if latest_ts else item.ts
                        new_history_id = msg.get("historyId", new_history_id)
                next_page = data.get("nextPageToken")
                if not next_page:
                    break
        else:
            # 全量/首次：列 message ids + 拉详情
            next_page: Optional[str] = None
            while True:
                data = _list_message_ids(client, access_token, since, next_page)
                mids = [m["id"] for m in data.get("messages", [])]
                next_page = data.get("nextPageToken")
                for mid in mids:
                    msg = _get_message(client, access_token, mid)
                    item = _message_to_email_item(msg)
                    all_items.append(item)
                    latest_ts = max(latest_ts, item.ts) if latest_ts else item.ts
                    new_history_id = msg.get("historyId", new_history_id)
                if not next_page:
                    break

    return all_items, new_history_id, latest_ts


def default_since_days(days: int = 90) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)
