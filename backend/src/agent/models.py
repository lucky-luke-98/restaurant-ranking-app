"""Agent-domain models: tool arguments and the chat wire format.

``user_id`` is deliberately NOT a field on any ``ToolArgs`` model — it is bound into each
tool instance by ``ToolRegistry`` (a constructor argument), so it cannot appear in any
emitted schema and the model cannot express it. ``extra="forbid"`` turns an attempt to
send one anyway into a visible ``ValidationError`` instead of a silent drop.

Coercion for model-emitted sloppiness (German "12,50" prices etc.) belongs HERE when it
arrives with the write tools — never in ``src/restaurants/models.py``, which is the strict
public REST contract.
"""

from datetime import date, timedelta
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _coerce_german_number(value):
    """'12,50' -> 12.5, '9,90 €' -> 9.9, '1.234,50' -> 1234.5. A free model WILL emit
    these regardless of schema descriptions; this is the net, not the plan."""
    if isinstance(value, str):
        cleaned = value.strip().removesuffix("€").removesuffix("EUR").strip()
        if "," in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        return cleaned
    return value


def _coerce_relative_date(value):
    """Only the high-frequency exceptions are hardcoded; anything else non-ISO raises a
    ValidationError the model can read and retry from in ISO ('letzten Freitag' on a
    Friday is genuinely ambiguous — one extra round trip is what the error path is for)."""
    if isinstance(value, str):
        normalized = value.strip().casefold()
        if normalized in ("heute", "today"):
            return date.today()
        if normalized in ("gestern", "yesterday"):
            return date.today() - timedelta(days=1)
        if normalized in ("vorgestern",):
            return date.today() - timedelta(days=2)
    return value


# ==================== tool arguments ==================== #

class ToolArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FindRestaurantArgs(ToolArgs):
    name: str = Field(..., min_length=1, max_length=120, description="Restaurant name to look up.")
    city: str | None = Field(None, max_length=80, description="Optional city to narrow the search.")


class GetMyReviewsArgs(ToolArgs):
    restaurant_id: str | None = Field(None, description="Optional: only reviews for this restaurant.")
    food_query: str | None = Field(
        None, max_length=80,
        description="Optional case- and accent-insensitive substring matched against dish "
                    "names across the user's WHOLE history, e.g. 'döner' or 'pizza'. Use this "
                    "for questions like 'my best/favorite X'.",
    )
    limit: int = Field(5, ge=1, le=15, description="Maximum number of reviews to return.")


class GetRestaurantSignalArgs(ToolArgs):
    restaurant_id: str = Field(..., description="The restaurant to aggregate ratings for.")


class DraftFoodItemArgs(ToolArgs):
    food_name: str = Field(..., min_length=1, max_length=120, description="Dish name as the user said it.")
    price: float = Field(..., gt=0.0, description="Price in EUR as a number, e.g. 12.5.")
    rating: float = Field(..., ge=0.0, le=10.0, description="0-10; map colloquial judgments sensibly.")
    comment: str | None = Field(None, max_length=1500)

    _numbers = field_validator("price", "rating", mode="before")(_coerce_german_number)


class DraftReviewArgs(ToolArgs):
    restaurant_id: str = Field(..., description="Must come from find_restaurant — never invented.")
    cleanliness_rating: float = Field(..., ge=0.0, le=10.0, description="0-10, as given by the user.")
    experience_rating: float = Field(..., ge=0.0, le=10.0, description="0-10, as given by the user.")
    comment: str | None = Field(None, max_length=1500, description="Overall comment, if any.")
    visited_at: date | None = Field(None, description="ISO 8601 date (YYYY-MM-DD) or null.")
    food_items: list[DraftFoodItemArgs] = Field(default_factory=list, max_length=10)

    _numbers = field_validator("cleanliness_rating", "experience_rating", mode="before")(_coerce_german_number)
    _dates = field_validator("visited_at", mode="before")(_coerce_relative_date)


# ==================== propose / confirm ==================== #

class Proposal(BaseModel):
    """A drafted write, shown to the user as a card. `kind` is the polymorphism key that
    selects both the server-side handler and the client card component."""
    kind: str
    proposal_id: str = Field(default_factory=lambda: str(uuid4()))
    summary: str
    payload: dict
    # Display-only context for the card (restaurant name/street/city — never the uuid).
    # Not part of what the confirm endpoint validates or trusts.
    display: dict = Field(default_factory=dict)


class AgentConfirmRequest(BaseModel):
    kind: str = Field(..., max_length=60)
    proposal_id: str = Field(
        ..., pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        description="The server-minted proposal id; becomes the review_id (idempotency key).",
    )
    # Typed dict so FastAPI does not pretend to have validated it — ConfirmService
    # re-validates through the handler's request model, then the REST request models.
    payload: dict


class AgentConfirmResponse(BaseModel):
    success: bool
    review_id: str | None = None


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
    crash. v1 emits ``text`` and ``proposal``.
    """
    kind: str
    text: str | None = None
    proposal: dict | None = None


class AgentChatResponse(BaseModel):
    blocks: list[ChatBlock]
    # Always present so the step-6 propose/confirm shape is additive, not breaking.
    proposals: list[dict] = Field(default_factory=list)
