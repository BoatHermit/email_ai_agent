from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class AskRequest(BaseModel):
    question: str
    current_thread_id: Optional[str] = None  # if any
    chat_id: str = "default"


class SourceFragment(BaseModel):
    email_id: int
    snippet: str
    score: float


class AskResponse(BaseModel):
    answer: str
    sources: List[SourceFragment]


class ChatSessionItem(BaseModel):
    chat_id: str
    title: Optional[str] = None
    created_at: datetime


class ChatSessionListResponse(BaseModel):
    items: List[ChatSessionItem]


class ChatMessageItem(BaseModel):
    role: str
    content: str
    created_at: datetime


class ChatMessageListResponse(BaseModel):
    items: List[ChatMessageItem]
