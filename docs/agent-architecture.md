# Conversational Agent — Architecture & Build Plan

**Status:** planned, not started. No code written.
**Date:** 2026-08-22
**Scope:** a chat interface that answers questions about a user's own food reviews, surfaces aggregated
cross-user signal, and conversationally **creates review entries** for restaurants that already exist.

Every fact with a number or a quote in this document was verified against a provider-owned page or against
this repository. Claims that could not be verified are marked **UNVERIFIED** and have an owner action.

---

## 1. Decision summary

| Decision | Choice | Why |
|---|---|---|
| LLM provider | **Groq**, free plan | Only surveyed provider with $0 cost, no card, contractual no-training, *and* free-tier Zero Data Retention |
| Model | `openai/gpt-oss-120b` | Production status (not Preview), 131k context, native tool calling, documented multilingual |
| Fallback chain | `gpt-oss-120b` → `gpt-oss-20b` → `qwen/qwen3.6-27b` | First two are Production; the qwen is Preview and may vanish at short notice |
| HTTP client | `requests` | Already in `requirements.txt`. Groq is OpenAI-compatible. **Zero new runtime dependencies** |
| Agent framework | **None** | Every tool is a method call on our own `UnitOfWork` behind an authenticated `user_id`. A framework would add a dependency, an abstraction layer, and a place for `user_id` to leak, all to wrap a ~40-line `for` loop we can read in full |
| Draft storage | Client-side | At 3 users/day a server-side drafts collection is a 9th repository, a 9th collection, a TTL index and an orphan-cleanup path that never earns its keep |
| Streaming | Not in v1 | Render free cold-starts take ~1 minute; SSE plumbing to save 3 seconds for 3 people is the wrong first bet |
| Chat entry point | Global FAB → `/chat` route | Not a 5th tab (owner requirement) |

### Request contract

```json
{
  "model": "openai/gpt-oss-120b",
  "messages": [ "..." ],
  "tools": [ "..." ],
  "tool_choice": "auto",
  "parallel_tool_calls": false,
  "reasoning_effort": "low",
  "include_reasoning": false,
  "temperature": 0.1,
  "max_completion_tokens": 700,
  "n": 1
}
```

Endpoint `https://api.groq.com/openai/v1/chat/completions`. Headers `Authorization: Bearer $LLM_API_KEY`,
`Content-Type: application/json`. **Always pass `timeout=45`** — `requests` has no default, and a hung socket
on a single-worker Render instance is a hung app.

`reasoning_effort: "low"` is a **correctness requirement, not a tuning knob.** `gpt-oss-120b` is a reasoning
model whose default effort is `"medium"`; leaving it unset moves one turn from 65% to 83% of the per-minute
token ceiling with no error and no symptom until it intermittently fails under load. Make it a required
argument in the gateway, never an optional kwarg defaulting to `None`.

**Never send** (each is a documented 400): `logprobs`, `logit_bias`, `top_logprobs`, `messages[].name`,
`reasoning_format` on gpt-oss, `n != 1`. Use `max_completion_tokens`, not `max_tokens`. Never
`temperature: 0` — Groq silently rewrites it to `1e-8`.

### Two stale-documentation traps

Groq's `/docs/tool-use` page is wrong in two ways that each cost an afternoon:

1. Its example tool-result message includes a `"name"` key. `/docs/openai` lists `messages[].name` as a
   **400**. The correct shape is exactly:
   ```python
   {"role": "tool", "tool_call_id": call["id"],
    "content": json.dumps(result, ensure_ascii=False, default=str)}
   ```
   `ensure_ascii=False` is not cosmetic — escaped umlauts cost roughly 3x the tokens.
2. It still lists `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` as tool-use models. Both were
   **retired 16 August 2026**. Trust `/docs/models` and `/docs/deprecations` for model names, never
   `/docs/tool-use`.

---

## 2. Rejected options

Recorded so these are not re-litigated in six months.

### LLM providers

| Option | Verdict |
|---|---|
| **Hugging Face** (all paths) | Free Inference Providers credit is **$0.10/month**, "subject to change" per HF's own pricing table. This feature costs **$0.094–0.105/month** at the cheapest routable provider — 94–105% of the entire allowance. Free CPU Spaces no longer exist ("Gradio and Docker Spaces … require a paid plan to create: PRO for personal accounts"); ZeroGPU is 5 GPU-min/day, needs an account >30 days old, and is "exclusively compatible with the Gradio SDK"; Inference Endpoints require "an active subscription and credit card on file". Also: the router defaults to `provider=auto`, so **HF chooses which company receives user review text** and may change that choice between requests |
| **Google Gemini** free tier | Highest quota surveyed, and disqualified on terms: "human reviewers may read, annotate, and process your API input and output" and "Do not submit sensitive, confidential, or personal information to the Unpaid Services". Our payload is exactly that. Separately, a Use Restriction requires **Paid Services** for API clients made available to EEA/CH/UK users — so free Gemini is contractually prohibited the moment a German friend logs in |
| **GitHub Models** | Retired entirely, 30 July 2026 |
| **Cerebras** | Former free tier is now $5 of credits requiring "a verified payment method", expiring in 30 days. Widely still cited as the best no-card option; that is out of date |
| **Mistral** | Training posture **unresolved**: `docs.mistral.ai` says API data "isn't used for model training" while the Help Centre says free mode "may use your data (input and output) to train". Two official pages contradict each other |
| **Scaleway** | Best EU data residency surveyed (Paris) and 1M free tokens/month, but "you cannot configure a specific threshold after which your usage will be blocked" — no hard cap is not zero-cost |
| **Z.ai GLM-Flash** | $0/token and good at tools, but a Chinese processor handling German users' personal data with no adequacy decision |
| **OpenRouter** free models | 50 requests/day without prior credits; real load is 30 *model calls*/day = 60% consumed. Emergency failover only |
| NVIDIA NIM, Together, Fireworks, Nebius, Novita, Hyperbolic, Baseten, Alibaba | One-time credit grants, not recurring free tiers. Fail in weeks by construction |
| **Self-hosted weights on Render** | Render free is 512 MB RAM / 0.1 CPU against ~5–6 GB for the smallest competent tool-calling model. An 11x gap no quantization closes. Render's own docs: "Do not use them for production applications" |
| **Cloudflare Workers AI** | **Kept as the documented fallback.** 10,000 neurons/day, resets 00:00 UTC, hard stop rather than a bill, and the strongest no-training language of any provider. Not primary because function calling is Beta on the path we would need and the docs do not confirm `tools` traverse `/ai/v1/chat/completions`. One curl settles it the day it is needed |

