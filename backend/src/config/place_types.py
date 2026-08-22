"""
Allowlist of Google Places (New) type identifiers classified as food & drink.

Used to post-filter Autocomplete suggestions so non-food places are excluded
while still benefiting from Google's broad primary-type coverage (the API caps
`includedPrimaryTypes` at 5 entries, which is too narrow to cover cuisines,
bars, cafeterias, etc. in a single request).

Source: Google Places API (New) "Food and Drink" category (Table A), plus a
few specialty food shop types from the "Shopping" category (e.g. deli-style
places have no dedicated type and get tagged food_store/butcher_shop).
https://developers.google.com/maps/documentation/places/web-service/place-types
"""

from src.config.tags import DEFAULT_TAGS

FOOD_PLACE_TYPES: frozenset[str] = frozenset({
    # generic
    "restaurant", "bistro", "bar", "pub", "cafe", "bakery",
    "deli", "diner", "snack_bar", "food_court", "cafeteria",
    "family_restaurant", "fast_food_restaurant", "fine_dining_restaurant",
    "buffet_restaurant", "meal_takeaway", "meal_delivery",
    # cuisines — regional/national
    "afghani_restaurant", "african_restaurant", "american_restaurant",
    "argentinian_restaurant", "asian_fusion_restaurant", "asian_restaurant",
    "australian_restaurant", "austrian_restaurant", "bangladeshi_restaurant",
    "basque_restaurant", "bavarian_restaurant", "belgian_restaurant",
    "brazilian_restaurant", "british_restaurant", "burmese_restaurant",
    "cajun_restaurant", "californian_restaurant", "cambodian_restaurant",
    "cantonese_restaurant", "caribbean_restaurant", "chilean_restaurant",
    "chinese_noodle_restaurant", "chinese_restaurant", "colombian_restaurant",
    "croatian_restaurant", "cuban_restaurant", "czech_restaurant",
    "danish_restaurant", "dutch_restaurant", "eastern_european_restaurant",
    "ethiopian_restaurant", "european_restaurant", "filipino_restaurant",
    "french_restaurant", "fusion_restaurant", "german_restaurant",
    "greek_restaurant", "halal_restaurant", "hawaiian_restaurant",
    "hungarian_restaurant", "indian_restaurant", "indonesian_restaurant",
    "irish_restaurant", "israeli_restaurant", "italian_restaurant",
    "japanese_curry_restaurant", "japanese_izakaya_restaurant",
    "japanese_restaurant", "korean_barbecue_restaurant", "korean_restaurant",
    "latin_american_restaurant", "lebanese_restaurant", "malaysian_restaurant",
    "mediterranean_restaurant", "mexican_restaurant", "middle_eastern_restaurant",
    "mongolian_barbecue_restaurant", "moroccan_restaurant", "north_indian_restaurant",
    "pakistani_restaurant", "persian_restaurant", "peruvian_restaurant",
    "polish_restaurant", "portuguese_restaurant", "romanian_restaurant",
    "russian_restaurant", "scandinavian_restaurant", "soul_food_restaurant",
    "south_american_restaurant", "south_indian_restaurant",
    "southwestern_us_restaurant", "spanish_restaurant", "sri_lankan_restaurant",
    "swiss_restaurant", "taiwanese_restaurant", "tex_mex_restaurant",
    "thai_restaurant", "tibetan_restaurant", "turkish_restaurant",
    "ukrainian_restaurant", "vietnamese_restaurant", "western_restaurant",
    # cuisines — dish/style specific
    "barbecue_restaurant", "bar_and_grill", "breakfast_restaurant",
    "brunch_restaurant", "burrito_restaurant", "chicken_restaurant",
    "chicken_wings_restaurant", "dim_sum_restaurant", "dumpling_restaurant",
    "falafel_restaurant", "fish_and_chips_restaurant", "fondue_restaurant",
    "gyro_restaurant", "hamburger_restaurant", "hot_dog_restaurant",
    "hot_dog_stand", "hot_pot_restaurant", "noodle_shop", "oyster_bar_restaurant",
    "pizza_delivery", "pizza_restaurant", "ramen_restaurant", "salad_shop",
    "sandwich_shop", "seafood_restaurant", "shawarma_restaurant", "soup_restaurant",
    "steak_house", "sushi_restaurant", "taco_restaurant", "tapas_restaurant",
    "tonkatsu_restaurant", "yakiniku_restaurant", "yakitori_restaurant",
    "kebab_shop", "bagel_shop",
    # dietary
    "vegan_restaurant", "vegetarian_restaurant",
    # drinks — bars & pubs
    "beer_garden", "brewery", "brewpub", "cocktail_bar", "gastropub",
    "hookah_bar", "irish_pub", "lounge_bar", "sports_bar", "wine_bar", "winery",
    # coffee / tea
    "coffee_roastery", "coffee_shop", "coffee_stand", "tea_house",
    "cat_cafe", "dog_cafe",
    # sweets / dessert
    "acai_shop", "cake_shop", "candy_store", "chocolate_factory",
    "chocolate_shop", "confectionery", "dessert_restaurant", "dessert_shop",
    "donut_shop", "ice_cream_shop", "juice_shop", "pastry_shop",
    # specialty food shops (e.g. Delikatessengeschäft/Feinkostladen)
    "food_store", "butcher_shop", "health_food_store",
})


