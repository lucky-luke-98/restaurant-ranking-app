import type { Translations } from '@/i18n/en'

// The default tag vocabulary, grouped into the facets the picker renders as sections.
// Kept in sync by hand with backend/src/config/tags.py — the backend validates against
// its own copy, and only the frontend needs the facet grouping and label keys.
export const TAG_FACETS = [
  {
    key: 'cuisine',
    labelKey: 'tagFacetCuisine',
    tags: ['italian', 'french', 'spanish', 'greek', 'turkish', 'german', 'austrian', 'balkan', 'asian', 'japanese', 'chinese', 'korean', 'thai', 'vietnamese', 'indian', 'middle eastern', 'lebanese', 'syrian', 'persian', 'moroccan', 'afghan', 'mexican', 'american'],
  },
  {
    key: 'dish',
    labelKey: 'tagFacetDish',
    tags: ['pizza', 'pasta', 'burger', 'sushi', 'ramen', 'bbq', 'steak', 'seafood', 'sandwiches', 'tapas', 'kebab', 'doner', 'durum', 'lahmacun', 'pide', 'falafel', 'shawarma', 'kofte', 'borek', 'manti', 'mezze', 'baklava'],
  },
  {
    key: 'venue',
    labelKey: 'tagFacetVenue',
    tags: ['bar', 'cocktail bar', 'wine bar', 'brewery', 'pub', 'cafe', 'tea house', 'shisha bar', 'bakery', 'ice cream', 'street food', 'fine dining'],
  },
  {
    key: 'diet',
    labelKey: 'tagFacetDiet',
    tags: ['vegetarian', 'vegan', 'halal'],
  },
] as const

export const DEFAULT_TAGS: readonly string[] = TAG_FACETS.flatMap((f) => f.tags)

const DEFAULT_TAG_SET = new Set(DEFAULT_TAGS)

// Typing the record by the literal union makes a missing i18n key a compile error.
type DefaultTag = (typeof TAG_FACETS)[number]['tags'][number]

export const TAG_LABEL_KEYS: Record<DefaultTag, keyof Translations> = {
  'italian': 'tagItalian',
  'french': 'tagFrench',
  'spanish': 'tagSpanish',
  'greek': 'tagGreek',
  'turkish': 'tagTurkish',
  'german': 'tagGerman',
  'austrian': 'tagAustrian',
  'balkan': 'tagBalkan',
  'asian': 'tagAsian',
  'japanese': 'tagJapanese',
  'chinese': 'tagChinese',
  'korean': 'tagKorean',
  'thai': 'tagThai',
  'vietnamese': 'tagVietnamese',
  'indian': 'tagIndian',
  'middle eastern': 'tagMiddleEastern',
  'lebanese': 'tagLebanese',
  'syrian': 'tagSyrian',
  'persian': 'tagPersian',
  'moroccan': 'tagMoroccan',
  'afghan': 'tagAfghan',
  'mexican': 'tagMexican',
  'american': 'tagAmerican',
  'pizza': 'tagPizza',
  'pasta': 'tagPasta',
  'burger': 'tagBurger',
  'sushi': 'tagSushi',
  'ramen': 'tagRamen',
  'bbq': 'tagBbq',
  'steak': 'tagSteak',
  'seafood': 'tagSeafood',
  'sandwiches': 'tagSandwiches',
  'tapas': 'tagTapas',
  'kebab': 'tagKebab',
  'doner': 'tagDoner',
  'durum': 'tagDurum',
  'lahmacun': 'tagLahmacun',
  'pide': 'tagPide',
  'falafel': 'tagFalafel',
  'shawarma': 'tagShawarma',
  'kofte': 'tagKofte',
  'borek': 'tagBorek',
  'manti': 'tagManti',
  'mezze': 'tagMezze',
  'baklava': 'tagBaklava',
  'bar': 'tagBar',
  'cocktail bar': 'tagCocktailBar',
  'wine bar': 'tagWineBar',
  'brewery': 'tagBrewery',
  'pub': 'tagPub',
  'cafe': 'tagCafe',
  'tea house': 'tagTeaHouse',
  'shisha bar': 'tagShishaBar',
  'bakery': 'tagBakery',
  'ice cream': 'tagIceCream',
  'street food': 'tagStreetFood',
  'fine dining': 'tagFineDining',
  'vegetarian': 'tagVegetarian',
  'vegan': 'tagVegan',
  'halal': 'tagHalal',
}

export const MAX_TAGS_PER_RESTAURANT = 6

/** Mirror of the backend's normalization so client-side dedupe agrees with the server. */
export function normalizeTag(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 24)
    .trim()
}

/** Localized label for a tag, or a title-cased slug for admin-created custom tags. */
export function tagLabel(tag: string, t: Translations): string {
  if (DEFAULT_TAG_SET.has(tag)) {
    return t[TAG_LABEL_KEYS[tag as DefaultTag]] as string
  }
  return tag.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

export function isDefaultTag(tag: string): boolean {
  return DEFAULT_TAG_SET.has(tag)
}
