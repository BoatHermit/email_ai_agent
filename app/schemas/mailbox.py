from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MailboxState(BaseModel):
    provider: str  # 邮箱账号
    provider_type: str = "gmail"
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    has_refresh_token: bool = False
    has_access_token: bool = False
    delta_link: Optional[str] = None


class MailboxStateListResponse(BaseModel):
    items: List[MailboxState]
