from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db
from app.schemas import (
    AskRequest,
    AskResponse,
    ChatMessageItem,
    ChatMessageListResponse,
    ChatSessionItem,
    ChatSessionListResponse,
)
from app.services.answer_engine import answer_question
from app.services.chat_history import (
    ensure_chat_session_with_title,
    format_chat_history_text,
    get_chat_history,
    list_chat_sessions,
    save_chat_turn,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/ask", response_model=AskResponse)
def ask_endpoint(
    payload: AskRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    chat_id = payload.chat_id or "default"
    ensure_chat_session_with_title(db, user_id, chat_id, payload.question)
    history_records = get_chat_history(db, user_id, chat_id)
    history_text = format_chat_history_text(history_records)

    answer, frags = answer_question(
        db,
        user_id=user_id,
        question=payload.question,
        current_thread_id=payload.current_thread_id,
        chat_id=chat_id,
        chat_history=history_text,
    )
    save_chat_turn(db, user_id, chat_id, payload.question, answer)
    return AskResponse(answer=answer, sources=frags)


@router.get("/chat-sessions", response_model=ChatSessionListResponse)
def list_chat_sessions_endpoint(
    limit: int = 100,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    sessions = list_chat_sessions(db, user_id, limit=limit)
    items = [
        ChatSessionItem(chat_id=s.chat_id, title=s.title, created_at=s.created_at) for s in sessions
    ]
    return ChatSessionListResponse(items=items)


@router.get("/chat-messages", response_model=ChatMessageListResponse)
def list_chat_messages_endpoint(
    chat_id: str,
    limit: int = 200,
    db: Session = Depends(get_db),
    user_id: str = Depends(deps.get_current_user_id),
):
    records = get_chat_history(db, user_id, chat_id, limit=limit)
    items = [
        ChatMessageItem(role=rec.role, content=rec.content, created_at=rec.created_at) for rec in records
    ]
    return ChatMessageListResponse(items=items)
