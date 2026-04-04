import { useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native'
import { TrashIcon } from 'phosphor-react-native'
import ImageViewer from '@/components/viewers/ImageViewer'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './FoodReviewCard.styles'

interface FoodReviewImage {
  image_id: string
  food_review_id: string
  data: string
  content_type: string
}

interface FoodReviewCardProps {
  review: {
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
  isOwn: boolean
  imagesLoading: boolean
  onDelete: (foodReviewId: string) => void
}

export default function FoodReviewCard({
  review,
  isOwn,
  imagesLoading,
  onDelete,
}: FoodReviewCardProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={[styles.card, isOwn && styles.ownCard]}>
      <View style={styles.meta}>
        <Text style={styles.author}>
          {isOwn ? t.you : review.first_name || t.anonymous}
        </Text>
        {review.visited_at ? (
          <Text style={styles.date}>{t.visited(review.visited_at)}</Text>
        ) : review.created_at ? (
          <Text style={styles.date}>{review.created_at.slice(0, 10)}</Text>
        ) : null}
      </View>
      <View style={styles.foodHeader}>
        <Text style={styles.foodName}>{review.food_name}</Text>
        <Text style={styles.foodPrice}>{`${review.price.toFixed(2)} €`}</Text>
      </View>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t.rating}</Text>
        <Text style={styles.ratingValue}>{`${review.rating}/10`}</Text>
      </View>
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
      {review.images && review.images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageRow}
        >
          {review.images.map((img) => (
            <ImageViewer
              key={img.image_id}
              uri={`data:${img.content_type};base64,${img.data}`}
            >
              <Image
                source={{ uri: `data:${img.content_type};base64,${img.data}` }}
                style={styles.image}
              />
            </ImageViewer>
          ))}
        </ScrollView>
      ) : imagesLoading ? (
        <View style={styles.imagePlaceholder}>
          <ActivityIndicator size="small" color={colors.textFaint} />
        </View>
      ) : null}
      {isOwn ? (
        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(review.food_review_id)}
        >
          <TrashIcon size={14} color={colors.error} />
          <Text style={styles.deleteButtonText}>{t.delete}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
