import { useMemo, useState } from 'react'
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native'
import { PencilSimpleIcon, TrashIcon, CaretDownIcon, CaretUpIcon } from 'phosphor-react-native'
import ImageViewer from '@/components/viewers/ImageViewer'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './ReviewCard.styles'

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

interface FoodReview {
  food_review_id: string
  user_id: string
  food_name: string
  price: number
  rating: number
  comment?: string
}

interface ReviewCardProps {
  review: {
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
  foodReviews: FoodReview[]
  isOwn: boolean
  imagesLoading: boolean
  onEdit: (review: ReviewCardProps['review']) => void
  onDelete: (reviewId: string) => void
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

export default function ReviewCard({ review, foodReviews, isOwn, imagesLoading, onEdit, onDelete }: ReviewCardProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [foodExpanded, setFoodExpanded] = useState(false)

  const hasCoauthors = review.coauthors && review.coauthors.length > 0

  const renderRatingBar = (label: string, value: number) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingBarTrack}>
        <View
          style={[
            styles.ratingBarFill,
            { width: `${(value / 10) * 100}%`, backgroundColor: ratingColor(value) },
          ]}
        />
      </View>
      <Text style={styles.ratingValue}>{value.toFixed(1)}</Text>
    </View>
  )

  return (
    <View style={[styles.card, isOwn && styles.ownCard]}>
      <View style={styles.meta}>
        <View style={styles.authorRow}>
          {review.avatar ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${review.avatar}` }}
              style={styles.authorAvatar}
            />
          ) : (
            <View style={styles.authorAvatarFallback}>
              <Text style={styles.authorAvatarText}>
                {(isOwn ? t.you : review.first_name || t.anonymous).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.author}>
            {isOwn ? t.you : review.first_name || t.anonymous}
          </Text>
          {hasCoauthors && (
            <>
              <Text style={styles.coauthorSeparator}>{t.withCoauthors}</Text>
              <View style={styles.coauthorStack}>
                {review.coauthors!.map((ca, i) =>
                  ca.avatar ? (
                    <Image
                      key={ca.user_id}
                      source={{ uri: `data:image/jpeg;base64,${ca.avatar}` }}
                      style={[styles.coauthorStackAvatar, i === 0 && styles.coauthorStackAvatarFirst]}
                    />
                  ) : (
                    <View
                      key={ca.user_id}
                      style={[styles.coauthorStackFallback, i === 0 && styles.coauthorStackFallbackFirst]}
                    >
                      <Text style={styles.coauthorStackText}>
                        {ca.first_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )
                )}
              </View>
              <Text style={styles.coauthorNames}>
                {review.coauthors!.map((ca) => ca.first_name).join(', ')}
              </Text>
            </>
          )}
        </View>
        <View style={styles.dateRow}>
          {review.visited_at ? (
            <Text style={styles.date}>{t.visited(review.visited_at)}</Text>
          ) : review.created_at ? (
            <Text style={styles.date}>{review.created_at.slice(0, 10)}</Text>
          ) : null}
          {review.updated_at ? (
            <Text style={styles.editedBadge}>{`(${t.edited})`}</Text>
          ) : null}
        </View>
      </View>
      {renderRatingBar(t.cleanliness, review.cleanliness_rating)}
      {renderRatingBar(t.ambiance, review.experience_rating)}
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}

      {/* Review-level images */}
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

      {/* Collapsible food reviews */}
      {foodReviews.length > 0 && (
        <View style={styles.foodSection}>
          <Pressable style={styles.foodToggle} onPress={() => setFoodExpanded((v) => !v)}>
            <Text style={styles.foodToggleText}>
              {foodExpanded ? t.hideFoodItems : t.showFoodItems(foodReviews.length)}
            </Text>
            {foodExpanded ? (
              <CaretUpIcon size={14} color={colors.textTertiary} weight="bold" />
            ) : (
              <CaretDownIcon size={14} color={colors.textTertiary} weight="bold" />
            )}
          </Pressable>

          {foodExpanded && foodReviews.map((fr) => (
            <View key={fr.food_review_id} style={styles.foodItem}>
              <View style={styles.foodHeader}>
                <Text style={styles.foodName}>{fr.food_name}</Text>
                <Text style={styles.foodPrice}>{`${fr.price.toFixed(2)} \u20AC`}</Text>
              </View>
              {renderRatingBar(t.rating, fr.rating)}
              {fr.comment ? (
                <Text style={styles.foodComment}>{fr.comment}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {isOwn ? (
        <View style={styles.actionRow}>
          <Pressable
            style={styles.editButton}
            onPress={() => onEdit(review)}
          >
            <PencilSimpleIcon size={14} color={colors.tint} />
            <Text style={styles.editButtonText}>{t.edit}</Text>
          </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => onDelete(review.review_id)}
          >
            <TrashIcon size={14} color={colors.error} />
            <Text style={styles.deleteButtonText}>{t.delete}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
