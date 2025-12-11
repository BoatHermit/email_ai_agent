from typing import List, Dict, Any
from app.services.llm_provider import chat_completion
from app.tools.base import ToolContext
from app.tools import CurrentThreadTool, EmailHistoryTool, CalendarTool, ComposeTool
from sqlalchemy.orm import Session


TOOLS_DEF = [
    {
        "type": "function",
        "function": {
            "name": "select_tools",
            "description": "Select which tools are relevant for answering a question.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tools": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["CurrentThread", "EmailHistory",],
                            # "enum": ["CurrentThread", "EmailHistory", "Calendar", "Compose"],
                        },
                    }
                },
                "required": ["tools"],
            },
        },
    }
]


def pick_tools(ctx: ToolContext) -> List[str]:
    system_prompt = (
        "You are a tool selector for an email AI assistant. "
        "Given the user's question and context, choose which tools are needed. "
        "Always use CurrentThread when the user wants to reply to, draft, or summarize the current email. "
        "Return JSON via the select_tools function."
    )
    history_block = f"\nChat history:\n{ctx.chat_history}" if ctx.chat_history else ""
    user_prompt = (
        f"Chat id: {ctx.chat_id}\n"
        f"Question: {ctx.question}\n"
        f"Current thread id: {ctx.current_thread_id}{history_block}"
    )

    msg = chat_completion(system_prompt, user_prompt, tools=TOOLS_DEF)
    tool_calls = msg.get("tool_calls")

    def needs_current_thread(question: str) -> bool:
        q = question.lower()
        reply_terms = ["reply", "respond", "response", "draft", "write back", "answer", "summarize"]
        chinese_reply_terms = ["回信", "回复", "回邮件", "回覆", "拟一封", "写封", "写一封"]
        return any(term in q for term in reply_terms) or any(term in question for term in chinese_reply_terms)

    def ensure_current_thread(selected: List[str]) -> List[str]:
        if needs_current_thread(ctx.question) and "CurrentThread" not in selected:
            selected = selected + ["CurrentThread"]
        return selected

    if not tool_calls:
        # simple heuristic fallback
        if "free time" in ctx.question.lower() or "availability" in ctx.question.lower():
            return ["Calendar", "Compose"]
        if "summarize" in ctx.question.lower():
            return ["CurrentThread"]
        base = ["EmailHistory"]
        return ensure_current_thread(base)

    # parse function arguments
    for call in tool_calls:
        if call["function"]["name"] == "select_tools":
            import json
            args = json.loads(call["function"]["arguments"])
            selected = args.get("tools", [])
            return ensure_current_thread(selected)

    return ensure_current_thread(["EmailHistory"])


def instantiate_tools(db: Session, tool_names: List[str]):
    mapping = {
        "CurrentThread": lambda: CurrentThreadTool(db),
        "EmailHistory": lambda: EmailHistoryTool(db),
        "Calendar": lambda: CalendarTool(),
        "Compose": lambda: ComposeTool(),
    }
    tools = []
    for name in tool_names:
        factory = mapping.get(name)
        if factory:
            tools.append(factory())
    return tools
