# Conversational Agent — Tool Roadmap

**Status of v1 (2026-09-07): shipped.** Read tools (`find_restaurant`, `get_my_reviews`
with dish search, `get_restaurant_signal`), the propose/confirm write path
(`draft_review` → card → `POST /agent/confirm`), German dictation (Groq Whisper), the
chat UI with proposal cards and the info panel, and the §7 hardening (pre-send budget
check, 429 backoff, turn semaphore). See `agent-architecture.md` for the design that got
us here; this file is the parking lot for what comes next.

**The extension pattern, once, so nobody re-derives it:** a new read tool is one module
in `backend/src/agent/tools/` plus one entry in `TOOL_CLASSES`. A new *write* is that
plus a `ProposalHandler` (same module) and one entry in `PROPOSAL_HANDLERS` — no new
endpoint, no `ConfirmService` change, no loop change. On the client, a new card is one
`kind` handled in `ChatScreen`'s block renderer (unknown kinds already render as
nothing, so backend-first deploys are safe). Every added tool schema costs prompt
tokens on every request (§3), so tools must earn their seat — prefer extending an
existing tool's arguments (as `food_query` did) over adding a sibling.

---

## Next up, in rough value order

### 1. `update_review` — correction via chat
"I typed the wrong price on that ramen." Chat is a better edit surface for old data
than navigating back through screens; today the agent must refuse.
- New proposal kind `review_update`; the tool finds the target via
  `get_my_reviews`/`find_authored`, drafts a diff, the handler calls the existing
  `update_restaurant_review` / `update_food_review` services (ownership rules fire
  for free).
- The card must show **old → new** per field, not just the new state — the human is
  confirming a *change*.
- Deliberately absent from v1 (risk 13: no model-initiated mutation of existing data);
  the propose/confirm gate is what makes it acceptable now.

### 2. `mark_visited` / `add_to_wishlist`
The plan's own worked example of a cheap write: "we're going to Mangal on Friday" →
wishlist proposal with the comment field carrying the plan. One module + two list
entries each; handlers wrap the existing wishlist/visited services. Low effort,
high conversational frequency ("merk dir das mal").

### 3. `get_my_spending` — spend & price intelligence
Per-dish prices are already captured — almost no competing app has this.
"What did I spend eating out this year?", "my döner went from €5.50 to €7.20".
- Read tool over `food_reviews.list_by_user` with a date-range argument; return
  compact aggregates (`total`, `by_month`, `by_restaurant` top-N), never raw rows —
  a year of rows would blow the §3 result budget.
- Needs one new repository aggregation (sum/group by month) — same shape as
  `rating_stats`.

### 4. `get_my_wishlist` — wishlist triage
"I have 40 saved places, which one tonight?" Read tool over the existing
`wishlist.list_by_user`, joined with restaurant names/tags/cities like
`get_my_reviews` does. Pairs naturally with the `restaurant_id` context param the
chat already carries. Location-aware ranking ("near me") only makes sense once the
client sends coordinates — keep that an optional argument from day one.

### 5. Taste profile
"Do I grade harder than my friends?", "my most-repeated dish". Mostly derivable from
`get_my_reviews` + `get_restaurant_signal` already; a dedicated
`get_my_taste_profile` returning tag distribution, rating mean/spread, and repeat
counts saves 2-3 tool round-trips (= real TPM money). Build only if the multi-call
version proves too slow in practice.

### 6. Comparison cards
"Mangal or Bruder for kebab?" The model can already fetch both signals; the win is a
`comparison` **block kind** rendering two columns with per-dish breakdowns. Frontend
work only — no new tool.

### 7. Richer transcript blocks: `restaurant_ref` / `review_ref`
§8's original table: answers that mention a known restaurant/review render the
existing `RestaurantCard`/`ReviewCard` (read-only) instead of plain text, making
answers tappable (navigate to the detail screen). Requires the model (or app code)
to tag ids in answers — app-side matching of ids already present in tool results is
the cheap, hallucination-proof route.

### 8. Native dictation
The mic is web-only (MediaRecorder). Expo native needs `expo-av` recording to a file
and the same `/agent/transcribe` upload. Decide when someone actually uses the
native build — the PWA covers today's users.

## Explicitly not planned (unchanged from the architecture doc)

Trip planning, group consensus across many friends, admin/dedupe via chat (build the
restaurant-duplicate cleanup as a button — the dev and prod data both contain literal
duplicates like two "Feinripp & Gold" at the same address, and dedupe is a batch job,
not a conversation), delete via chat (a wrong confirmed delete is not undoable enough),
and coauthors in the agent path (risk 15's cross-user cascade).
