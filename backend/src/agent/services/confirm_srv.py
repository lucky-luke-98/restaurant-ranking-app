"""ConfirmService — the ONLY thing in the agent that writes.

Constructed with no ``LlmGateway`` at all, so a transaction can never span an LLM call
without a reviewable constructor-signature diff (§4). The server trusts nothing from the
client: the payload is re-validated through the handler's request model, the handler
builds the same REST request models, and the same service methods apply every existing
business rule. ``proposal_id`` becomes the ``review_id`` — with the unique index, a
double-confirm aborts the transaction (no food items land either) and surfaces as
``AlreadyExistsError`` -> HTTP 409.
"""

from src.agent.tools import HANDLERS_BY_KIND
from src.unit_of_work import UnitOfWork
from src.utils.wrappers import service


class ConfirmService:

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    @service
    def confirm(self, kind: str, proposal_id: str, payload: dict, user_id: str) -> dict:
        """Validate and atomically commit one confirmed proposal. ``user_id`` comes from
        the JWT — the payload cannot carry one (extra keys are forbidden)."""
        handler_cls = HANDLERS_BY_KIND.get(kind)
        if handler_cls is None:
            raise ValueError(f"Unknown proposal kind '{kind}'.")
        handler = handler_cls(self._uow, user_id)
        validated = handler.request_model.model_validate(payload)
        with self._uow:
            return handler.commit(validated, proposal_id)
