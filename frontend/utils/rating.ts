/** Traffic-light color for a 0-10 rating. Shared helper — this logic already exists
 * copied into RestaurantCard, ReviewCard, MapScreen, RestaurantDetailScreen and
 * RatingSlider; new code should import from here instead of adding another copy. */
export function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}
