"""One-shot backfill: Restaurant.cuisine_type -> Restaurant.tags.

Dry-run by default; pass --apply to write. Idempotent — only touches documents that
still carry a ``cuisine_type``, so a partial run can simply be repeated. Documents whose
value is not recognized are reported and left completely untouched rather than guessed at,
so a second pass can pick them up once this table is extended.

Run from the backend directory:  ./.venv/bin/python -m scripts.migrate_cuisine_to_tags
"""

import sys
from collections import Counter

from pymongo import MongoClient

from src.config import settings
from src.config.tags import DEFAULT_TAGS, normalize_tag

# Values that never described the restaurant. `fusion` and `others` came from the retired
# vocabulary; the rest are Google type/display strings that leaked in before the field was
# validated. All become an empty tag list — more honest than a badge meaning "unclassified".
DROP = {
    "others", "sonstiges", "fusion", "restaurant", "food", "establishment",
    "point of interest", "store", "meal takeaway", "meal delivery",
}

# Non-slug spellings seen in the data or plausibly present: German display labels, English
# near-misses, and the one retired value that maps onto a new tag. Keys are already
# normalized (lowercased, diacritics stripped), so "Französisch" arrives as "franzosisch".
ALIASES = {
    # retired vocabulary
    "oriental": ["middle eastern"],
    "orientalisch": ["middle eastern"],
    # German cuisine labels
    "italienisch": ["italian"], "franzosisch": ["french"], "spanisch": ["spanish"],
    "griechisch": ["greek"], "turkisch": ["turkish"], "deutsch": ["german"],
    "osterreichisch": ["austrian"], "asiatisch": ["asian"], "japanisch": ["japanese"],
    "chinesisch": ["chinese"], "koreanisch": ["korean"], "thailandisch": ["thai"],
    "vietnamesisch": ["vietnamese"], "indisch": ["indian"], "libanesisch": ["lebanese"],
    "syrisch": ["syrian"], "persisch": ["persian"], "marokkanisch": ["moroccan"],
    "afghanisch": ["afghan"], "mexikanisch": ["mexican"], "amerikanisch": ["american"],
    # German dish / venue / diet labels
    "fisch meeresfruchte": ["seafood"], "kebap": ["kebab"], "schawarma": ["shawarma"],
    "cocktailbar": ["cocktail bar"], "weinbar": ["wine bar"], "brauerei": ["brewery"],
    "teehaus": ["tea house"], "backerei": ["bakery"], "eis": ["ice cream"],
    "vegetarisch": ["vegetarian"],
    # English near-misses
    "sandwich": ["sandwiches"], "burgers": ["burger"], "pizzeria": ["pizza"],
    "coffee": ["cafe"], "coffee shop": ["cafe"], "ice cream shop": ["ice cream"],
}


def tags_for(raw) -> list[str] | None:
    """Map one legacy value onto tags. ``None`` means unrecognized — leave the doc alone."""
    slug = normalize_tag(raw) if isinstance(raw, str) else ""
    if not slug or slug in DROP:
        return []
    if slug in DEFAULT_TAGS:
        return [slug]
    return ALIASES.get(slug)


def main() -> int:
    apply = "--apply" in sys.argv
    client = MongoClient(settings.mongo_uri)
    collection = client[settings.mongo_db][settings.mongo_restaurants_collection]
    print(f"database: {settings.mongo_db} / {settings.mongo_restaurants_collection}\n")

    pending = list(collection.find({"cuisine_type": {"$exists": True}}))
    if not pending:
        print("Nothing to migrate: no document carries a cuisine_type.")
        client.close()
        return 0

    mapped = Counter()
    skipped = Counter()
    for doc in pending:
        raw = doc.get("cuisine_type")
        tags = tags_for(raw)
        if tags is None:
            skipped[str(raw)] += 1
            continue
        mapped[(str(raw), tuple(tags))] += 1
        if apply:
            collection.update_one(
                {"restaurant_id": doc["restaurant_id"]},
                {"$set": {"tags": doc.get("tags") or tags}, "$unset": {"cuisine_type": ""}},
            )

    total = sum(mapped.values())
    print(f"{'Migrated' if apply else 'Would migrate'} {total} of {len(pending)} restaurants:")
    for (raw, tags), count in sorted(mapped.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {raw!r:22} -> {', '.join(tags) or '(no tags)':18} {count}")
    if skipped:
        print(f"\nUNRECOGNIZED — left untouched ({sum(skipped.values())} documents):")
        for raw, count in sorted(skipped.items(), key=lambda kv: -kv[1]):
            print(f"  {raw!r:22} {count}")
        print("Add these to ALIASES or DROP and re-run to pick them up.")
    if not apply:
        print("\nDry run. Re-run with --apply to write.")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
