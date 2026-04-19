import { useMemo, useState } from 'react'
import { View, Text, Pressable, Image, Linking } from 'react-native'
import { HeartIcon, MapPinIcon, StarIcon, CheckIcon } from 'phosphor-react-native'
import apiClient from '@/services/apiClient'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors, useThemeShadows } from '@/hooks/useThemeColors'
import {
  CUISINE_ICONS,
  CUISINE_LABEL_KEYS,
  type CuisineType,
} from '@/constants/CuisineTypes'
import StaticLeafletMap from '@/components/maps/StaticLeafletMap'
import EditWishlistCommentModal from '@/components/modals/EditWishlistCommentModal'
import { createStyles } from './RestaurantVisitCard.styles'

interface FeedRestaurant {
  restaurant_id: string
  name: string
  cuisine_type?: string | null
  street?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  avg_rating?: number | null
  rating_count?: number | null
}

interface FeedAuthor {
  user_id: string
  first_name?: string
  avatar?: string
}

interface RestaurantVisitCardProps {
  restaurant: FeedRestaurant
  author: FeedAuthor
  createdAt?: string
  visitedAt?: string
  isOnWishlist: boolean
  onOpenRestaurant: (restaurantId: string) => void
  onWishlistAdded: (restaurantId: string) => void
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

function useRelativeTime(iso?: string): string {
  const { t } = useTranslation()
  return useMemo(() => {
    if (!iso) return ''
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return ''
    const diffMs = Date.now() - then
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return t.timeNow
    if (minutes < 60) return t.timeMinutes(minutes)
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t.timeHours(hours)
    const days = Math.floor(hours / 24)
    if (days < 30) return t.timeDays(days)
    return iso.slice(0, 10)
  }, [iso, t])
}

function buildGoogleMapsUrl(r: FeedRestaurant): string {
  const address = [r.street, r.city].filter(Boolean).join(', ')
  const query = [r.name, address].filter(Boolean).join(', ')
  const fallback =
    r.latitude != null && r.longitude != null ? `${r.latitude},${r.longitude}` : ''
  const param = encodeURIComponent(query || fallback)
  return `https://www.google.com/maps/search/?api=1&query=${param}`
}

export default function RestaurantVisitCard({
  restaurant,
  author,
  createdAt,
  visitedAt,
  isOnWishlist,
  onOpenRestaurant,
  onWishlistAdded,
}: RestaurantVisitCardProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const shadows = useThemeShadows()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])

  const [wishlistBusy, setWishlistBusy] = useState(false)
  const [commentModalVisible, setCommentModalVisible] = useState(false)

  const relativeTime = useRelativeTime(visitedAt ?? createdAt)
  const authorName = author.first_name || t.anonymous

  const cuisineKey = restaurant.cuisine_type as CuisineType | undefined
  const CuisineIcon = cuisineKey && CUISINE_ICONS[cuisineKey] ? CUISINE_ICONS[cuisineKey] : null
  const cuisineLabel = cuisineKey && CUISINE_LABEL_KEYS[cuisineKey]
    ? (t[CUISINE_LABEL_KEYS[cuisineKey] as keyof typeof t] as string)
    : ''

  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ')
  const hasCoords = restaurant.latitude != null && restaurant.longitude != null
  const hasRating = typeof restaurant.avg_rating === 'number'

  const handleOpenMaps = () => {
    const url = buildGoogleMapsUrl(restaurant)
    Linking.openURL(url)
  }

  const handleOpenWishlistModal = () => {
    if (isOnWishlist || wishlistBusy) return
    setCommentModalVisible(true)
  }

  const handleSubmitWishlist = async (comment: string) => {
    setWishlistBusy(true)
    try {
      await apiClient.post('/wishlist', {
        restaurant_id: restaurant.restaurant_id,
        comment: comment.length > 0 ? comment : null,
      })
      onWishlistAdded(restaurant.restaurant_id)
    } finally {
      setWishlistBusy(false)
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.attributionRow}>
        {author.avatar ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${author.avatar}` }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{authorName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.attributionText} numberOfLines={1}>
          {relativeTime
            ? t.visitedBy(authorName, relativeTime)
            : t.visitedByNoTime(authorName)}
        </Text>
      </View>

      <Pressable
        style={styles.body}
        onPress={() => onOpenRestaurant(restaurant.restaurant_id)}
      >
        <View style={styles.titleRow}>
          {CuisineIcon ? (
            <View style={styles.cuisineIconWrap}>
              <CuisineIcon size={20} color="#fff" weight="fill" />
            </View>
          ) : null}
          <View style={styles.titleTextWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {cuisineLabel ? (
              <Text style={styles.cuisineLabel} numberOfLines={1}>
                {cuisineLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.ratingRow}>
          {hasRating ? (
            <>
              <StarIcon
                size={14}
                color={ratingColor(restaurant.avg_rating!)}
                weight="fill"
              />
              <Text
                style={[
                  styles.ratingValue,
                  { color: ratingColor(restaurant.avg_rating!) },
                ]}
              >
                {restaurant.avg_rating!.toFixed(1)}
              </Text>
              {restaurant.rating_count ? (
                <Text style={styles.ratingCount}>
                  {`(${restaurant.rating_count})`}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.ratingEmpty}>{t.emptyReviews}</Text>
          )}
        </View>
      </Pressable>

      {address ? (
        <Pressable style={styles.addressRow} onPress={handleOpenMaps}>
          <MapPinIcon size={14} color={colors.textMuted} weight="fill" />
          <Text style={styles.addressText} numberOfLines={1}>
            {address}
          </Text>
        </Pressable>
      ) : null}

      {hasCoords ? (
        <View style={styles.mapWrap}>
          <StaticLeafletMap
            latitude={restaurant.latitude!}
            longitude={restaurant.longitude!}
            cuisineType={restaurant.cuisine_type ?? 'others'}
            height={140}
            zoom={13}
            onPress={handleOpenMaps}
          />
        </View>
      ) : null}

      <Pressable
        style={[styles.wishlistButton, isOnWishlist && styles.wishlistButtonDisabled]}
        disabled={isOnWishlist || wishlistBusy}
        onPress={handleOpenWishlistModal}
      >
        {isOnWishlist ? (
          <CheckIcon size={16} color={colors.textMuted} weight="bold" />
        ) : (
          <HeartIcon size={16} color={colors.tint} weight="fill" />
        )}
        <Text
          style={[
            styles.wishlistButtonText,
            isOnWishlist && styles.wishlistButtonTextDisabled,
          ]}
        >
          {isOnWishlist ? t.alreadyOnWishlist : t.addToWishlist}
        </Text>
      </Pressable>

      <EditWishlistCommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        onSave={handleSubmitWishlist}
      />
    </View>
  )
}
