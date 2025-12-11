from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import deps
from app.api.dependencies import get_db
from app.schemas import AskRequest, AskResponse
from app.services.answer_engine import answer_question
from app.services.chat_history import (
    ensure_chat_session_with_title,
    format_chat_history_text,
    get_chat_history,
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
