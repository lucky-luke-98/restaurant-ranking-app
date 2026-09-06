"""Step 4 of docs/agent-architecture.md: the Groq provider smoke test.

A throwaway verification script, not an endpoint. Verifies, against the real API,
every assumption the agent harness will be built on:

  1. `openai/gpt-oss-120b` is served and tools round-trip on it;
  2. a tool-result message WITHOUT a `name` key is accepted (the /docs/tool-use
     example is wrong; `messages[].name` is a documented 400);
  3. `reasoning_effort: "low"` + `include_reasoning: false` are accepted;
  4. German fixtures slot correctly into a nested `food_items` array — umlauts,
     compound dish names, colloquial ratings ("top", "ging so", "nicht mein Ding"),
     comma decimals ("12,50"), and relative dates ("gestern") against [today=...];
  5. `usage` and the `x-ratelimit-*` headers are logged on every call, so the §3
     token budget rests on real numbers.

Needs LLM_API_KEY in backend/.env (or the environment). Run from backend/:

    ./.venv/bin/python -m scripts.groq_smoke_test
"""

import json
import os
import sys
from datetime import date

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
MODEL = os.environ.get("LLM_MODEL", "openai/gpt-oss-120b")
API_KEY = os.environ.get("LLM_API_KEY", "")

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
RATELIMIT_HEADERS = (
    "x-ratelimit-limit-tokens", "x-ratelimit-remaining-tokens",
    "x-ratelimit-limit-requests", "x-ratelimit-remaining-requests",
)

FIND_RESTAURANT_TOOL = {
    "type": "function",
    "function": {
        "name": "find_restaurant",
        "description": "Find a known restaurant by name (and optional city).",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "city": {"type": ["string", "null"]},
            },
            "required": ["name", "city"],
            "additionalProperties": False,
        },
    },
}

DRAFT_REVIEW_TOOL = {
    "type": "function",
    "function": {
        "name": "draft_review",
        "description": "Draft (not save) a restaurant review from what the user reported.",
        "parameters": {
            "type": "object",
            "properties": {
                "restaurant_id": {"type": "string"},
                "cleanliness_rating": {"type": "number", "description": "0-10"},
                "experience_rating": {"type": "number", "description": "0-10"},
                "comment": {"type": ["string", "null"]},
                "visited_at": {
                    "type": ["string", "null"],
                    "description": "ISO 8601 date (YYYY-MM-DD) or null.",
                },
                "food_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "food_name": {"type": "string"},
                            "price": {"type": "number", "description": "Price in EUR as a number, e.g. 12.5"},
                            "rating": {"type": "number", "description": "0-10; map colloquial judgments sensibly"},
                            "comment": {"type": ["string", "null"]},
                        },
                        "required": ["food_name", "price", "rating", "comment"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": [
                "restaurant_id", "cleanliness_rating", "experience_rating",
                "comment", "visited_at", "food_items",
            ],
            "additionalProperties": False,
        },
    },
}

SYSTEM_PROMPT = (
    "Du bist der Assistent einer Restaurant-Bewertungs-App. Wenn der Nutzer von einem "
    "Restaurantbesuch mit Gerichten berichtet, rufe draft_review mit allen genannten "
    "Gerichten als food_items auf. Preise als Zahl (12,50 -> 12.5). Umgangssprachliche "
    "Urteile auf eine 0-10-Skala abbilden. Relative Daten (heute/gestern) anhand von "
    "[today=...] in ISO 8601 auflösen. Antworte in der Sprache des Nutzers."
)

CHECKS: list[tuple[str, bool, str]] = []


def check(name: str, passed: bool, detail: str = "") -> None:
    CHECKS.append((name, passed, detail))
    print(f"  {'PASS' if passed else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))


def call(messages: list[dict], tools: list[dict] | None, label: str) -> dict | None:
    body = {
        "model": MODEL,
        "messages": messages,
        "tool_choice": "auto" if tools else "none",
        "parallel_tool_calls": False,
        "reasoning_effort": "low",
        "include_reasoning": False,
        "temperature": 0.1,
        "max_completion_tokens": 700,
        "n": 1,
    }
    if tools:
        body["tools"] = tools
    response = requests.post(
        f"{BASE_URL}/chat/completions", headers=HEADERS, json=body, timeout=45
    )
    limits = {h: response.headers.get(h) for h in RATELIMIT_HEADERS if response.headers.get(h)}
    if not response.ok:
        check(label, False, f"HTTP {response.status_code}: {response.text[:300]}")
        return None
    data = response.json()
    usage = data.get("usage", {})
    print(f"    [{label}] usage: in={usage.get('prompt_tokens')} out={usage.get('completion_tokens')} "
          f"total={usage.get('total_tokens')} | {limits}")
    return data


def extract_tool_call(data: dict, expected_tool: str, label: str) -> dict | None:
    message = data["choices"][0]["message"]
    calls = message.get("tool_calls") or []
    if not calls or calls[0]["function"]["name"] != expected_tool:
        check(label, False, f"expected a {expected_tool} call, got: "
                            f"{[c['function']['name'] for c in calls] or message.get('content', '')[:150]}")
        return None
    try:
        args = json.loads(calls[0]["function"]["arguments"])
    except json.JSONDecodeError as exc:
        check(label, False, f"arguments are not valid JSON: {exc}")
        return None
    check(label, True)
    return {"message": message, "call": calls[0], "args": args}


def phase_models() -> None:
    print("\n== models endpoint ==")
    response = requests.get(f"{BASE_URL}/models", headers=HEADERS, timeout=45)
    if not response.ok:
        check("models endpoint reachable", False, f"HTTP {response.status_code}: {response.text[:200]}")
        return
    ids = {m["id"] for m in response.json().get("data", [])}
    check("models endpoint reachable", True, f"{len(ids)} models served")
    check(f"primary model '{MODEL}' is served", MODEL in ids)
    for fallback in ("openai/gpt-oss-20b",):
        check(f"fallback '{fallback}' is served", fallback in ids)


def phase_tool_roundtrip() -> None:
    print("\n== tool round-trip (find_restaurant), tool result WITHOUT name key ==")
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "Finde bitte das Restaurant Osteria Roma in Köln."},
    ]
    data = call(messages, [FIND_RESTAURANT_TOOL], "call 1: expect tool call")
    if data is None:
        return
    result = extract_tool_call(data, "find_restaurant", "model emits find_restaurant")
    if result is None:
        return

    # Append the assistant message VERBATIM, then the tool result with exactly
    # role/tool_call_id/content — no `name` key (documented 400 on /docs/openai).
    messages.append(result["message"])
    messages.append({
        "role": "tool",
        "tool_call_id": result["call"]["id"],
        "content": json.dumps(
            {"matches": [{"restaurant_id": "r-123", "name": "Osteria Roma",
                          "city": "Köln", "tags": ["italian"]}]},
            ensure_ascii=False,
        ),
    })
    data = call(messages, [FIND_RESTAURANT_TOOL], "call 2: tool result accepted (no name key)")
    if data is None:
        return
    content = data["choices"][0]["message"].get("content") or ""
    check("model produces a final text answer", bool(content.strip()), content[:120])


