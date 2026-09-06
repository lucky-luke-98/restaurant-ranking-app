"""Agent-domain models: tool arguments and the chat wire format.

``user_id`` is deliberately NOT a field on any ``ToolArgs`` model — it is bound into each
tool instance by ``ToolRegistry`` (a constructor argument), so it cannot appear in any
emitted schema and the model cannot express it. ``extra="forbid"`` turns an attempt to
send one anyway into a visible ``ValidationError`` instead of a silent drop.

Coercion for model-emitted sloppiness (German "12,50" prices etc.) belongs HERE when it
arrives with the write tools — never in ``src/restaurants/models.py``, which is the strict
public REST contract.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ==================== tool arguments ==================== #

class ToolArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FindRestaurantArgs(ToolArgs):
    name: str = Field(..., min_length=1, max_length=120, description="Restaurant name to look up.")
    city: str | None = Field(None, max_length=80, description="Optional city to narrow the search.")


class GetMyReviewsArgs(ToolArgs):
    restaurant_id: str | None = Field(None, description="Optional: only reviews for this restaurant.")
    limit: int = Field(5, ge=1, le=5, description="Maximum number of reviews to return.")


class GetRestaurantSignalArgs(ToolArgs):
    restaurant_id: str = Field(..., description="The restaurant to aggregate ratings for.")


# ==================== chat wire format ==================== #

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="The user's message.")
    # Client-supplied history is a client-supplied token bill — hard-capped.
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    language: Literal["de", "en"] = Field("de", description="Reply language.")
    restaurant_id: str | None = Field(
        None, description="Optional context: set when the chat was opened from a restaurant screen."
    )


class ChatBlock(BaseModel):
    """One ordered block of the answer. Designed so a streamed shape can be identical.

    ``kind`` selects the client renderer; unknown kinds must render as nothing, never
    crash. v1 emits only ``text``.
    """
    kind: str
    text: str | None = None


class AgentChatResponse(BaseModel):
    blocks: list[ChatBlock]
    # Always present so the step-6 propose/confirm shape is additive, not breaking.
    proposals: list[dict] = Field(default_factory=list)
