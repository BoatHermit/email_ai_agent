from __future__ import annotations

from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from app.db import models
from app.services.llm_provider import chat_completion


def get_chat_history(
    db: Session,
    user_id: str,
    chat_id: str,
    limit: int = 10,
) -> List[models.ChatMessage]:
    """
    Fetch the most recent chat messages for a chat, ordered from oldest to newest.
    """
    records = (
        db.query(models.ChatMessage)
        .filter(
            models.ChatMessage.user_id == user_id,
            models.ChatMessage.chat_id == chat_id,
        )
        .order_by(models.ChatMessage.created_at.desc(), models.ChatMessage.id.desc())
        .limit(limit)
        .all()
    )
    records.reverse()
    return records


def format_chat_history_text(records: List[models.ChatMessage]) -> str:
    """
    Render chat history as plain text blocks for LLM context.
    """
    parts = []
    for rec in records:
        role = rec.role or "user"
        parts.append(f"{role.capitalize()}: {rec.content}")
    return "\n".join(parts)


def save_chat_turn(
    db: Session,
    user_id: str,
    chat_id: str,
    user_message: str,
    assistant_message: str,
) -> None:
    """
    Persist a single chat turn (user question + assistant answer).
    """
    user_rec = models.ChatMessage(
        user_id=user_id,
        chat_id=chat_id,
        role="user",
        content=user_message,
    )
    assistant_rec = models.ChatMessage(
        user_id=user_id,
        chat_id=chat_id,
        role="assistant",
        content=assistant_message,
    )
    db.add_all([user_rec, assistant_rec])
    db.commit()


def _generate_title_from_first_question(question: str) -> str:
    system_prompt = (
        "You create short chat titles. "
        "Given the first user question, return a concise title (max 8 Chinese characters or 35 ASCII chars). "
        "Do not include quotes or punctuation. Output plain text only."
    )
    msg = chat_completion(system_prompt, f"First question: {question}")
    title = msg.get("content", "").strip()
    if not title:
        title = question[:35]
    return title


def ensure_chat_session_with_title(
    db: Session,
    user_id: str,
    chat_id: str,
    first_question: str,
) -> None:
    """
    Ensure a chat session row exists; if new, generate a title from the first question.
    """
    existing = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.user_id == user_id,
            models.ChatSession.chat_id == chat_id,
        )
        .first()
    )
    if existing:
        return

    title = _generate_title_from_first_question(first_question)
    rec = models.ChatSession(
        user_id=user_id,
        chat_id=chat_id,
        title=title,
    )
    db.add(rec)
    db.commit()


def list_chat_sessions(
    db: Session,
    user_id: str,
    limit: int = 100,
) -> List[models.ChatSession]:
    """
    Return recent chat sessions for a user, newest first.
    """
    return (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == user_id)
        .order_by(models.ChatSession.created_at.desc(), models.ChatSession.id.desc())
        .limit(limit)
        .all()
    )