**Local inference (Ollama + Qwen3.5-9B on the dev Mac) remains recommended for prompt iteration and evals** —
free, unlimited, nothing leaves the machine. It is not a production path.

### Agent frameworks

Considered and rejected: Pydantic AI, LangGraph, LlamaIndex Workflows, smolagents, Agno, CrewAI, OpenAI Agents
SDK, Google ADK, Semantic Kernel, AutoGen, Atomic Agents, Marvin, LiteLLM.

The strongest candidate was `pydantic-ai-slim[groq]` (MIT, 6 MB, typed DI, native approval gates). It was
rejected only because the hand-written loop is *also* sufficient here and costs zero dependencies — and
because pydantic-ai shipped 33 minor releases plus a breaking v1→v2 in two months, which is the wrong
maintenance profile for a hobby app expected to keep working untouched. **If the hand-rolled loop ever proves
awkward, `pydantic-ai-slim[groq]` is the migration target and the `LlmGateway` ABC makes it a contained change.**

Notes on others, so the reasoning is not lost: LangGraph's human-in-the-loop requires a checkpointer — a
second persistence path beside the existing `UnitOfWork` — and is 13 MB, heavier than pydantic-ai. CrewAI is
220–247 MB including chromadb, lancedb and pyarrow, and pins `pydantic<2.13`. OpenAI Agents SDK has tracing
**on by default** exporting to OpenAI's backend. Atomic Agents requires Python ≥3.12 (this repo is 3.11).
Marvin is broken on a clean install (imports `pydantic_ai.usage.Usage`, removed in 2.x).

---

## 3. Token budget

Free-plan ceilings for `openai/gpt-oss-120b`: **30 RPM / 1,000 RPD / 8,000 TPM / 200,000 TPD**, enforced at
the **organization** level, not per user.

**Key insight:** TPM is a rolling per-minute window and an agent turn completes in seconds. The three calls of
a turn share **one** 8,000-token budget. Budget the turn, not the call.

Cacheable prefix `P` = system prompt (~500) + four tool schemas (~600) = **1,100 tokens**.

| Call | Input | Output | Emits |
|---|---|---|---|
| 1 | `P` + 60 user = 1,160 | 200 | `find_restaurant` |
| 2 | 1,160 + 50 asst + 110 result = 1,320 | 200 | `get_my_reviews` |
| 3 | 1,320 + 60 asst + 460 result = 1,840 | 500 | `draft_review` |

**4,320 input + 900 output = 5,220 tokens per turn.**

| Limit | Usage at 10 turns/day | Headroom |
|---|---|---|
| 8,000 TPM | **65%** | 1.5x |
| 200,000 TPD | 26% | 3.8x |
| 1,000 RPD | 3% | 33x |
| 30 RPM | 10% | 10x |

**Only TPM matters, and only under concurrency.** RPD, RPM and TPD have 4–33x headroom; stop thinking about
them.

### Hard rules for the harness

- Cacheable prefix (system + tool schemas) ≤ **1,100 tokens**. Every 100 added here costs 300 per turn.
- Largest single request (the last call, carrying full history) ≤ **2,500 input tokens**.
- Total tool-result payload across the whole turn ≤ **1,000 tokens**.
- Conversation history capped at 20 messages via `Field(max_length=20)`. Client-supplied history is a
  client-supplied token bill.
- **Pre-send estimate**, client-side, no new dependency:
  `len(json.dumps(messages))//3 + len(json.dumps(tools))//3 + max_completion_tokens`.
  If it exceeds `agent_tpm_ceiling`, raise a **permanent, non-retryable** error. No amount of waiting makes a
  single request smaller than a per-minute ceiling, and Groq gives no marker distinguishing "wait" from
  "impossible" — **this precheck is the discriminator.**

### Two priced edge cases

**A 4th call** (model asks a clarifying question instead of drafting): +2,390 in, +150 out → 7,760 = **97% of
TPM**. Mitigation: from iteration 4 onward, drop the `tools` array and send `tool_choice: "none"` to force a
text answer — saves 600/call → 7,160 = 90%, and structurally prevents a runaway extra tool round-trip. The
happy path never needs a 4th inference call, because the user-facing reply for a successful `draft_review` is
composed from the proposal summary in application code.

**Two concurrent users**: 2 × 5,220 = 10,440 against 8,000 → one 429s. Mitigation: a module-level
`asyncio.Semaphore(1)` around the agent turn. Render free is a single worker, so in-process is both sufficient
and correct. Plus `retry-after` backoff (2 attempts max) from day one.

### Prompt caching — margin, not plan

Groq caches automatically, "with no code changes required and no additional fees", and **"cached tokens do not
count towards your rate limits"**. The 1,100-token prefix repeats exactly on calls 2 and 3, plausibly dropping
the effective figure to ~38% of the window. Do not budget on it: "Groq tries to maximize cache hits, but this
is not guaranteed."

Two ordering rules that cost nothing now and are painful to retrofit:

- **`SYSTEM_PROMPT` is a module-level constant with no interpolation.** Today's date and the user's language
  ride in the *user* message: `f"[language={language}] [today={date.today().isoformat()}]\n{message}"`.
  `date.today()` in the system prompt invalidates the cache daily; `datetime.now()` invalidates it every
  request.
- **Tool order is a literal list**, never sorted at runtime and never assembled by decorator side effects.
  Order changes invalidate the prefix for every user.

---

## 4. Architecture

`backend/src/agent/` mirrors `backend/src/restaurants/` exactly — no `__init__.py` in `agent/` or
`agent/services/`, one in `agent/controllers/`.

```
backend/src/agent/
  models.py              ToolArgs base + per-tool arg models + Proposal envelope
  gateways.py            LlmGateway (ABC), GroqLlmGateway, LlmError
  prompts.py             SYSTEM_PROMPT (module constant, no interpolation)
  schemas.py             pydantic JSON Schema -> OpenAI-compatible strict schema
  registry.py            ToolRegistry — the (uow, user_id) closure
  tools/
    __init__.py          TOOL_CLASSES, PROPOSAL_HANDLERS  (explicit lists)
    find_restaurant.py
    get_my_reviews.py
    get_restaurant_signal.py
    draft_review.py
  services/
    agent_srv.py         AgentService.chat — the loop
    confirm_srv.py       ConfirmService — the ONLY thing that writes
  controllers/
    __init__.py
    agent.py             POST /agent/chat, POST /agent/confirm
```

