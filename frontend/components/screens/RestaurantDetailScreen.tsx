import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { PlusIcon, StarIcon, NotepadIcon, PencilSimpleIcon } from 'phosphor-react-native'
import { CUISINE_ICONS, CUISINE_LABEL_KEYS, type CuisineType } from '@/constants/CuisineTypes'
import apiClient, { ApiError } from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import ReviewCard from '@/components/cards/ReviewCard'
import AddReviewModal, { ReviewInitialValues, FoodItemEntry } from '@/components/modals/AddReviewModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import EditWishlistCommentModal from '@/components/modals/EditWishlistCommentModal'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './RestaurantDetailScreen.styles'

interface Restaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  street: string
  city: string
  country: string
}

interface ReviewCoauthor {
  user_id: string
  first_name: string
  avatar?: string
}

interface ReviewImage {
  image_id: string
  review_id: string
  data: string
  content_type: string
}

interface Review {
  review_id: string
  user_id: string
  cleanliness_rating: number
  experience_rating: number
  comment?: string
  created_at?: string
  updated_at?: string
  visited_at?: string
  first_name?: string
  avatar?: string
  coauthors?: ReviewCoauthor[]
  images?: ReviewImage[]
}

interface FoodReview {
  food_review_id: string
  user_id: string
  food_name: string
  price: number
  rating: number
  comment?: string
  created_at?: string
  updated_at?: string
  visited_at?: string
  first_name?: string
  avatar?: string
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [foodReviews, setFoodReviews] = useState<FoodReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [editingReview, setEditingReview] = useState<ReviewInitialValues | null>(null)

