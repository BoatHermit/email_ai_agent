from sqlalchemy.orm import Session
from app.tools.base import BaseTool, ToolContext, ToolResult
from app.services.ai_search import ai_search


class EmailHistoryTool(BaseTool):
    name = "EmailHistory"

    def __init__(self, db: Session):
        self.db = db

    def run(self, ctx: ToolContext) -> ToolResult:
        fragments = ai_search(
            self.db,
            ctx.user_id,
            ctx.question,
            current_thread_text=None,
            chat_history=ctx.chat_history,
        )
        if not fragments:
            return ToolResult(name=self.name, content="", metadata={"matches": []})

        content_parts = []
        meta_matches = []
        for f in fragments:
            header = f"From: {f.email.sender} | Subject: {f.email.subject} | Date: {f.email.ts.isoformat()}"
            content_parts.append(header)
            content_parts.append(f"Snippet: {f.snippet}")
            content_parts.append("-" * 40)
            meta_matches.append(
                {
                    "email_id": f.email.id,
                    "score": f.score,
                    "subject": f.email.subject,
                    "snippet": f.snippet,
                }
            )

        return ToolResult(
            name=self.name,
            content="\n".join(content_parts),
            metadata={"matches": meta_matches},
        )