GERMAN_FIXTURES = [
    {
        "label": "umlauts + comma decimals + 'top' / 'ging so'",
        "message": (
            "Wir waren gestern in der Osteria Roma (restaurant_id: r-123). Ich hatte die "
            "Käsespätzle mit Röstzwiebeln für 12,50 €, die waren top! Leon hatte das Wiener "
            "Schnitzel für 18,90 — ging so. Sauberkeit war so 7 von 10, insgesamt 8 von 10."
        ),
        "expect_items": 2,
        "expect_prices": {12.5, 18.9},
        "expect_visited": "yesterday",
    },
    {
        "label": "'nicht mein Ding' + single dish",
        "message": (
            "Heute beim Dönerladen Mangal (restaurant_id: r-456): der Hähnchendöner mit "
            "Cocktailsoße für 7,20 € war nicht mein Ding. Laden war sauber, gute 9. "
            "Stimmung nur mittel, 5."
        ),
        "expect_items": 1,
        "expect_prices": {7.2},
        "expect_visited": "today",
    },
    {
        "label": "compound dish names, two courses",
        "message": (
            "Bewertung für den Gasthof Alte Post (restaurant_id: r-789): Rindfleischsuppe "
            "mit Grießklößchen für 6,90 war sehr lecker, 9 von 10. Danach Schweinsbraten "
            "mit Semmelknödel für 16,40, absolut top. Sauberkeit 8, Erlebnis 9. Das war "
            "am 2026-09-01."
        ),
        "expect_items": 2,
        "expect_prices": {6.9, 16.4},
        "expect_visited": "2026-09-01",
    },
]


def phase_german_fixtures() -> None:
    today = date.today()
    for fixture in GERMAN_FIXTURES:
        print(f"\n== German fixture: {fixture['label']} ==")
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"[language=de] [today={today.isoformat()}]\n{fixture['message']}"},
        ]
        data = call(messages, [DRAFT_REVIEW_TOOL], "fixture call")
        if data is None:
            continue
        result = extract_tool_call(data, "draft_review", "model emits draft_review")
        if result is None:
            continue
        args = result["args"]
        print(f"    args: {json.dumps(args, ensure_ascii=False)}")

        items = args.get("food_items", [])
        check("food_items count", len(items) == fixture["expect_items"],
              f"{len(items)} vs expected {fixture['expect_items']}")

        prices = {i.get("price") for i in items}
        check("prices are numbers with the comma decimal resolved",
              all(isinstance(p, (int, float)) for p in prices) and prices == fixture["expect_prices"],
              f"{sorted(prices, key=str)} vs {sorted(fixture['expect_prices'])}")

        ratings_ok = all(
            isinstance(i.get("rating"), (int, float)) and 0 <= i["rating"] <= 10 for i in items
        )
        check("colloquial ratings mapped into 0-10 numbers", ratings_ok,
              str([f"{i.get('food_name')}: {i.get('rating')}" for i in items]))

        expected = fixture["expect_visited"]
        if expected == "yesterday":
            expected = date.fromordinal(today.toordinal() - 1).isoformat()
        elif expected == "today":
            expected = today.isoformat()
        check("visited_at resolved to ISO 8601", args.get("visited_at") == expected,
              f"{args.get('visited_at')!r} vs {expected!r}")


def main() -> int:
    if not API_KEY:
        print("LLM_API_KEY is not set. Add it to backend/.env first.")
        return 2
    print(f"model: {MODEL} | base: {BASE_URL}")
    phase_models()
    phase_tool_roundtrip()
    phase_german_fixtures()

    failed = [c for c in CHECKS if not c[1]]
    print(f"\n{'=' * 60}\n{len(CHECKS) - len(failed)}/{len(CHECKS)} checks passed")
    for name, _, detail in failed:
        print(f"  FAILED: {name} — {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
