from sqlalchemy.orm import Session
from app.tools.base import BaseTool, ToolContext, ToolResult
from app.db import models


class CurrentThreadTool(BaseTool):
    name = "CurrentThread"

    def __init__(self, db: Session):
        self.db = db

    def run(self, ctx: ToolContext) -> ToolResult:
        if not ctx.current_thread_id:
            return ToolResult(name=self.name, content="", metadata={})

        rec = (
            self.db.query(models.CurrentThreadContext)
            .filter(
                models.CurrentThreadContext.user_id == ctx.user_id,
                models.CurrentThreadContext.thread_id == ctx.current_thread_id,
                )
            .order_by(models.CurrentThreadContext.updated_at.desc())
            .first()
        )
        if not rec:
            return ToolResult(name=self.name, content="", metadata={})

        return ToolResult(
            name=self.name,
            content=rec.context_text,
            metadata={"thread_id": ctx.current_thread_id},
        )
