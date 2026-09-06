"""ToolRegistry: the (uow, user_id) closure every tool call runs inside."""

from src.agent.tools import TOOL_CLASSES, TOOL_SCHEMAS
from src.unit_of_work import UnitOfWork


class ToolRegistry:

    def __init__(self, uow: UnitOfWork, user_id: str):
        # None as a Mongo filter value matches documents where the field is absent —
        # an unauthenticated registry must be unconstructable.
        if not user_id:
            raise ValueError("ToolRegistry requires an authenticated user_id.")
        self._tools = {cls.name: cls(uow, user_id) for cls in TOOL_CLASSES}

    @staticmethod
    def schemas() -> list[dict]:
        return TOOL_SCHEMAS

    def dispatch(self, name: str, arguments_json: str) -> dict:
        """Validate and run one tool call. Raises ``ValidationError``/``ValueError`` for
        the caller to turn into an ``is_error`` tool result."""
        tool = self._tools.get(name)
        if tool is None:
            raise ValueError(f"Unknown tool '{name}'.")
        args = tool.args_model.model_validate_json(arguments_json or "{}")
        return tool.run(args)
