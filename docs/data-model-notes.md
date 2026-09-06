# Data model — open questions / later cleanup

Parking lot for schema decisions that are noted but deliberately not acted on yet.

## `cleanliness_rating` + `experience_rating` on restaurant reviews

**Question (2026-09-06):** both ratings feel barely used in the product — consider deleting
one or both.

**What the prod data says** (63 reviews at time of writing): both fields are always filled
(they are required), values span 4.7–10, and only 7 of 63 reviews carry the same value for
both — so users do differentiate them when forced to. Whether they *want* to is a different
question.

**Options, roughly in order of effort:**
1. Keep as-is (do nothing).
2. Make one or both optional — small change: loosen the request/entity models, default the
   UI sliders to unset, and decide how aggregates treat missing values.
3. Drop `cleanliness_rating` entirely — touches the entity + request models, the review
   form and cards in the frontend, and the agent plan's `DraftReviewArgs`
   (docs/agent-architecture.md §5); needs a migration decision for the existing values
   (keep in old docs vs. `$unset`).

**Decision:** deferred, not relevant now. Revisit after the conversational agent v1, since
its `draft_review` tool schema freezes whatever shape reviews have at that point.
