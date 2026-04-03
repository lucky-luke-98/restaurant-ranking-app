import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { PlusIcon, TrashIcon } from 'phosphor-react-native'
import apiClient, { ApiError } from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import AddReviewModal from '@/components/AddReviewModal'
import AddFoodReviewModal from '@/components/AddFoodReviewModal'

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
}

interface FoodReview {
  food_review_id: string
  user_id: string
  food_name: string
  price: number
  rating: number
  comment?: string
}

function confirmDelete(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message))
  }
  return new Promise((resolve) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ])
  })
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [foodReviews, setFoodReviews] = useState<FoodReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [foodReviewModalVisible, setFoodReviewModalVisible] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiClient.get<{ restaurant: Restaurant }>(`/restaurant/${id}`),
      apiClient.get<{ reviews: Review[] }>(`/restaurant/reviews/${id}`),
      apiClient.get<{ food_reviews: FoodReview[] }>(`/restaurant/reviews/food/${id}`),
    ])
      .then(([restaurantData, reviewsData, foodReviewsData]) => {
        setRestaurant(restaurantData.restaurant)
        setReviews(reviewsData.reviews)
        setFoodReviews(foodReviewsData.food_reviews)
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? `Error ${err.status}: ${err.body}`
            : err.message
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddReview = async (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
  }) => {
    await apiClient.post('/restaurant/reviews', {
      user_id: user!.user_id,
      restaurant_id: id,
      ...data,
    })
    setReviewModalVisible(false)
    fetchData()
  }

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = await confirmDelete('Delete this review?')
    if (!confirmed) return
    await apiClient.delete(`/restaurant/reviews/${reviewId}`)
    fetchData()
  }

  const handleAddFoodReview = async (data: {
    food_name: string
    price: number
    rating: number
    comment: string
  }) => {
    await apiClient.post('/restaurant/reviews/food', {
      user_id: user!.user_id,
      restaurant_id: id,
      ...data,
    })
    setFoodReviewModalVisible(false)
    fetchData()
  }

  const handleDeleteFoodReview = async (foodReviewId: string) => {
    const confirmed = await confirmDelete('Delete this food review?')
    if (!confirmed) return
    await apiClient.delete(`/restaurant/reviews/food/${foodReviewId}`)
    fetchData()
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  if (error || !restaurant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Restaurant not found.'}</Text>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Restaurants / ' + restaurant.name }} />
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
            <Text style={styles.sectionTitle}>Reviews</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setReviewModalVisible(true)}
            >
              <PlusIcon size={16} color="#fff" weight="bold" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Cleanliness</Text>
                  <Text style={styles.ratingValue}>{`${review.cleanliness_rating}/10`}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Experience</Text>
                  <Text style={styles.ratingValue}>{`${review.experience_rating}/10`}</Text>
                </View>
                {review.comment ? (
                  <Text style={styles.comment}>{review.comment}</Text>
                ) : null}
                {user && review.user_id === user.user_id ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteReview(review.review_id)}
                  >
                    <TrashIcon size={14} color="#ff6b6b" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Food Reviews</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setFoodReviewModalVisible(true)}
            >
              <PlusIcon size={16} color="#fff" weight="bold" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
          {foodReviews.length === 0 ? (
            <Text style={styles.emptyText}>No food reviews yet.</Text>
          ) : (
            foodReviews.map((review) => (
              <View key={review.food_review_id} style={styles.reviewCard}>
                <View style={styles.foodHeader}>
                  <Text style={styles.foodName}>{review.food_name}</Text>
                  <Text style={styles.foodPrice}>{`${review.price.toFixed(2)} €`}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Rating</Text>
                  <Text style={styles.ratingValue}>{`${review.rating}/10`}</Text>
                </View>
                {review.comment ? (
                  <Text style={styles.comment}>{review.comment}</Text>
                ) : null}
                {user && review.user_id === user.user_id ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteFoodReview(review.food_review_id)}
                  >
                    <TrashIcon size={14} color="#ff6b6b" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  infoSection: {
    marginBottom: 24,
  },
  name: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cuisineBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  address: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ratingLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  ratingValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  foodPrice: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  comment: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
  },
})
