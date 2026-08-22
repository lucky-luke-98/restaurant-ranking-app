"""The restaurant tag vocabulary and the normalization rules that keep it clean.

Tags are stored on the restaurant, not the user, so the vocabulary is global: one
person's typo pollutes everyone's picker. Two mechanisms guard it — normalization
(here) collapses casing/spacing/diacritic variants onto one slug, and the service
layer restricts non-admins to tags that already exist.

Slugs are ASCII and lowercase so ``Döner``, ``doner`` and ``DÖNER `` all land on
``doner``. Display labels (including diacritics and per-language spellings such as
de ``Kebap`` for ``kebab``) live in the frontend i18n files.
"""

import re
import unicodedata

MAX_TAGS_PER_RESTAURANT = 6
MAX_TAG_LENGTH = 24

CUISINE_TAGS: tuple[str, ...] = (
    "italian", "french", "spanish", "greek", "turkish", "german", "austrian",
    "balkan", "asian", "japanese", "chinese", "korean", "thai", "vietnamese",
    "indian", "middle eastern", "lebanese", "syrian", "persian", "moroccan",
    "afghan", "mexican", "american",
)

DISH_TAGS: tuple[str, ...] = (
    "pizza", "pasta", "burger", "sushi", "ramen", "bbq", "steak", "seafood",
    "sandwiches", "tapas", "kebab", "doner", "durum", "lahmacun", "pide",
    "falafel", "shawarma", "kofte", "borek", "manti", "mezze", "baklava",
)

VENUE_TAGS: tuple[str, ...] = (
    "bar", "cocktail bar", "wine bar", "brewery", "pub", "cafe", "tea house",
    "shisha bar", "bakery", "ice cream", "street food", "fine dining",
)

DIET_TAGS: tuple[str, ...] = ("vegetarian", "vegan", "halal")

DEFAULT_TAGS: frozenset[str] = frozenset(
    CUISINE_TAGS + DISH_TAGS + VENUE_TAGS + DIET_TAGS
)

_NON_SLUG_RE = re.compile(r"[^a-z0-9]+")


def normalize_tag(raw: str) -> str:
    """Fold one tag onto its canonical slug. Returns "" if nothing usable remains."""
    if not isinstance(raw, str):
        return ""
    decomposed = unicodedata.normalize("NFKD", raw)
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    slug = _NON_SLUG_RE.sub(" ", ascii_only.lower()).strip()
    return slug[:MAX_TAG_LENGTH].strip()


def normalize_tags(raw: list[str] | None) -> list[str]:
    """Normalize a tag list, dropping blanks and duplicates while keeping order."""
    if not raw:
        return []
    seen: list[str] = []
    for item in raw:
        slug = normalize_tag(item)
        if slug and slug not in seen:
            seen.append(slug)
    return seen
