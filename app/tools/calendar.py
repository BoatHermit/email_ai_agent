from app.tools.base import BaseTool, ToolContext, ToolResult


class CalendarTool(BaseTool):
    name = "Calendar"

    def run(self, ctx: ToolContext) -> ToolResult:
        # Placeholder: in a real system you'd query Google Calendar or similar.
        # For now we just return empty.
        return ToolResult(name=self.name, content="", metadata={})
