from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from app.schemas import SourceFragment
from app.tools.base import ToolContext
from app.services.tool_selector import pick_tools, instantiate_tools
from app.services.llm_provider import chat_completion
from app.services.ai_search import EmailFragment
from app.db import models


def answer_question(
        db: Session,
        user_id: str,
        question: str,
        current_thread_id: Optional[str] = None,
        chat_id: str = "default",
        chat_history: Optional[str] = None,
) -> Tuple[str, List[SourceFragment]]:
    """
    High-level pipeline:
    1) Tool selection (LLM)
    2) Run tools in parallel (here sequential for simplicity)
    3) Call LLM once with all context to generate answer
    """
    ctx = ToolContext(
        user_id=user_id,
        question=question,
        current_thread_id=current_thread_id,
        chat_id=chat_id,
        chat_history=chat_history,
    )

    tool_names = pick_tools(ctx)
    tools = instantiate_tools(db, tool_names)

    # Run tools (sequential)
    tool_results = [t.run(ctx) for t in tools]

    # Collect AI Search matches for source citations if any
    source_fragments: List[SourceFragment] = []
    for tr in tool_results:
        if tr.name == "EmailHistory":
            for m in tr.metadata.get("matches", []):
                # We'll just store minimal info; AskResponse struct will map this.
                # You could keep raw EmailFragment objects in a richer implementation.
                fragment = SourceFragment(
                    email_id=m.get("email_id"),
                    snippet=m.get("snippet"),
                    score=m.get("score"),
                    subject=m.get("subject"),
                    sender=m.get("sender"),
                )
                source_fragments.append(fragment)

    # Build mega prompt
    tool_context_blocks = []
    for tr in tool_results:
        if not tr.content:
            continue
        tool_context_blocks.append(f"[Tool: {tr.name}]\n{tr.content}")

    context_text = "\n\n".join(tool_context_blocks)
    system_prompt = (
        "You are an AI executive assistant that lives in the user's inbox. "
        "Answer based ONLY on the provided tools' context when possible. "
        "If you don't know, say so. "
        "Be concise but complete; you can propose next actions (like 'I can draft a reply'). "
        "Keep your answer in the same language as the User question in contents.parts.text whenever possible."
    )
    history_block = f"\n--- Chat history ---\n{chat_history}" if chat_history else ""
    user_prompt = (
        f"Chat id: {chat_id}{history_block}\n"
        f"User question: {question}\n\n"
        f"--- Tool context ---\n{context_text}\n\n"
        "Now answer the question. If you reference specific emails, summarize them in your own words."
    )

    msg = chat_completion(system_prompt, user_prompt)
    answer = msg.get("content", "")

    # For response sources: re-run AI search with small k to show top citations
    # from app.services.ai_search import ai_search as ai_search_func
    # fragments = ai_search_func(db, user_id, question, max_results=5)

    return answer, source_fragments