`LlmGateway` mirrors `GooglePlacesGateway` / `GooglePlacesError`: `try` → `requests.RequestException` → domain
error; `if not response.ok` → domain error; `logger.error` with the body; explicit `timeout`.

Note this is the **first gateway ABC in the codebase** — `GooglePlacesGateway` and `NominatimGateway` are plain
concrete classes and `dependencies.py` annotates them with concrete types. Make `LlmGateway` a real ABC anyway:
the seam is needed for `FakeLlmGateway` in tests, and the free-tier landscape guarantees a provider swap.

Wired in `backend/src/dependencies.py` and nowhere else.

### New settings

`Settings` is `frozen=True` and runs at import. `llm_api_key` **must** default to `""`, not `...` — unlike
`google_api_key` and `mongo_uri`, a missing LLM key must never take down the other 42 endpoints. Guard it in
`dependencies.py`.

```python
    # llm
    llm_base_url: str = Field("https://api.groq.com/openai/v1", description="OpenAI-compatible base URL.")
    llm_api_key: str = Field("", description="Bearer token. Empty disables the agent; must not crash startup.")
    llm_model: str = Field("openai/gpt-oss-120b", description="Model id. Free tiers retire models — config, not code.")
    llm_timeout_seconds: int = Field(45, description="HTTP timeout for one LLM call.")
    llm_max_completion_tokens: int = Field(700, description="Cap on assistant tokens per call.")
    agent_max_iterations: int = Field(5, description="Hard cap on tool-loop iterations per request.")
    agent_tpm_ceiling: int = Field(8000, description="Provider tokens-per-minute limit, for the pre-send estimate.")
```

`render.yaml` gets `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` with `sync: false`, matching the existing five.

### Sync/async

`async def` endpoint + **one** `await asyncio.to_thread(agent.chat, ...)` wrapping the whole loop. This matches
all 42 existing endpoints and — more importantly — never moves a pymongo `ClientSession` between threads.

**Never** split the loop into per-tool `to_thread` hops. `MongoUnitOfWork` stores its session as plain mutable
state read by all 8 repositories through one shared lambda; `ClientSession` is not thread-safe, and the failure
mode is not a clean exception but a transaction that neither commits nor aborts, holding a server-side lock
until timeout.

**Never** wrap the loop in `with uow:`. `transactionLifetimeLimitSeconds` is 60s and not raisable on the free
tier, so a transaction spanning an LLM call is aborted from underneath you and `commit_transaction()` raises
after all the work is done. `AgentService` never opens a transaction; `ConfirmService` owns the only one, and
is **constructed with no `LlmGateway` at all**, so breaking this rule requires adding a constructor parameter —
a reviewable diff rather than a silent regression.

### Loop and error handling

`AgentService.chat` carries `@service` like every other service method; an `LlmError` propagates to the
controller, which maps it to 502 exactly as `search_restaurants` maps `GooglePlacesError`.

Individual **tool** failures must not propagate — that kills the turn and wastes tokens already spent.
`_invoke` is the only place with a bare `except Exception`, and it is deliberately **not** decorated with
`@service` (that decorator re-raises in both branches, so decorating `_invoke` would add a log line and
defeat the purpose). Every tool failure becomes an `is_error` tool result the model can read and retry from.

- **Clause order: `ValidationError` before `ValueError`.** `ValidationError` subclasses `ValueError` in
  pydantic v2; the wrong order silently loses the field-level `details` the model needs to self-correct.
- Append the assistant message to `messages` **verbatim before dispatch**. Reconstructing it drifts
  `tool_calls[].id` and the next request 400s.
- Give **every** requested call exactly one `role: "tool"` reply, including ones that errored. A missing reply
  is a hard 400 from every OpenAI-compatible server.
- Hard iteration cap from `agent_max_iterations`.

---

## 5. Tool surface

Four tools. `user_id` appears in none of them.

```python
class ToolArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

class FindRestaurantArgs(ToolArgs):
    name: str = Field(..., min_length=1, max_length=120)
    city: str | None = Field(None, max_length=80)

class GetMyReviewsArgs(ToolArgs):
    restaurant_id: str | None = Field(None)
    limit: int = Field(5, ge=1, le=5)

class GetRestaurantSignalArgs(ToolArgs):
    restaurant_id: str = Field(...)

class DraftFoodItemArgs(ToolArgs):
    food_name: str = Field(..., min_length=1, max_length=120)
    price: float = Field(..., gt=0.0)          # "12,50" coerced by a mode="before" validator
    rating: float = Field(..., ge=0.0, le=10.0)
    comment: str | None = Field(None, max_length=1500)

class DraftReviewArgs(ToolArgs):
    restaurant_id: str = Field(...)
    cleanliness_rating: float = Field(..., ge=0.0, le=10.0)
    experience_rating: float = Field(..., ge=0.0, le=10.0)
    comment: str | None = Field(None, max_length=1500)
    visited_at: date | None = Field(None)      # ISO 8601 only; heute/gestern coerced
    food_items: list[DraftFoodItemArgs] = Field(default_factory=list, max_length=10)
```

### Returns

Projected **in the tool body**, so the tool decides what leaves the DB boundary — not the LLM.

- `find_restaurant` → `{"matches": [{restaurant_id, name, city, cuisine_type}, … max 5]}`. On zero hits,
  include `"hint": "No known restaurant matches. Ask the user to add it in the app first."` — without that
  hint a small model invents a plausible-looking uuid.
- `get_my_reviews` → `{"food_reviews": [{restaurant_id, food_name, price, rating, comment, visited_at}, … max 5]}`.
  No `user_id`, no `food_review_id`, comments truncated to 200 chars.
- `get_restaurant_signal` → `{restaurant_id, rating_count, avg_rating}`, rounded to 1 decimal.
  **`avg_rating` is `None` when `rating_count < 2`** — with three users, an aggregate of one review *is* one
  identifiable person's rating, and this is a cross-user tool.
- `draft_review` → `{"proposal": {…}, "summary": "Osteria Roma: 9.0/10, 2 dish(es)"}`. Writes nothing.
  Re-checks `restaurants.get(restaurant_id)` and raises `ValueError` if absent, so an invented id becomes a
  retryable `is_error` rather than a bad write.

### Backing

- `find_restaurant` — existing `restaurants.list_all()` + Python matching (exact hits first, then partial,
  capped at 5). **Never auto-resolve a single fuzzy hit into an id** — a wrong id silently writes a review
  against the wrong restaurant. Return `needs_disambiguation` when candidates tie.
