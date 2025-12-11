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
            self.db.query(models.Email)
            .filter(
                models.Email.user_id == ctx.user_id,
                models.Email.thread_id == ctx.current_thread_id,
                )
            .order_by(models.Email.ts.desc())
            .first()
        )
        if not rec:
            return ToolResult(name=self.name, content="", metadata={})

        header_lines = [
            f"Subject: {rec.subject or ''}",
            f"From: {rec.sender or ''}",
            f"To: {rec.recipients or ''}",
            f"Cc: {rec.cc or ''}",
            f"Bcc: {rec.bcc or ''}",
        ]
        content = "\n".join(header_lines) + "\n\n" + (rec.body_text or "")

        return ToolResult(
            name=self.name,
            content=content,
            metadata={
                "thread_id": ctx.current_thread_id,
                "subject": rec.subject,
                "sender": rec.sender,
                "recipients": rec.recipients,
                "cc": rec.cc,
                "bcc": rec.bcc,
            },
        )
