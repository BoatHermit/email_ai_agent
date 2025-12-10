from app.tools.base import BaseTool, ToolContext, ToolResult


class ComposeTool(BaseTool):
    name = "Compose"

    def run(self, ctx: ToolContext) -> ToolResult:
        # Placeholder: real system would load few-shot examples in user's voice.
        # Here just return empty; final LLM will still be able to draft text.
        return ToolResult(name=self.name, content="", metadata={})
