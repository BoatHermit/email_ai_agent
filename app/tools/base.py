from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ToolContext:
    user_id: str
    question: str
    current_thread_id: Optional[str] = None


@dataclass
class ToolResult:
    name: str
    content: str
    metadata: Dict[str, Any]


class BaseTool:
    name: str

    def run(self, ctx: ToolContext) -> ToolResult:
        raise NotImplementedError
