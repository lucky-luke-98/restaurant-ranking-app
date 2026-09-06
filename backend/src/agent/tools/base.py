"""The tool contract.

``user_id`` is a constructor argument bound before any schema is generated: it is not a
field on any args model, therefore cannot appear in a schema, therefore the model cannot
express it. Tool bodies read ``self._user_id``, never args.

Return payloads are projected IN the tool body — the tool decides what leaves the DB
boundary, not the LLM.
"""

from abc import ABC, abstractmethod
from typing import ClassVar

from src.agent.models import ToolArgs
from src.unit_of_work import UnitOfWork


class Tool(ABC):

    name: ClassVar[str]
    description: ClassVar[str]
    args_model: ClassVar[type[ToolArgs]]
    # None means read-only; a string is the proposal kind (the step-6 polymorphism key).
    proposes: ClassVar[str | None] = None

    def __init__(self, uow: UnitOfWork, user_id: str):
        self._uow = uow
        self._user_id = user_id

    @abstractmethod
    def run(self, args: ToolArgs) -> dict:
        """Execute the tool and return a JSON-serializable projection."""