- `get_restaurant_signal` — existing `food_reviews.rating_stats([...])`, zero new code.
- `get_my_reviews` — **needs two new repository ports** (see step 3).
- `draft_review` — reads only: `restaurants.get`, plus validation by constructing the real request models.

### The `user_id` guarantee — structural, not a runtime check

```python
class ToolRegistry:
    def __init__(self, uow: UnitOfWork, user_id: str):
        if not user_id:
            raise ValueError("ToolRegistry requires an authenticated user_id.")
        self._tools = {cls.name: cls(uow, user_id) for cls in TOOL_CLASSES}
        self._order = [cls.name for cls in TOOL_CLASSES]
```

`user_id` is a **constructor argument**, bound into each tool instance before any schema is generated. It is
not a field on any `ToolArgs` model, therefore it cannot appear in any schema, therefore the model cannot
express it. Tool bodies read `self._user_id`, never `args`.

Three layers make it airtight:

1. `additionalProperties: false` in the emitted schema tells the model not to send one.
2. `extra="forbid"` on `ToolArgs` makes it a **visible** `ValidationError` when it does anyway. This matters —
   pydantic's default silently *drops* unknown keys, which is safe but invisible, and the log line is wanted.
3. `if not user_id: raise` catches the `None` case, because `None` as a Mongo filter value matches documents
   where the field is absent.

The confirm path has the same property: `ConfirmRequest` carries no `user_id`; `ConfirmService` takes it from
the JWT.

### Schema generation — three fixes, all necessary

`model_json_schema()` on `DraftReviewArgs` emits `{"items": {"$ref": "#/$defs/DraftFoodItemArgs"}}` with a
sibling `$defs`. Many OpenAI-compatible servers — and every constrained-decoding grammar builder — reject
that. `ref_template` does not help; it only renames the pointer. So `schemas.py` does exactly three things:

1. **Inline every `$ref`**, with a depth guard so a self-referential model fails loudly at import time.
2. **Rewrite `required` to every property key.** Strict mode wants all keys present; optionality is carried by
   the `anyOf: [{…}, {"type": "null"}]` that pydantic already emits correctly.
3. **Drop `title` and `default`.** `title` is pure token waste on every request; `default` is rejected by
   strict validators. Removing both shrinks the schema by roughly a third — directly TPM.

---

## 6. Propose / confirm protocol

`kind` is a data field flowing through one generic path, and **both sides dispatch on it**. One endpoint, one
client card component, N kinds.

```python
class Proposal(BaseModel):
    kind: str                # 'restaurant_review' — selects the handler AND the UI card
    proposal_id: str = Field(default_factory=lambda: str(uuid4()))
    summary: str             # one-line card header
    payload: dict            # kind-specific; re-validated server-side on confirm

class ProposalHandler(Protocol):
    kind: str
    request_model: type[BaseModel]   # the SAME model the normal REST endpoint validates
    def __init__(self, uow: UnitOfWork, user_id: str) -> None: ...
    def commit(self, payload: BaseModel, proposal_id: str) -> dict: ...
```

A tool declares intent with one class attribute: `proposes: str | None`. `None` means read-only and `dispatch`
returns `(result, None)`. A non-`None` string is the proposal kind and the polymorphism key.

Registration is an **explicit list**, mirroring `backend/src/restaurants/controllers/__init__.py`:

```python
TOOL_CLASSES      = [FindRestaurant, GetMyReviews, GetRestaurantSignal, DraftReview]
PROPOSAL_HANDLERS = [RestaurantReviewProposalHandler]
```

Not a decorator registry: that would make tool order depend on **import order** — an invisible global an
unrelated import can reorder, silently destroying the cached prefix section 3's budget leans on. As data, the
order is a reviewable line in a diff.

**Adding a future write tool (`mark_visited`, `add_to_wishlist`) is one new module plus two lines** — one entry
in each list. No new endpoint, no change to `ConfirmService`, `ToolRegistry`, or the loop. On the client, one
entry in a `CARDS: Record<string, Component>` map plus one body component, with `if (!Body) return null` so a
backend deploy that adds a kind before the frontend ships degrades instead of white-screening.

### Three re-validation layers on confirm — the server trusts nothing

1. `ConfirmRequest.payload` is typed `dict`, so FastAPI does not pretend to have validated it. `ConfirmService`
   calls `handler.request_model.model_validate(payload)`, re-applying every bound and `extra="forbid"`.
2. The handler builds the **same** `CreateRestaurantReviewRequest` / `CreateFoodReviewRequest` that
   `POST /review` and `POST /review/food` validate.
3. It calls the **same** service methods, so every existing business rule fires: `users.exists(user_id)`, the
   self-coauthorship rejection, `_move_to_visited`, and `reviews.find_authored(...)` — the check that makes it
   impossible to attach a food item to somebody else's review.

If the user edited ratings in the card before confirming, that is ordinary user input, indistinguishable from
the manual form, going through identical validation.

### Idempotency

`proposal_id` is a server-minted `uuid4` and becomes the `review_id` on confirm. With the unique index from
step 1, a double-tap makes the second `insert_one` raise `DuplicateKeyError` → the adapter's existing
`AlreadyExistsError` → the transaction aborts so no food items land either → **HTTP 409, exactly one review.**
Disable the Confirm button on first press too, but the index is the guarantee.

### Two required changes to existing code

- `CreateRestaurantReviewRequest` gains `review_id: str | None = Field(None, ...)`.
- `create_one_restaurant_review` changes `request.model_dump(exclude={"coauthor_ids", "images"})` to add
  `exclude_none=True`, because `RestaurantReview.review_id` is typed `str` with a `default_factory` and would
  reject an explicit `None`. Safe: every other optional field on `RestaurantReview` already defaults to `None`,
  so `POST /review` stays byte-identical.

---

## 7. German

Locale enters via a `language: Literal["de","en"]` **body field**, not an `Accept-Language` header — only this
endpoint cares, pydantic validates it for free, and the frontend already holds it in `LanguageContext`. Do not
thread React context into `apiClient` for one endpoint.

Three layers, each doing what it is good at:

