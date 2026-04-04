import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { TrashIcon } from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './ReviewCard.styles'

interface ReviewCardProps {
  review: {
    review_id: string
    user_id: string
    cleanliness_rating: number
    experience_rating: number
    comment?: string
    created_at?: string
    visited_at?: string
    first_name?: string
  }
  isOwn: boolean
  onDelete: (reviewId: string) => void
}

export default function ReviewCard({ review, isOwn, onDelete }: ReviewCardProps) {
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
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t.cleanliness}</Text>
        <Text style={styles.ratingValue}>{`${review.cleanliness_rating}/10`}</Text>
      </View>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t.experience}</Text>
        <Text style={styles.ratingValue}>{`${review.experience_rating}/10`}</Text>
      </View>
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
      {isOwn ? (
        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(review.review_id)}
        >
          <TrashIcon size={14} color={colors.error} />
          <Text style={styles.deleteButtonText}>{t.delete}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
