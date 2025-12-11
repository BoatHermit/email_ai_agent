from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class EmailIngestItem(BaseModel):
    external_id: str
    thread_id: str
    subject: str
    sender: str
    recipients: List[str]
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    body_text: str
    labels: Optional[List[str]] = None
    ts: datetime
    importance_score: float = 0.0
    is_promotion: bool = False


class EmailIngestRequest(BaseModel):
    emails: List[EmailIngestItem]


class EmailIngestResponse(BaseModel):
    ingested: int


class EmailListItem(BaseModel):
    id: int
    external_id: str
    thread_id: str
    subject: str
    sender: str
    recipients: List[str]
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    labels: Optional[List[str]] = None
    body_snippet: str
    ts: datetime
    importance_score: float = 0.0
    is_promotion: bool = False

    class Config:
        orm_mode = True


class EmailListResponse(BaseModel):
    items: List[EmailListItem]
    total: int
    page: int
    page_size: int
