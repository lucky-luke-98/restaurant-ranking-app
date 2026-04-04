import { useMemo } from 'react'
import { View, Text, Pressable, Image } from 'react-native'
import { PencilSimpleIcon, TrashIcon } from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './ReviewCard.styles'

interface ReviewCoauthor {
  user_id: string
  first_name: string
  avatar?: string
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
  }
  isOwn: boolean
  onEdit: (review: ReviewCardProps['review']) => void
  onDelete: (reviewId: string) => void
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

export default function ReviewCard({ review, isOwn, onEdit, onDelete }: ReviewCardProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

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
      {renderRatingBar(t.experience, review.experience_rating)}
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
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
