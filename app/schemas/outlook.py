from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OutlookConnectRequest(BaseModel):
    email: str
    access_token: str
    refresh_token: Optional[str] = None
    days_back: int = 90


class OutlookSyncRequest(BaseModel):
    email: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    fallback_days_back: int = 7


class OutlookSyncResponse(BaseModel):
    ingested: int
    delta_link: Optional[str] = None
    last_synced_at: Optional[datetime] = None