  const [imagesLoading, setImagesLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null)
  const [confirmLeave, setConfirmLeave] = useState<{ id: string } | null>(null)
  const [wishlistEntry, setWishlistEntry] = useState<{ entry_id: string; comment?: string | null } | null>(null)
  const [editCommentVisible, setEditCommentVisible] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiClient.get<{ restaurant: Restaurant }>(`/restaurant/${id}`),
      apiClient.get<{ reviews: Review[] }>(`/restaurant/reviews/${id}`),
      apiClient.get<{ food_reviews: FoodReview[] }>(`/restaurant/reviews/food/${id}`),
      apiClient.get<{ entries: { entry_id: string; restaurant_id: string; comment?: string | null }[] }>(
        '/restaurant/wishlist/me',
      ).catch(() => ({ entries: [] as { entry_id: string; restaurant_id: string; comment?: string | null }[] })),
    ])
      .then(([restaurantData, reviewsData, foodReviewsData, wishlistData]) => {
        setRestaurant(restaurantData.restaurant)
        const wl = wishlistData.entries.find((e) => e.restaurant_id === id)
        setWishlistEntry(wl ? { entry_id: wl.entry_id, comment: wl.comment ?? null } : null)
        const sortOwn = <T extends { user_id: string }>(items: T[]) =>
          [...items].sort((a, b) => {
            const aOwn = user && a.user_id === user.user_id ? 0 : 1
            const bOwn = user && b.user_id === user.user_id ? 0 : 1
            return aOwn - bOwn
          })
        const sortReviews = (items: Review[]) =>
          [...items].sort((a, b) => {
            const rank = (r: Review) => {
              if (user && r.user_id === user.user_id) return 0
              if (user && r.coauthors?.some((c) => c.user_id === user.user_id)) return 1
              return 2
            }
            return rank(a) - rank(b)
          })
        const sortedReviews = sortReviews(reviewsData.reviews)
        setReviews(sortedReviews)
        setFoodReviews(sortOwn(foodReviewsData.food_reviews))
        setLoading(false)

        // Load review images in the background
        setImagesLoading(true)
        Promise.all(
          sortedReviews.map(async (r) => {
            try {
              const imgData = await apiClient.get<{ images: ReviewImage[] }>(
                `/restaurant/reviews/${r.review_id}/images`
              )
              return { id: r.review_id, images: imgData.images }
            } catch {
              return { id: r.review_id, images: [] as ReviewImage[] }
            }
          })
        ).then((results) => {
          setReviews((prev) =>
            prev.map((r) => {
              const match = results.find((res) => res.id === r.review_id)
              return match ? { ...r, images: match.images } : r
            })
          )
          setImagesLoading(false)
        })
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? `Error ${err.status}: ${err.body}`
            : err.message
        setError(message)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group food reviews by user_id for display alongside restaurant reviews
  const foodReviewsByUser = useMemo(() => {
    const map = new Map<string, FoodReview[]>()
    for (const fr of foodReviews) {
      const existing = map.get(fr.user_id) ?? []
      existing.push(fr)
      map.set(fr.user_id, existing)
    }
    return map
  }, [foodReviews])

  const handleAddReview = async (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
    visited_at?: string
    coauthor_ids?: string[]
    images: string[]
    food_items: FoodItemEntry[]
  }) => {
    // Create restaurant review (with images)
    await apiClient.post('/restaurant/reviews', {
      restaurant_id: id,
      cleanliness_rating: data.cleanliness_rating,
      experience_rating: data.experience_rating,
      comment: data.comment,
      images: data.images,
      ...(data.visited_at ? { visited_at: data.visited_at } : {}),
      ...(data.coauthor_ids ? { coauthor_ids: data.coauthor_ids } : {}),
    })
    // Create food reviews
    for (const item of data.food_items) {
      await apiClient.post('/restaurant/reviews/food', {
        restaurant_id: id,
        food_name: item.food_name,
        price: item.price,
        rating: item.rating,
        comment: item.comment,
        ...(data.visited_at ? { visited_at: data.visited_at } : {}),
      })
    }
    setReviewModalVisible(false)
    fetchData()
  }

  const handleDeleteReview = (reviewId: string) => {
    setConfirmDelete({ id: reviewId })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return
    // Delete the restaurant review (backend cascades image deletion)
    await apiClient.delete(`/restaurant/reviews/${confirmDelete.id}`)
    // Also delete associated food reviews for this user
    const userFoodReviews = foodReviews.filter(
      (fr) => fr.user_id === user?.user_id
    )
    for (const fr of userFoodReviews) {
      await apiClient.delete(`/restaurant/reviews/food/${fr.food_review_id}`)
    }
    setConfirmDelete(null)
    fetchData()
  }

  const handleSaveWishlistComment = async (comment: string) => {
    if (!wishlistEntry) return
    await apiClient.put('/restaurant/wishlist', {
      entry_id: wishlistEntry.entry_id,
      comment: comment || null,
    })
    setEditCommentVisible(false)
    fetchData()
  }

  const handleLeaveReview = (reviewId: string) => {
    setConfirmLeave({ id: reviewId })
  }

  const executeLeave = async () => {
    if (!confirmLeave) return
    await apiClient.post(`/restaurant/reviews/${confirmLeave.id}/leave`, {})
    setConfirmLeave(null)
    fetchData()
  }

  const handleEditReview = (review: Review) => {
    const userFoods = foodReviewsByUser.get(user?.user_id ?? review.user_id) ?? []
    setEditingReview({
      review_id: review.review_id,
      cleanliness_rating: review.cleanliness_rating,
      experience_rating: review.experience_rating,
      comment: review.comment,
      visited_at: review.visited_at,
      food_items: userFoods.map((fr) => ({
        food_review_id: fr.food_review_id,
        food_name: fr.food_name,
        price: fr.price,
        rating: fr.rating,
        comment: fr.comment ?? '',
      })),
      coauthors: review.coauthors,
      images: review.images?.map((img) => img.data) ?? [],
    })
    setReviewModalVisible(true)
  }

  const handleUpdateReview = async (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
    visited_at?: string
    coauthor_ids?: string[]
    images: string[]
    food_items: FoodItemEntry[]
  }) => {
    // Update restaurant review
    await apiClient.put('/restaurant/reviews', {
      review_id: editingReview!.review_id,
      cleanliness_rating: data.cleanliness_rating,
      experience_rating: data.experience_rating,
      comment: data.comment,
      ...(data.visited_at ? { visited_at: data.visited_at } : {}),
      coauthor_ids: data.coauthor_ids ?? [],
      images: data.images,
    })

    const existingFoodIds = new Set(
      (editingReview!.food_items ?? [])
        .map((fi) => fi.food_review_id)
        .filter(Boolean) as string[]
    )
    const updatedFoodIds = new Set<string>()

    for (const item of data.food_items) {
      if (item.food_review_id) {
        // Update existing food review
        updatedFoodIds.add(item.food_review_id)
        await apiClient.put('/restaurant/reviews/food', {
          food_review_id: item.food_review_id,
          food_name: item.food_name,
          price: item.price,
          rating: item.rating,
          comment: item.comment,
          ...(data.visited_at ? { visited_at: data.visited_at } : {}),
        })
      } else {
        // Create new food review
        await apiClient.post('/restaurant/reviews/food', {
          restaurant_id: id,
          food_name: item.food_name,
          price: item.price,
          rating: item.rating,
          comment: item.comment,
          ...(data.visited_at ? { visited_at: data.visited_at } : {}),
        })
      }
    }

    // Delete food reviews that were removed
    for (const oldId of existingFoodIds) {
      if (!updatedFoodIds.has(oldId)) {
        await apiClient.delete(`/restaurant/reviews/food/${oldId}`)
      }
    }

    setReviewModalVisible(false)
    setEditingReview(null)
    fetchData()
  }

  const foodAvg = useMemo(() => {
    if (foodReviews.length === 0) return null
    const sum = foodReviews.reduce((acc, r) => acc + r.rating, 0)
    return Math.round((sum / foodReviews.length) * 10) / 10
  }, [foodReviews])

  const ratingColor = (v: number) => v >= 8 ? '#4CAF50' : v >= 5 ? '#FF9800' : '#F44336'

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  if (error || !restaurant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? t.restaurantNotFound}</Text>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: t.restaurantsSlash(restaurant.name) }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoSection}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {(() => {
            const ck = restaurant.cuisine_type as CuisineType
            const CIcon = CUISINE_ICONS[ck] ?? CUISINE_ICONS.others
            const lk = CUISINE_LABEL_KEYS[ck] as keyof typeof t | undefined
            return (
              <View style={styles.cuisineBadgeRow}>
                <CIcon size={15} color={colors.textTertiary} weight="duotone" />
                <Text style={styles.cuisineBadge}>{lk ? (t[lk] as string) : restaurant.cuisine_type}</Text>
              </View>
            )
          })()}
          <Text style={styles.address}>
            {`${restaurant.street}, ${restaurant.city}, ${restaurant.country}`}
          </Text>
          {foodAvg !== null && (
            <View style={styles.statsSummary}>
              <StarIcon size={18} color={ratingColor(foodAvg)} weight="fill" />
              <Text style={[styles.statsSummaryValue, { color: ratingColor(foodAvg) }]}>
                {foodAvg.toFixed(1)}
              </Text>
              <Text style={styles.statsSummaryLabel}>
                ({foodReviews.length} {foodReviews.length === 1 ? t.rating.toLowerCase() : t.foodItems.toLowerCase()})
              </Text>
            </View>
          )}
          {wishlistEntry && (
            <Pressable
              style={({ pressed }) => [
                wishlistEntry.comment ? styles.wishlistNote : styles.wishlistNoteEmpty,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setEditCommentVisible(true)}
            >
              <NotepadIcon
                size={18}
                color={wishlistEntry.comment ? colors.primary : colors.textFaint}
                weight="duotone"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.wishlistNoteLabel}>{t.wishlistCommentTitle}</Text>
                {wishlistEntry.comment ? (
                  <Text style={styles.wishlistNoteText}>{wishlistEntry.comment}</Text>
                ) : (
                  <Text style={styles.wishlistNoteEmptyText}>{t.addWishlistComment}</Text>
                )}
              </View>
              <PencilSimpleIcon size={15} color={colors.textFaint} />
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.sectionReviews}</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setReviewModalVisible(true)}
            >
              <PlusIcon size={16} color={colors.text} weight="bold" />
              <Text style={styles.addButtonText}>{t.add}</Text>
            </Pressable>
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>{t.emptyReviews}</Text>
          ) : (
            reviews.map((review) => (
              <ReviewCard
                key={review.review_id}
                review={review}
                foodReviews={foodReviewsByUser.get(review.user_id) ?? []}
                isOwn={!!user && review.user_id === user.user_id}
                isCoauthor={!!user && !!review.coauthors?.some((c) => c.user_id === user.user_id)}
                imagesLoading={imagesLoading}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
                onLeave={handleLeaveReview}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddReviewModal
        visible={reviewModalVisible}
        initialValues={editingReview}
        onClose={() => { setReviewModalVisible(false); setEditingReview(null) }}
        onSubmit={editingReview ? handleUpdateReview : handleAddReview}
      />

      <EditWishlistCommentModal
        visible={editCommentVisible}
        initialComment={wishlistEntry?.comment ?? ''}
        onClose={() => setEditCommentVisible(false)}
        onSave={handleSaveWishlistComment}
      />

      <ConfirmModal
        visible={!!confirmDelete}
        title={t.confirmDeleteReview}
        message={t.confirmDeleteReview}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        visible={!!confirmLeave}
        title={t.confirmLeaveReview}
        message={t.confirmLeaveReview}
        confirmLabel={t.leaveReview}
        cancelLabel={t.cancel}
        onConfirm={executeLeave}
        onCancel={() => setConfirmLeave(null)}
      />
    </>
  )
}
