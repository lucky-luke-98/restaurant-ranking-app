"""draft_review: the agent's only write-shaped tool — and it writes NOTHING.

It validates the draft and returns a Proposal payload; the actual write happens only in
``ConfirmService`` after the user taps Save on the card. The paired handler lives here so
adding a future kind (mark_visited, add_to_wishlist) stays one module plus two list entries.
"""

from src.agent.models import DraftReviewArgs
from src.agent.tools.base import Tool
from src.restaurants.models import CreateFoodReviewRequest, CreateRestaurantReviewRequest
from src.restaurants.services.reviews_srv import FoodReviewService, ReviewService
from src.unit_of_work import UnitOfWork


class DraftReview(Tool):

    name = "draft_review"
    description = (
        "Draft (NOT save) a restaurant review from what the user reported, including all "
        "mentioned dishes as food_items. The user sees the draft as a card and decides "
        "whether to save it. Requires cleanliness_rating and experience_rating — ask the "
        "user if they have not given them."
    )
    args_model = DraftReviewArgs
    proposes = "restaurant_review"

    def run(self, args: DraftReviewArgs) -> dict:
        # Re-check the id so an invented uuid becomes a retryable is_error, not a bad write.
        restaurant = self._uow.restaurants.get(args.restaurant_id)
        if restaurant is None:
            raise ValueError(
                f"Unknown restaurant_id '{args.restaurant_id}'. Use find_restaurant first; "
                "if the restaurant is not in the app, the user must add it there."
            )
        # Validate through the REAL request model now, so a draft that could never be
        # confirmed fails here, inside the retry loop.
        CreateRestaurantReviewRequest(**args.model_dump(exclude={"food_items"}))

        dishes = len(args.food_items)
        return {
            "summary": f"{restaurant['name']}: {args.experience_rating:g}/10, {dishes} dish(es)",
            "payload": args.model_dump(mode="json"),
            "display": {
                "restaurant_name": restaurant.get("name"),
                "street": restaurant.get("street"),
                "city": restaurant.get("city"),
            },
        }


class RestaurantReviewProposalHandler:
    """Commits a confirmed restaurant_review proposal.

    Constructed with no LlmGateway — the confirm path must never span an LLM call with a
    transaction. It builds the SAME request models the REST endpoints validate and calls
    the SAME service methods, so every existing business rule fires (users.exists, the
    self-coauthorship rejection, _move_to_visited, find_authored on food items).
    """

    kind = "restaurant_review"
    request_model = DraftReviewArgs

    def __init__(self, uow: UnitOfWork, user_id: str):
        if not user_id:
            raise ValueError("ProposalHandler requires an authenticated user_id.")
        self._uow = uow
        self._user_id = user_id

    def commit(self, payload: DraftReviewArgs, proposal_id: str) -> dict:
        review_request = CreateRestaurantReviewRequest(
            review_id=proposal_id,  # idempotency: a double-confirm hits the unique index
            restaurant_id=payload.restaurant_id,
            cleanliness_rating=payload.cleanliness_rating,
            experience_rating=payload.experience_rating,
            comment=payload.comment,
            visited_at=payload.visited_at,
            coauthor_ids=[],  # deliberately no coauthors in the agent path (risk 15)
            images=[],
        )
        review_id = ReviewService(self._uow).create_one_restaurant_review(
            request=review_request, user_id=self._user_id
        )
        if review_id is None:
            raise ValueError("The review could not be stored.")

        food_reviews = FoodReviewService(self._uow)
        for item in payload.food_items:
            food_reviews.create_food_review(
                request=CreateFoodReviewRequest(
                    restaurant_id=payload.restaurant_id,
                    review_id=review_id,
                    food_name=item.food_name,
                    price=item.price,
                    rating=item.rating,
                    comment=item.comment,
                    images=[],
                    visited_at=payload.visited_at,
                ),
                user_id=self._user_id,
            )
        return {"review_id": review_id}
