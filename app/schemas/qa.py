from pydantic import BaseModel
from typing import Optional, List


class AskRequest(BaseModel):
    question: str
    current_thread_id: Optional[str] = None  # if any


class SourceFragment(BaseModel):
    email_id: int
    snippet: str
    score: float


class AskResponse(BaseModel):
    answer: str
    sources: List[SourceFragment]
