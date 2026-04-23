"""
Allowlist of Google Places (New) type identifiers classified as food & drink.

Used to post-filter Autocomplete suggestions so non-food places are excluded
while still benefiting from Google's broad primary-type coverage (the API caps
`includedPrimaryTypes` at 5 entries, which is too narrow to cover cuisines,
bars, cafeterias, etc. in a single request).

Source: Google Places API (New) "Food and Drink" category (Table A).
https://developers.google.com/maps/documentation/places/web-service/place-types
"""

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
})


def is_food_place(types: list[str] | None) -> bool:
    """True if any of the given Google place types is in the food & drink allowlist."""
    if not types:
        return False
    return not FOOD_PLACE_TYPES.isdisjoint(types)