def is_food_place(types: list[str] | None) -> bool:
    """True if any of the given Google place types is in the food & drink allowlist."""
    if not types:
        return False
    return not FOOD_PLACE_TYPES.isdisjoint(types)


# Google place type -> our tag slugs. Only tags from ``DEFAULT_TAGS`` may appear here,
# asserted at import time below — a typo here would otherwise be invisible, producing a
# tag no picker can render and no non-admin can apply.
#
# Deliberately partial. Generic types (``restaurant``, ``bistro``, ``diner``) carry no
# information worth a tag, and Google's taxonomy has no equivalent for most of the
# Levantine/Turkish dish tags (döner, lahmacun, pide, börek, manti, mezze, baklava) —
# those come from the picker, not from here.
GOOGLE_TYPE_TAGS: dict[str, tuple[str, ...]] = {
    # regional
    "italian_restaurant": ("italian",),
    "french_restaurant": ("french",),
    "spanish_restaurant": ("spanish",),
    "greek_restaurant": ("greek",),
    "turkish_restaurant": ("turkish",),
    "german_restaurant": ("german",),
    "bavarian_restaurant": ("german",),
    "austrian_restaurant": ("austrian",),
    "croatian_restaurant": ("balkan",),
    "romanian_restaurant": ("balkan",),
    "asian_restaurant": ("asian",),
    "asian_fusion_restaurant": ("asian",),
    "noodle_shop": ("asian",),
    "japanese_restaurant": ("japanese",),
    "japanese_izakaya_restaurant": ("japanese",),
    "japanese_curry_restaurant": ("japanese",),
    "tonkatsu_restaurant": ("japanese",),
    "yakitori_restaurant": ("japanese",),
    "yakiniku_restaurant": ("japanese",),
    "chinese_restaurant": ("chinese",),
    "cantonese_restaurant": ("chinese",),
    "chinese_noodle_restaurant": ("chinese",),
    "dim_sum_restaurant": ("chinese",),
    "dumpling_restaurant": ("chinese",),
    "hot_pot_restaurant": ("chinese",),
    "korean_restaurant": ("korean",),
    "korean_barbecue_restaurant": ("korean", "bbq"),
    "thai_restaurant": ("thai",),
    "vietnamese_restaurant": ("vietnamese",),
    "indian_restaurant": ("indian",),
    "north_indian_restaurant": ("indian",),
    "south_indian_restaurant": ("indian",),
    "mexican_restaurant": ("mexican",),
    "tex_mex_restaurant": ("mexican",),
    "burrito_restaurant": ("mexican",),
    "taco_restaurant": ("mexican",),
    "american_restaurant": ("american",),
    "californian_restaurant": ("american",),
    "southwestern_us_restaurant": ("american",),
    "soul_food_restaurant": ("american",),
    # middle east & north africa
    "middle_eastern_restaurant": ("middle eastern",),
    "lebanese_restaurant": ("lebanese", "middle eastern"),
    "israeli_restaurant": ("middle eastern",),
    "persian_restaurant": ("persian", "middle eastern"),
    "afghani_restaurant": ("afghan",),
    "moroccan_restaurant": ("moroccan",),
    "falafel_restaurant": ("falafel", "middle eastern"),
    "shawarma_restaurant": ("shawarma", "middle eastern"),
    "kebab_shop": ("kebab",),
    "gyro_restaurant": ("kebab", "greek"),
    "halal_restaurant": ("halal",),
    # dish / style
    "pizza_restaurant": ("pizza", "italian"),
    "pizza_delivery": ("pizza", "italian"),
    "sushi_restaurant": ("sushi", "japanese"),
    "ramen_restaurant": ("ramen", "japanese"),
    "hamburger_restaurant": ("burger", "american"),
    "steak_house": ("steak",),
    "barbecue_restaurant": ("bbq",),
    "bar_and_grill": ("bbq", "bar"),
    "mongolian_barbecue_restaurant": ("bbq",),
    "seafood_restaurant": ("seafood",),
    "oyster_bar_restaurant": ("seafood",),
    "fish_and_chips_restaurant": ("seafood",),
    "sandwich_shop": ("sandwiches",),
    "bagel_shop": ("sandwiches",),
    "deli": ("sandwiches",),
    "tapas_restaurant": ("tapas", "spanish"),
    # dietary
    "vegan_restaurant": ("vegan",),
    "vegetarian_restaurant": ("vegetarian",),
    # venue
    "bar": ("bar",),
    "pub": ("pub",),
    "irish_pub": ("pub",),
    "gastropub": ("pub",),
    "sports_bar": ("pub",),
    "cocktail_bar": ("cocktail bar",),
    "lounge_bar": ("cocktail bar",),
    "wine_bar": ("wine bar",),
    "winery": ("wine bar",),
    "brewery": ("brewery",),
    "brewpub": ("brewery",),
    "beer_garden": ("brewery",),
    "hookah_bar": ("shisha bar",),
    "cafe": ("cafe",),
    "coffee_shop": ("cafe",),
    "coffee_roastery": ("cafe",),
    "coffee_stand": ("cafe",),
    "cat_cafe": ("cafe",),
    "dog_cafe": ("cafe",),
    "tea_house": ("tea house",),
    "bakery": ("bakery",),
    "pastry_shop": ("bakery",),
    "cake_shop": ("bakery",),
    "donut_shop": ("bakery",),
    "dessert_shop": ("bakery",),
    "ice_cream_shop": ("ice cream",),
    "acai_shop": ("ice cream",),
    "fine_dining_restaurant": ("fine dining",),
    "food_court": ("street food",),
    "snack_bar": ("street food",),
    "hot_dog_stand": ("street food",),
    "fast_food_restaurant": ("street food",),
}


assert not [t for tags in GOOGLE_TYPE_TAGS.values() for t in tags if t not in DEFAULT_TAGS], (
    "GOOGLE_TYPE_TAGS maps to tags outside DEFAULT_TAGS"
)


def tags_for_place_types(types: list[str] | None) -> list[str]:
    """Derive tag slugs from a place's Google types, most specific first.

    Google orders ``types`` with the primary type first, so iterating in order means
    a sushi bar yields ``["sushi", "japanese"]`` — the specific tag survives if the
    caller has to trim the list.
    """
    if not types:
        return []
    derived: list[str] = []
    for gt in types:
        for tag in GOOGLE_TYPE_TAGS.get(gt, ()):
            if tag not in derived:
                derived.append(tag)
    return derived
