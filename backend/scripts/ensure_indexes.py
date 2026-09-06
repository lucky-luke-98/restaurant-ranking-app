"""One-shot, deliberate creation of the unique integrity indexes.

Dry-run by default; pass --apply to create. Targets the database from settings unless
--db <name> is given (use this to run against prod after dev). Idempotent — an index that
already exists with the same spec is a no-op. Run the duplicate scan first: a unique index
build fails on existing duplicates, and `_ensure_indexes` running unprotected at startup
would then brick the next deploy.

Run from the backend directory:  ./.venv/bin/python -m scripts.ensure_indexes [--db <name>] [--apply]
"""

import sys

from pymongo import ASCENDING, MongoClient

from src.config import settings

# (collection setting attr, keys, kwargs) — partialFilterExpression guards documents
# written before the key existed; absent keys must not collide as duplicate nulls.
INDEXES = [
    (
        "mongo_reviews_collection",
        [("review_id", ASCENDING)],
        {"unique": True, "partialFilterExpression": {"review_id": {"$type": "string"}}},
    ),
    (
        "mongo_food_reviews_collection",
        [("food_review_id", ASCENDING)],
        {"unique": True, "partialFilterExpression": {"food_review_id": {"$type": "string"}}},
    ),
    (
        "mongo_visited_collection",
        [("user_id", ASCENDING), ("restaurant_id", ASCENDING)],
        {
            "unique": True,
            "partialFilterExpression": {
                "user_id": {"$type": "string"},
                "restaurant_id": {"$type": "string"},
            },
        },
    ),
]


def main() -> int:
    apply = "--apply" in sys.argv
    db_name = sys.argv[sys.argv.index("--db") + 1] if "--db" in sys.argv else settings.mongo_db

    client = MongoClient(settings.mongo_uri)
    db = client[db_name]
    print(f"database: {db_name}\n")

    failed = False
    for setting_attr, keys, kwargs in INDEXES:
        coll_name = getattr(settings, setting_attr)
        spec = ", ".join(k for k, _ in keys)
        if not apply:
            print(f"Would create unique index on {coll_name}({spec})")
            continue
        try:
            name = db[coll_name].create_index(keys, **kwargs)
            print(f"OK  {coll_name}({spec}) -> {name}")
        except Exception as exc:
            # Most likely DuplicateKeyError (dedupe first) or IndexOptionsConflict
            # (an index of the same name exists with different options — drop it first).
            failed = True
            print(f"FAILED  {coll_name}({spec}): {exc}")

    if not apply:
        print("\nDry run. Re-run with --apply to create.")
    client.close()
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
