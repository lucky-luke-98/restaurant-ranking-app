"""Explicit tool registration.

A literal list, NOT a decorator registry: tool order feeds the provider's prompt cache,
and as data the order is a reviewable line in a diff instead of an invisible global that
an unrelated import can reorder. Adding a tool is one new module plus one entry here.
"""

from src.agent.schemas import openai_tool_schema
from src.agent.tools.draft_review import DraftReview, RestaurantReviewProposalHandler
from src.agent.tools.find_restaurant import FindRestaurant
from src.agent.tools.get_my_reviews import GetMyReviews
from src.agent.tools.get_restaurant_signal import GetRestaurantSignal

TOOL_CLASSES = [FindRestaurant, GetMyReviews, GetRestaurantSignal, DraftReview]
PROPOSAL_HANDLERS = [RestaurantReviewProposalHandler]
HANDLERS_BY_KIND = {handler.kind: handler for handler in PROPOSAL_HANDLERS}

# Built once at import: fixed order for the prompt cache, zero per-request cost, and a
# self-referential args model fails the deploy here rather than mid-conversation.
TOOL_SCHEMAS = [
    openai_tool_schema(cls.name, cls.description, cls.args_model) for cls in TOOL_CLASSES
]
