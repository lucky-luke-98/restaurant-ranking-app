import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { PlusIcon } from 'phosphor-react-native'
import apiClient, { ApiError } from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import ReviewCard from '@/components/cards/ReviewCard'
import FoodReviewCard from '@/components/cards/FoodReviewCard'
import AddReviewModal from '@/components/modals/AddReviewModal'
import AddFoodReviewModal from '@/components/modals/AddFoodReviewModal'
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

interface Review {
  review_id: string
  user_id: string
  cleanliness_rating: number
  experience_rating: number
  comment?: string
  created_at?: string
  visited_at?: string
  first_name?: string
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
  visited_at?: string
  first_name?: string
  images?: FoodReviewImage[]
}

function confirmDeletePlatform(
  message: string,
  labels: { confirm: string; cancel: string; delete: string },
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message))
  }
  return new Promise((resolve) => {
    Alert.alert(labels.confirm, message, [
      { text: labels.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: labels.delete, style: 'destructive', onPress: () => resolve(true) },
    ])
  })
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

  const [imagesLoading, setImagesLoading] = useState(false)

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
  }) => {
    await apiClient.post('/restaurant/reviews', {
      restaurant_id: id,
      ...data,
    })
    setReviewModalVisible(false)
    fetchData()
  }

  const deleteLabels = { confirm: t.confirm, cancel: t.cancel, delete: t.delete }

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = await confirmDeletePlatform(t.confirmDeleteReview, deleteLabels)
    if (!confirmed) return
    await apiClient.delete(`/restaurant/reviews/${reviewId}`)
    fetchData()
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

  const handleDeleteFoodReview = async (foodReviewId: string) => {
    const confirmed = await confirmDeletePlatform(t.confirmDeleteFoodReview, deleteLabels)
    if (!confirmed) return
    await apiClient.delete(`/restaurant/reviews/food/${foodReviewId}`)
    fetchData()
  }

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
          <Text style={styles.cuisineBadge}>{restaurant.cuisine_type}</Text>
          <Text style={styles.address}>
            {`${restaurant.street}, ${restaurant.city}, ${restaurant.country}`}
          </Text>
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
                onDelete={handleDeleteReview}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.sectionFoodReviews}</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setFoodReviewModalVisible(true)}
            >
              <PlusIcon size={16} color={colors.text} weight="bold" />
              <Text style={styles.addButtonText}>{t.add}</Text>
            </Pressable>
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
                onDelete={handleDeleteFoodReview}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleAddReview}
      />

      <AddFoodReviewModal
        visible={foodReviewModalVisible}
        onClose={() => setFoodReviewModalVisible(false)}
        onSubmit={handleAddFoodReview}
      />
    </>
  )
}
