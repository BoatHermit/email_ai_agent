from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GmailConnectRequest(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    days_back: int = 90


class GmailSyncRequest(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    fallback_days_back: int = 7


class GmailSyncResponse(BaseModel):
    ingested: int
    history_id: Optional[str] = None
    last_synced_at: Optional[datetime] = None