1. **System prompt** — relative-date resolution (the only place `"letzten Freitag"` can be resolved, since it
   needs today's date and weekday reasoning), reply language, and the ISO-8601 output contract.
2. **Schema field descriptions** — the format contract stated where the model is looking when it fills the
   field, and it survives into the constrained-decoding grammar on servers that build one.
3. **Pydantic `mode="before"` validators** — the net. A free model *will* emit `"12,50"` regardless of
   instructions. Verified working: `'12,50'`→12.5, `'12.50'`→12.5, `'1.234,50'`→1234.5, `'9,90 €'`→9.9,
   `'italienisch'`→`italian`, `'asiatisch'`→`asian`, `'Pizzeria'`→`others`.

Cuisine words **map-then-fall-back to `"others"`** rather than raising. `CUISINE_TYPES` is English-only and
`_validate_cuisine_type` raises, which would 400 a whole confirm over a cosmetic field that already defaults
to `"others"`.

Relative dates get **no parsing library** and no hand-rolled German weekday arithmetic (`"letzten Freitag"` on
a Friday is genuinely ambiguous). `heute`/`gestern` are hardcoded as the high-frequency exceptions; anything
else non-ISO raises `ValidationError` → `is_error` → the model reads "Input should be a valid date" and retries
in ISO. One extra round trip in the rare case, and that is exactly what the error path is for.

**All coercion lives in `backend/src/agent/models.py`, never in `backend/src/restaurants/models.py`.** Those
request models are the public REST contract for the existing frontend forms; loosening `price` there to accept
`"12,50"` would silently change `POST /review/food` for all callers. The agent gets a lenient front door; the
domain keeps its strict one. Because confirm re-validates through the strict models, coerced values still have
to survive the strict layer.

---

## 8. Frontend

**Entry point: a global FAB, not a fifth tab.** Rendered as a **sibling of `<Tabs>`** in
`frontend/app/(tabs)/_layout.tsx` — `<View style={{flex:1}}><Tabs …/><AskFab/></View>` — pushing a `/chat`
route. Plus a contextual "Ask about this place" pill on `RestaurantDetailScreen` pushing the same route with a
`restaurant_id` param. One screen, two launchers, tab bar untouched.

**The slot is free.** `RestaurantsScreen` binds `openAddModal` three times — headerRight (line 345), empty
state (388), and the FAB (472). The FAB is a pure duplicate; deleting it loses no functionality, honours
Material's one-FAB-per-screen rule, and hands the best thumb position to the primary entry point for the new
feature. The header Plus keeps the add flow where it already is.

Because the FAB is a sibling of the navigator rather than a child of a scene, its `bottom` is measured from the
full container — offset by `useBottomTabBarHeight()` (from `@react-navigation/bottom-tabs`, already a
dependency) plus 16, and copy the existing 56×56 / `borderRadius: 28` block from
`RestaurantsScreen.styles.ts`. `FocusGuard` keeps every tab mounted, so the FAB never unmounts or flickers.
**Check the collision at 360px width:** `MapScreen`'s legend is absolutely positioned bottom-centre at
`zIndex: 1000`.

**Use `transparentModal`, not `modal`.** Expo Router's docs are explicit that on web, screens with
`presentation: 'modal'` or `'formSheet'` render as regular stack routes — so plain `modal` would be a full page
navigation on Vercel and iOS Safari, unlike all seven existing sheets. The root Stack's `contentStyle` is
already `transparent`. So: `presentation: Platform.OS === 'web' ? 'transparentModal' : 'formSheet'`.

The route buys a URL, which makes the iOS Safari back gesture close the chat instead of leaving the app, makes
"ask about this place" deep-linkable, and reliably unwinds the body-overflow lock. A bare RN `<Modal>` gets
none of that (`onRequestClose` is Android-only). Add `app/chat.tsx` as a one-line re-export matching every
other route file.

**Answers render as typed blocks, not markdown** — so no markdown renderer enters the bundle, and existing
components are reused:

| Block `kind` | Renders as |
|---|---|
| `text` | `ThemedText` |
| `restaurant_ref` | `RestaurantCard` with `onDelete`/`onEditComment` omitted (degrades to read-only; its root `Pressable` already navigates to `/restaurant/[id]`) |
| `review_ref` | `ReviewCard` using its existing `restaurantContext` prop |
| `proposal` | `ProposalCard` (below) |

Unknown `kind` → render nothing, never crash. Extract the `ratingColor` helper rather than adding a sixth copy
— it is already duplicated across `RestaurantCard`, `ReviewCard`, `MapScreen`, `RestaurantDetailScreen` and
`RatingSlider`.

Design the wire format as an **ordered array of typed blocks** so the batched and (later) streamed shapes are
identical.

### The proposal card is a correctness control

A valid-but-wrong `restaurant_id` passes every automated check. This card is the only thing that catches it.

- Dashed `colors.warning` border and an explicit "Draft — not saved yet" pill. **Do not** reuse the olive
  `ownCard` border, which in this app already means "your saved review".
- **Lead with restaurant NAME + street + city, never the uuid.**
- Disclose the cascade in words: creating a review moves the author *and every coauthor* to visited and
  deletes their wishlist entries.
- Mark any field the model inferred rather than heard (most often `visited_at` defaulting to today) with an
  "assumed" pill.
- Disable Save in-flight and permanently after success.
- `[Edit]` opens the existing `AddReviewModal`. **Note:** its `ReviewInitialValues` declares
  `cleanliness_rating` and `experience_rating` as **required** `number`, and `coauthors` as
  `{user_id, first_name, avatar?}[]` rather than `string[]` — so this is three type changes plus a
  "can't save yet" state, not a drop-in reuse.

### iOS Safari keyboard

Extend, don't fork, `hooks/useWebModalEffects.ts`. It already locks body overflow and computes
`inset = window.innerHeight - vv.height - vv.offsetTop` from `visualViewport` resize *and* scroll, but exposes
only `{sheetStyle: {paddingBottom}}` — enough to lift a form, not enough to let a transcript scroll under a
docked composer. Return `keyboardInset` and `viewportHeight` too, set sheet height from `vv.height` (fallback
`100dvh`, never `100vh`), and keep the composer as the last flex child with the transcript at `flex: 1`.

**Never `position: fixed`** — iOS Safari does not resize the layout viewport for the keyboard,
`interactive-widget=resizes-content` is unimplemented in Safari, and on iOS 26 `visualViewport` values do not
reliably revert after dismissal. Clamp the inset to 0 and re-read on blur. Drive scroll-to-bottom from the
resize handler, not the input's focus event. Keep `+html.tsx`'s `font-size: 16px !important` rule intact — the
composer cannot be styled smaller.

Every new string needs an entry in **both** `i18n/en.ts` and `i18n/de.ts`, or it renders `undefined` with no
type error.

---

## 9. Build order

Each step ships on its own. **Step 1 is worth doing even if the agent is never built.**

### Step 1 — Data-integrity hardening. No agent code. Ship first.

1. Run the replica-set check and the duplicate scan (§10) against **both** dev and prod database names.
   `_ensure_indexes` runs against whichever DB the process booted with, so a duplicate hiding in the other one
   is a live landmine.
2. De-duplicate anything the scan finds.
3. New one-off script `backend/scripts/ensure_indexes.py` creating, with `partialFilterExpression` where keys
   can be absent: `reviews.review_id` (unique), `food_reviews.food_review_id` (unique),
   `visited(user_id, restaurant_id)` (unique). Run deliberately against dev, then prod. **Then** add the same
   three to `_ensure_indexes`.
4. Wrap `_ensure_indexes()` in `try/except Exception` + `logger.error`. A failing index must never brick a
   deploy.
5. **Fix the connection leak.** `initialize()` assigns a fresh `MongoClient` to `self._client` without closing
   the previous one, and `get_mongo_collection`'s recovery path calls `initialize()` again on *any* access
   failure — each recovery leaks a pool of up to 100 connections against M0's 500 cap, and re-runs
   `_ensure_indexes` on the request path. Close the old client first.
6. `max_image_bytes: 12_000_000 → 600_000`. At 12 MB per image, 42 images fills the whole 512 MB cluster.

### Step 2 — Test scaffolding. Currently zero.

No `pytest`, no `httpx`, no `tests/`, no CI.

- `backend/tests/conftest.py` with a hand-written `FakeUnitOfWork` (~80 lines of dict-backed repos) and a
  `TestClient` fixture overriding `get_unit_of_work` and `get_current_user`. `Settings` marks `mongo_uri` and
  `google_api_key` required and the lifespan calls `initialize_mongo_client()`, so `monkeypatch.setenv` before
  importing `src.config`, and do not enter `TestClient` as a context manager in fake-uow tests.
- **Not `mongomock`** — it does not implement sessions or transactions, so `with uow:` would silently not be a
  transaction and the atomicity test would pass vacuously. Worse than no test. Use a real replica set behind a
  `mongo` marker for that one test.
- **Not `pytest-asyncio`** (services are plain sync), **not `respx`** (the `LlmGateway` ABC is the seam).
- Local dev Mongo: add a `mongo:7 --replSet rs0` service to `docker-compose.yml` with a one-shot `rs.initiate`.
  It currently has only the `app` service pointed at Atlas, so today the write path would be developed against
  production.
- A 12-line GitHub Actions workflow running `pytest -m 'not mongo'`. Add the Mongo `services:` block second;
  do not let it delay having any CI at all.

### Step 3 — The repository gap. Verified blocker.

`get_my_reviews` **cannot be built today.** `WishlistRepository` and `VisitedRepository` have `list_by_user`;
`ReviewRepository` and `FoodReviewRepository` do not.

Add `list_by_user(self, user_id: str, limit: int = 25) -> list[dict]` as an abstract method on both, plus the
two Mongo implementations: `{"$or": [{"user_id": …}, {"coauthor_ids": …}]}` for reviews (they have coauthors),
plain `user_id` for food reviews, `{"_id": 0}` projection matching every other read in that file,
`.sort("created_at", -1).limit(limit)`.

Do **not** fake it by looping `list_reviewed_restaurant_ids` → `list_for_restaurant` and filtering in Python.
That is N queries and it pulls *other users'* rows into process memory — precisely the leak this tool exists to
prevent. The `limit` is not optional: an unbounded list goes straight into a prompt.

### Step 4 — Provider smoke test. 30 minutes, before any harness code.

A throwaway script, not an endpoint.

1. Sign up at `console.groq.com`, mint a key at `/keys`, and **confirm no card is demanded** (see §11).
2. Enable ZDR at `/settings/data-controls`.
3. Verify in one script: tools round-trip on `gpt-oss-120b`; a tool result **without** a `name` key is
   accepted; `reasoning_effort: "low"` + `include_reasoning: false` is accepted; the real enforced limits at
   `console.groq.com/settings/limits` match the docs (some organizations get separate ITPM/OTPM limits, which
   would change the turn budget); and German fixtures produce correctly-slotted `food_items` — umlauts,
   compound dish names, `"ging so"`, `"top"`, `"nicht mein Ding"`, `"12,50"`.
4. Log `usage` and the `x-ratelimit-remaining-tokens` header on every call, so the budget rests on real numbers
   rather than the estimates in §3.

### Step 5 — Read-only agent. Shippable and useful.

Three read tools, the loop, `POST /agent/chat`. `@limiter.limit("10/day")` — the existing
`_get_user_id_or_ip` key function already reads the JWT `user_id`, so the daily budget enforces itself. Ships
as "ask about your reviews". Writes nothing, so nothing can go wrong in the database.

### Step 6 — `draft_review` + the propose/confirm path.

The tool, the `Proposal` envelope, `POST /agent/confirm`, `RestaurantReviewProposalHandler`, and the generic
frontend `ProposalCard`. Plus the two existing-code changes in §6.

### Step 7 — Harden.

Pre-send token estimate, `retry-after` backoff (2 attempts max), the `asyncio.Semaphore(1)`, the iteration-cap
test, `logger.info` of every proposal (loguru is wired and the Dockerfile already creates `/app/logs`), and a
graceful "assistant unavailable" state so a dead free tier degrades instead of breaking the app.

### The five tests that are security controls

1. `test_no_tool_schema_mentions_user_id` — asserts `"user_id" not in json.dumps(schemas)` **and
   `"u-42" not in` it**. The second assertion catches a future tool that interpolates the id into its own
   description and thereby into the prompt.
2. `test_get_my_reviews_cannot_be_redirected` — seed two users; `dispatch("get_my_reviews", '{"user_id":
   "u-victim"}')` raises `extra_forbidden`, and `dispatch("get_my_reviews", "{}")` returns only the caller's.
3. `test_confirm_uses_the_jwt_user_id_not_the_payload` — highest-value test in the suite, because
   `/agent/confirm` is the only endpoint that writes.
4. `test_bad_llm_args_become_an_error_tool_result_not_a_500` — script `cleanliness_rating: 99`; assert
   `is_error`, `details[0]["loc"] == ["cleanliness_rating"]`, `proposals == []`, and that `tool_call_id`
   round-tripped.
5. `test_double_confirm_creates_one_review_and_returns_409` — `@pytest.mark.mongo`, real replica set. Assert
   `food_reviews.count_documents({"review_id": "p-fixed"}) == 1`, not 2 — that proves the transaction aborted
   rather than half-applying.

Plus `test_iteration_cap`: script 20 consecutive tool calls, assert exactly `agent_max_iterations` LLM calls
and a clean fallback reply. That test stands between a prompt-loop bug and an exhausted free-tier quota.
`FakeLlmGateway` should raise if called more often than scripted, so a broken stop condition fails the test
instead of hanging it.

---

## 10. Verification commands

### Replica set / transactions

```bash
cd backend && set -a && . ./.env && set +a && \
.venv/bin/python -c 'import os
from pymongo import MongoClient
c = MongoClient(os.environ["MONGO_URI"], serverSelectionTimeoutMS=8000)
h = c.admin.command("hello")
print("topology:", c.topology_description.topology_type_name,
      "| setName:", h.get("setName"), "| hosts:", h.get("hosts"),
      "| version:", c.server_info()["version"])'
```

Expect `ReplicaSetWithPrimary`, a non-null `setName` like `atlas-xxxxxx-shard-0`, and three hosts.

**Do not use `rs.status()`.** `replSetGetStatus` is blocked on Atlas free clusters and returns a permissions
error that looks exactly like a standalone-cluster failure. Use `hello`.

**Prove atomicity, not just absence of error.** The only existing transaction is `with self._uow:` at
`backend/src/restaurants/services/visited_srv.py:53`, reachable via `POST /visited/from-wishlist`. Call it: 200
means sessions and transactions are live. Then temporarily add `raise RuntimeError("txn probe")` as the last
statement inside that `with` block, call it again, and confirm the visited entry did **not** persist *and* the
wishlist entry is **still there**. If they moved independently, the writes are not joining one transaction —
which points at the shared `session_provider` lambda in `MongoUnitOfWork`, not at the cluster. That second test
is what distinguishes "transactions work" from "my UoW wiring works", and only the latter is what the atomic
review write depends on.

### Duplicate scan before adding unique indexes

Run against **both** database names — dev (`.env`) and prod (Render dashboard; `sync: false`, so only the owner
can read it). Group by the index keys, count groups with `n > 1`, and separately count documents where a key is
absent or `null`:

- `reviews` on `["review_id"]`
- `food_reviews` on `["food_review_id"]`
- `visited` on `["user_id", "restaurant_id"]`

Also print `db.command("dbStats")["dataSize"]` so current storage against the 512 MB cap is known.

---

## 11. Risks

Ranked by expected damage.

1. **The 512 MB cluster fills with base64 images and all writes stop.** Nothing to do with the agent; the most
   likely way this app dies. 12 MB per image inline in documents, ~42 images total, shared with dev.
   *Mitigation:* step 1 cuts `max_image_bytes` to 600,000 and prints current `dataSize`. The agent path never
   touches images. Move dev to a second free cluster in a second Atlas project.
2. **A unique-index build fails and bricks the deploy — with a delay.** `_ensure_indexes` runs unprotected
   before `yield`; a `DuplicateKeyError` exits the process, `/health` never answers, the deploy fails, and the
   old instance keeps serving until the free plan spins it down hours later. Also watch
   `IndexOptionsConflict` (85) and `IndexKeySpecsConflict` (86) — changing options on an existing index name
   raises at startup the same way. *Mitigation:* step 1, before anything else.
3. **Groq demands a credit card at signup.** **UNVERIFIED.** Groq states only the inverse ("to upgrade from the
   Free tier to the Developer tier, you'll need to provide a valid payment method"); no Groq-owned page affirms
   the free tier needs none, and `groq.com/pricing` contains no free-tier language at all. *Mitigation:* this
   is step 4, before any harness code. If a card is demanded, fall back to Cloudflare Workers AI after one curl
   confirming `tools` traverse `/ai/v1/chat/completions` on `gpt-oss-120b`.
4. **Model churn.** Groq retired `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` on 16 August 2026; Kimi
   K2 in April; `qwen3-32b` and Llama 4 Scout in July. A retired id returns **404**, not a graceful fallback.
   *Mitigation:* model id in `settings`; a documented fallback chain of two Production models before the
   Preview one; treat a 404 from the completions endpoint as "my model was retired" and alert. Mildly
   reassuring: `/docs/deprecations` currently lists no pending shutdowns, Production models are promised "a
   clear migration path", and the August retirements were announced ~60 days ahead.
5. **Free tiers die.** Demonstrated twice this year: GitHub Models retired 30 July 2026; Cerebras' free tier
   became a card-gated 30-day trial. Groq's Services Agreement §5.1 reserves it explicitly — services "may be
   designated as fee-free … **for a limited time**". *Mitigation:* the `LlmGateway` ABC plus three settings
   makes a provider swap a config change and a redeploy. The agent must degrade to a clear "assistant
   unavailable" state — it is one endpoint out of 43.
6. **TPM 429s under concurrency.** One turn is 65% of the 8,000 TPM window; two users in the same minute is
   130%. Limits are per **organization**, not per user. *Mitigation:* `asyncio.Semaphore(1)`, `retry-after`
   backoff, and the client-side pre-send estimate that returns a permanent error instead of retrying something
   that can never fit.
7. **`get_my_reviews` returns an unbounded payload.** A user with 40 reviews and nested food items blows the
   window single-handedly, producing a failure that looks random but tracks *which user is asking*.
   *Mitigation:* cap in the repository layer (5 reviews, 200-char truncation, projected keys), never in the
   prompt. The model will not ask for fewer.
8. **German tool-slotting is wrong in ways German comprehension is not.** The failure to watch for is not
   misunderstanding the language but mis-slotting German dish names and colloquial ratings into the nested
   `food_items` array. No Groq page enumerates German for any model. *Mitigation:* the three layers in §7, plus
   real German fixtures in step 4 — before the harness, not after.
9. **Session or transaction misuse.** See §4. *Mitigation is structural, not disciplinary:* one `to_thread` hop
   for the whole loop; `AgentService` never opens `with uow:`; `ConfirmService` is constructed with no
   `LlmGateway` at all.
10. **Prompt-cache invalidation quietly doubles the bill.** `date.today()` in the system prompt invalidates
    daily; `datetime.now()` every request; a reordered tools array invalidates it too. No error, just a budget
    that stops working. *Mitigation:* system prompt is a constant, date and language ride in the user message,
    tool order is an explicit list.
11. **Aggregate privacy at three users.** `get_restaurant_signal` with `rating_count == 1` *is* one
    identifiable person's rating, exposed cross-user. *Mitigation:* suppress `avg_rating` below
    `rating_count == 2`. Decided, not flagged.
12. **Connection-pool exhaustion.** See step 1, item 5.
13. **Prompt injection via review comments.** Comments are up to 1,500 chars of arbitrary user text that read
    tools replay into model context. *The primary control is capability removal, not string sanitisation:* no
    delete tool, no update tool, no restaurant-creation tool, and no model-initiated write. The worst outcome
    of a successful injection is a proposal the user declines. Frame tool results as
    `{"kind": "data", "records": [...]}` JSON rather than prose, and keep operator instructions in the
    top-level system message — never inside a user or tool turn, which is exactly the channel a review comment
    can forge.
14. **A valid-but-wrong `restaurant_id` defeats every automated layer.** Only the proposal card catches it,
    which makes that card's visual design a correctness control. *Mitigation:* lead with name + street + city;
    `find_restaurant` returns `needs_disambiguation` rather than guessing when candidates tie (two "Mangal"
    locations in one city is the realistic failure).
15. **A wrong confirmed review is not fully undoable.** `delete_review` removes the review, its images and its
    food reviews — it does **not** remove the visited entry or restore the deleted wishlist entry, for the
    author or for coauthors. *Mitigation:* omit `coauthor_ids` from the agent path in v1, which removes the
    cross-user cascade entirely. Coauthors stay a two-tap picker in the existing form.

---

## 12. Deliberately cut

Not "later" — cut, for a 3-user app.

- Any agent framework.
- A server-side `drafts` collection: no 9th repository, no 9th collection, no `UnitOfWork` change (it hardcodes
  8), no TTL index, no orphan cleanup, no draft-ownership authorization check. ~200 lines and a whole aggregate
  that never gets written. Proposals live in the client.
- Streaming responses. SSE plumbing to save 3 seconds for 3 people.
- Embeddings, vector search, RAG, any memory store. `list_all()` plus Python matching fits in a prompt at this
  corpus size.
- Structured Outputs / `response_format: json_schema`. gpt-oss supports it, but "Streaming and tool use are not
  currently supported with Structured Outputs", so it cannot combine with `tools` and would cost a second
  tools-free extraction call.
- An eval harness. Six German fixtures in a test file, run by hand.
- Runtime multi-provider failover. The gateway ABC plus three settings means swapping is a config change.
  Automatic failover is a second code path that will be wrong when it is needed.
- `tiktoken` or any token counter. `len(json.dumps(x)) // 3` is accurate enough for a ceiling check.
- `resolve_friend` / `coauthor_ids` in the agent path (see risk 15).
- `search_new_places` as a tool. A system-prompt sentence — "if the restaurant is not in the app, tell the user
  to add it first" — does the job without spending a billed Google Places call inside a chat turn.
- A `map` block in the transcript. A Leaflet WebView inside a scrolling chat on iOS Safari is the
  highest-effort, lowest-value block.
- A `tool_call` disclosure row in the UI. `logger.info` covers the useful part.
- Images anywhere in the agent path, and vision dish/price extraction. Base64 blobs never round-trip an LLM
  turn; photos are added by editing the review afterwards. A hallucinated price corrupts the price statistics
  silently — unlike a wrong rating, nobody spots it.
- Cross-device draft confirmation, and an audit collection of rejected proposals.
- Conversation history beyond 20 messages.
- Wiring the Hugging Face token at all on day one. Keep it as a third-string fallback. One caveat if it is ever
  wired: HF's monthly credits do **not** apply when bringing your own provider key, so pasting a Groq key into
  HF settings bills the provider directly instead.

---

## 13. Open items

| # | Item | Owner action |
|---|---|---|
| 1 | Groq free tier requires no credit card — **UNVERIFIED** | Step 4: check at signup before writing harness code |
| 2 | Real enforced rate limits may include separate ITPM/OTPM | Step 4: read `console.groq.com/settings/limits` |
| 3 | German tool-slotting quality on `gpt-oss-120b` | Step 4: run the German fixtures |
| 4 | Prod `MONGO_DB` value (`sync: false` in render.yaml) | Owner reads it from the Render dashboard for the duplicate scan |
| 5 | Whether Cloudflare's OpenAI-compatible path carries `tools` | One curl, only if risk 3 fires |
| 6 | Repeat-visit rate — how often a user reviews the same restaurant twice | Compare `list_reviewed_restaurant_ids` count against total review count. Decides whether an `attach_to_existing` mode is worth building, which is the main escape from missing required ratings on a repeat visit |
| 7 | iOS Safari used as installed PWA or browser tab | Affects the docked-composer strategy; the keyboard bug is worse in standalone mode |
| 8 | Whether Render's edge proxy buffers a long-lived streaming response | Only matters if streaming is ever revisited |

---

## 14. Deferred use cases

> **Update 2026-09-07:** v1 (steps 1–7) has shipped. Concrete tool sketches for the
> items below now live in [agent-roadmap.md](agent-roadmap.md) — extend that file, not
> this list.

Researched and worth building later, in rough value order. None are in the v1 scope above.

1. **Decision support** — "I'm with Anna near Ehrenfeld, where do we go" — combining both users' history,
   wishlist, location and time. Highest-frequency real intent; only answerable conversationally.
2. **Spend and price intelligence** — per-dish prices are already captured, which almost no competing app has.
   "What did I spend eating out this year", "my döner went from €5.50 to €7.20 since 2023".
3. **Taste profile** — cuisine distribution, whether the user grades harder than their friends, most-repeated
   dish, places rated 9 and never revisited.
4. **Wishlist triage** — "I have 40 saved places, which one tonight" filtered by near-me and mood.
5. **Correction** — "I typed the wrong price on that ramen". Chat is a better edit surface for old data than
   navigating back through screens. Needs an `update` tool, which is deliberately absent from v1.
6. **Comparison** — "Mangal or Bruder for kebab" as a two-column card with per-dish breakdowns.
7. **Proactive nudges** — "you're 200m from a place on your wishlist". Uses the same machinery and is not chat
   at all, which is often the better answer.

Explicitly not worth building: trip itinerary planning (degrades into a generic LLM travel answer once it
leaves your data), group consensus across many friends (consent modelling gets hairy, low frequency), and
anything admin/dedupe (build it as a button).
