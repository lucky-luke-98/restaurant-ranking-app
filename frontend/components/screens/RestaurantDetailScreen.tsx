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
import { PlusIcon, StarIcon } from 'phosphor-react-native'
import { CUISINE_ICONS, CUISINE_LABEL_KEYS, type CuisineType } from '@/constants/CuisineTypes'
import apiClient, { ApiError } from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import ReviewCard from '@/components/cards/ReviewCard'
import FoodReviewCard from '@/components/cards/FoodReviewCard'
import AddReviewModal, { ReviewInitialValues } from '@/components/modals/AddReviewModal'
import AddFoodReviewModal, { FoodReviewInitialValues } from '@/components/modals/AddFoodReviewModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
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
}

interface FoodReviewImage {
  image_id: string
  food_review_id: string
  data: string
  content_type: string
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
  images?: FoodReviewImage[]
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
  const [foodReviewModalVisible, setFoodReviewModalVisible] = useState(false)
  const [editingReview, setEditingReview] = useState<ReviewInitialValues | null>(null)
  const [editingFoodReview, setEditingFoodReview] = useState<FoodReviewInitialValues | null>(null)

  const [imagesLoading, setImagesLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'review' | 'food'; id: string } | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiClient.get<{ restaurant: Restaurant }>(`/restaurant/${id}`),
      apiClient.get<{ reviews: Review[] }>(`/restaurant/reviews/${id}`),
      apiClient.get<{ food_reviews: FoodReview[] }>(`/restaurant/reviews/food/${id}`),
    ])
      .then(([restaurantData, reviewsData, foodReviewsData]) => {
        setRestaurant(restaurantData.restaurant)
        const sortOwn = <T extends { user_id: string }>(items: T[]) =>
          [...items].sort((a, b) => {
            const aOwn = user && a.user_id === user.user_id ? 0 : 1
            const bOwn = user && b.user_id === user.user_id ? 0 : 1
            return aOwn - bOwn
          })
        setReviews(sortOwn(reviewsData.reviews))
        setFoodReviews(sortOwn(foodReviewsData.food_reviews))
        setLoading(false)

        // Load images in the background
        setImagesLoading(true)
        Promise.all(
          foodReviewsData.food_reviews.map(async (fr) => {
            try {
              const imgData = await apiClient.get<{ images: FoodReviewImage[] }>(
                `/restaurant/reviews/food/${fr.food_review_id}/images`
              )
              return { id: fr.food_review_id, images: imgData.images }
            } catch {
              return { id: fr.food_review_id, images: [] as FoodReviewImage[] }
            }
          })
        ).then((results) => {
          setFoodReviews((prev) =>
            prev.map((fr) => {
              const match = results.find((r) => r.id === fr.food_review_id)
              return match ? { ...fr, images: match.images } : fr
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

  const handleAddReview = async (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
    visited_at?: string
    coauthor_ids?: string[]
  }) => {
    await apiClient.post('/restaurant/reviews', {
      restaurant_id: id,
      ...data,
    })
    setReviewModalVisible(false)
    fetchData()
  }

  const handleDeleteReview = (reviewId: string) => {
    setConfirmDelete({ type: 'review', id: reviewId })
  }

  const handleAddFoodReview = async (data: {
    food_name: string
    price: number
    rating: number
    comment: string
    images: string[]
    visited_at?: string
  }) => {
    await apiClient.post('/restaurant/reviews/food', {
      restaurant_id: id,
      ...data,
    })
    setFoodReviewModalVisible(false)
    fetchData()
  }

  const handleDeleteFoodReview = (foodReviewId: string) => {
    setConfirmDelete({ type: 'food', id: foodReviewId })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return
    const path = confirmDelete.type === 'review'
      ? `/restaurant/reviews/${confirmDelete.id}`
      : `/restaurant/reviews/food/${confirmDelete.id}`
    await apiClient.delete(path)
    setConfirmDelete(null)
    fetchData()
  }

  const handleEditReview = (review: Review) => {
    setEditingReview({
      review_id: review.review_id,
      cleanliness_rating: review.cleanliness_rating,
      experience_rating: review.experience_rating,
      comment: review.comment,
      visited_at: review.visited_at,
    })
    setReviewModalVisible(true)
  }

  const handleUpdateReview = async (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
    visited_at?: string
  }) => {
    await apiClient.put('/restaurant/reviews', {
      review_id: editingReview!.review_id,
      ...data,
    })
    setReviewModalVisible(false)
    setEditingReview(null)
    fetchData()
  }

  const handleEditFoodReview = (review: FoodReview) => {
    setEditingFoodReview({
      food_review_id: review.food_review_id,
      food_name: review.food_name,
      price: review.price,
      rating: review.rating,
      comment: review.comment,
      visited_at: review.visited_at,
    })
    setFoodReviewModalVisible(true)
  }

  const handleUpdateFoodReview = async (data: {
    food_name: string
    price: number
    rating: number
    comment: string
    images: string[]
    visited_at?: string
  }) => {
    await apiClient.put('/restaurant/reviews/food', {
      food_review_id: editingFoodReview!.food_review_id,
      food_name: data.food_name,
      price: data.price,
      rating: data.rating,
      comment: data.comment,
      ...(data.visited_at ? { visited_at: data.visited_at } : {}),
    })
    setFoodReviewModalVisible(false)
    setEditingFoodReview(null)
    fetchData()
  }

  const userHasReview = useMemo(
    () => !!user && reviews.some((r) => r.user_id === user.user_id),
    [reviews, user],
  )

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
                ({foodReviews.length} {foodReviews.length === 1 ? t.rating.toLowerCase() : t.sectionFoodReviews.toLowerCase()})
              </Text>
            </View>
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
                isOwn={!!user && review.user_id === user.user_id}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.sectionFoodReviews}</Text>
            {userHasReview ? (
              <Pressable
                style={styles.addButton}
                onPress={() => setFoodReviewModalVisible(true)}
              >
                <PlusIcon size={16} color={colors.text} weight="bold" />
                <Text style={styles.addButtonText}>{t.add}</Text>
              </Pressable>
            ) : (
              <Text style={styles.hintText}>{t.foodReviewRequiresReview}</Text>
            )}
          </View>
          {foodReviews.length === 0 ? (
            <Text style={styles.emptyText}>{t.emptyFoodReviews}</Text>
          ) : (
            foodReviews.map((review) => (
              <FoodReviewCard
                key={review.food_review_id}
                review={review}
                isOwn={!!user && review.user_id === user.user_id}
                imagesLoading={imagesLoading}
                onEdit={handleEditFoodReview}
                onDelete={handleDeleteFoodReview}
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

      <AddFoodReviewModal
        visible={foodReviewModalVisible}
        initialValues={editingFoodReview}
        onClose={() => { setFoodReviewModalVisible(false); setEditingFoodReview(null) }}
        onSubmit={editingFoodReview ? handleUpdateFoodReview : handleAddFoodReview}
      />

      <ConfirmModal
        visible={!!confirmDelete}
        title={confirmDelete?.type === 'review' ? t.confirmDeleteReview : t.confirmDeleteFoodReview}
        message={confirmDelete?.type === 'review' ? t.confirmDeleteReview : t.confirmDeleteFoodReview}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
