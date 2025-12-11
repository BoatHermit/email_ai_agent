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
                            "enum": ["EmailHistory",],
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
        "Return JSON via the select_tools function."
    )
    user_prompt = f"Question: {ctx.question}\nCurrent thread id: {ctx.current_thread_id}"

    msg = chat_completion(system_prompt, user_prompt, tools=TOOLS_DEF)
    tool_calls = msg.get("tool_calls")
    if not tool_calls:
        # simple heuristic fallback
        if "free time" in ctx.question.lower() or "availability" in ctx.question.lower():
            return ["Calendar", "Compose"]
        if "summarize" in ctx.question.lower():
            return ["CurrentThread"]
        return ["EmailHistory"]

    # parse function arguments
    for call in tool_calls:
        if call["function"]["name"] == "select_tools":
            import json
            args = json.loads(call["function"]["arguments"])
            return args.get("tools", [])

    return ["EmailHistory"]


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
