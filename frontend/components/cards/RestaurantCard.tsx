import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPinIcon, CaretRightIcon, StarIcon, TrashIcon, CalendarIcon, NotepadIcon, PencilSimpleIcon } from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors, useThemeShadows } from '@/hooks/useThemeColors'
import { CUISINE_ICONS, CUISINE_LABEL_KEYS, type CuisineType } from '@/constants/CuisineTypes'
import { createStyles } from './RestaurantCard.styles'

interface FoodReviewStats {
  count: number
  avg_rating: number | null
  last_visited: string | null
}

interface Restaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  street: string
  city: string
}

interface RestaurantCardProps {
  restaurant: Restaurant
  stats?: FoodReviewStats
  onDelete?: (restaurantId: string) => void
  wishlistComment?: string | null
  onEditComment?: (restaurantId: string) => void
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

export default function RestaurantCard({ restaurant, stats, onDelete, wishlistComment, onEditComment }: RestaurantCardProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const colors = useThemeColors()
  const shadows = useThemeShadows()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])

  const cuisineKey = restaurant.cuisine_type as CuisineType
  const CuisineIcon = CUISINE_ICONS[cuisineKey] ?? CUISINE_ICONS.others
  const cuisineLabelKey = CUISINE_LABEL_KEYS[cuisineKey] as keyof typeof t | undefined
  const cuisineLabel = cuisineLabelKey ? (t[cuisineLabelKey] as string) : restaurant.cuisine_type

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({
          pathname: '/restaurant/[id]' as const,
          params: { id: restaurant.restaurant_id },
        })
      }
    >
      <View style={styles.emblem}>
        <CuisineIcon size={26} color="#fff" weight="duotone" />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <View style={styles.header}>
              <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
              <View style={styles.cuisineBadge}>
                <Text style={styles.cuisine}>{cuisineLabel}</Text>
              </View>
            </View>
            <View style={styles.locationRow}>
              <MapPinIcon size={14} color={colors.textMuted} />
              <Text style={styles.location}>
                {restaurant.street}, {restaurant.city}
              </Text>
            </View>
          </View>
          <CaretRightIcon size={18} color={colors.textFaint} />
        </View>
        {onEditComment && (wishlistComment ? (
          <Pressable
            style={({ pressed }) => [styles.commentRow, pressed && styles.commentRowPressed]}
            onPress={() => onEditComment(restaurant.restaurant_id)}
            hitSlop={4}
          >
            <NotepadIcon size={14} color={colors.textMuted} weight="duotone" style={styles.commentIcon} />
            <Text style={styles.commentText} numberOfLines={2}>{wishlistComment}</Text>
            <PencilSimpleIcon size={13} color={colors.textFaint} style={styles.commentEditIcon} />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.addCommentRow, pressed && styles.commentRowPressed]}
            onPress={() => onEditComment(restaurant.restaurant_id)}
            hitSlop={4}
          >
            <PencilSimpleIcon size={13} color={colors.textFaint} />
            <Text style={styles.addCommentText}>{t.addWishlistComment}</Text>
          </Pressable>
        ))}
        {(stats || onDelete) && (
          <View style={styles.bottomRow}>
            <View style={styles.statsLeft}>
              {stats && stats.count > 0 ? (
                <View style={styles.statsRow}>
                  <StarIcon size={14} color={ratingColor(stats.avg_rating ?? 0)} weight="fill" />
                  <Text style={[styles.statsRating, { color: ratingColor(stats.avg_rating ?? 0) }]}>
                    {stats.avg_rating?.toFixed(1)}
                  </Text>
                  <Text style={styles.statsCount}>
                    ({stats.count})
                  </Text>
                </View>
              ) : stats ? (
                <Text style={styles.statsCount}>{t.emptyReviews}</Text>
              ) : (
                <View />
              )}
              {stats?.last_visited && (
                <View style={styles.statsRow}>
                  <CalendarIcon size={13} color={colors.textFaint} />
                  <Text style={styles.statsCount}>{t.visitedAt(stats.last_visited)}</Text>
                </View>
              )}
            </View>
            {onDelete && (
              <Pressable
                style={styles.deleteButton}
                hitSlop={6}
                onPress={() => onDelete(restaurant.restaurant_id)}
              >
                <TrashIcon size={15} color={colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  )
}
