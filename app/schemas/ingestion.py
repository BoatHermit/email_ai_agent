from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from .email import EmailIngestItem


class FullIngestionStartRequest(BaseModel):
    user_id: str
    provider: str = "gmail"
    # 如果你从 provider 那边已经拿到一个初始游标，比如 Gmail historyId
    initial_checkpoint: Optional[str] = None


class FullIngestionStartResponse(BaseModel):
    session_id: int
    user_id: str
    provider: str
    status: str
    checkpoint_token: Optional[str] = None
    processed_count: int = 0
    created_at: datetime
    updated_at: datetime


class FullIngestionBatchRequest(BaseModel):
    session_id: int
    # 本批次导入的邮件
    emails: List[EmailIngestItem]
    # 外部邮箱服务当前批次之后的游标（例如 nextPageToken）
    next_checkpoint: Optional[str] = None
    # 如果你想显式标记“这是最后一批”，可以传 true
    mark_completed: bool = False


class FullIngestionBatchResponse(BaseModel):
    session_id: int
    ingested_in_batch: int
    total_processed_count: int
    status: str
    checkpoint_token: Optional[str] = None
    updated_at: datetime


class FullIngestionStatusResponse(BaseModel):
    session_id: int
    user_id: str
    provider: str
    status: str
    checkpoint_token: Optional[str]
    processed_count: int
    last_error: Optional[str]
    created_at: datetime
    updated_at: datetime
