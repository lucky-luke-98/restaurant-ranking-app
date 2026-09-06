import { useMemo } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ratingColor } from '@/utils/rating'
import { createStyles } from './ProposalCard.styles'

export interface ProposalFoodItem {
  food_name: string
  price: number
  rating: number
  comment?: string | null
}

export interface ProposalData {
  kind: string
  proposal_id: string
  summary: string
  payload: {
    restaurant_id: string
    cleanliness_rating: number
    experience_rating: number
    comment?: string | null
    visited_at?: string | null
    food_items: ProposalFoodItem[]
  }
  display: {
    restaurant_name?: string | null
    street?: string | null
    city?: string | null
  }
}

export type ProposalStatus = 'idle' | 'saving' | 'saved' | 'discarded' | 'error'

interface ProposalCardProps {
  proposal: ProposalData
  status: ProposalStatus
  errorText?: string
  onSave: () => void
  onDiscard: () => void
}

/** The human check on the agent's draft. A valid-but-wrong restaurant_id passes every
 * automated layer — this card leading with NAME + street + city is what catches it. */
export default function ProposalCard({ proposal, status, errorText, onSave, onDiscard }: ProposalCardProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { payload, display } = proposal

  const decided = status === 'saved' || status === 'discarded'
  const pillText =
    status === 'saved' ? t.chatProposalSaved
    : status === 'discarded' ? t.chatProposalDiscarded
    : t.chatProposalDraft

  return (
    <View style={[styles.card, status === 'saved' && styles.cardSaved, status === 'discarded' && styles.cardDiscarded]}>
      <View style={[styles.statusPill, status === 'saved' && styles.statusPillSaved]}>
        <Text style={styles.statusPillText}>{pillText}</Text>
      </View>

      <Text style={styles.restaurantName}>{display.restaurant_name ?? '—'}</Text>
      {(display.street || display.city) && (
        <Text style={styles.restaurantAddress}>
          {[display.street, display.city].filter(Boolean).join(', ')}
        </Text>
      )}

      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t.cleanliness}</Text>
        <Text style={[styles.ratingValue, { color: ratingColor(payload.cleanliness_rating) }]}>
          {payload.cleanliness_rating.toFixed(1)}/10
        </Text>
      </View>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t.ambiance}</Text>
        <Text style={[styles.ratingValue, { color: ratingColor(payload.experience_rating) }]}>
          {payload.experience_rating.toFixed(1)}/10
        </Text>
      </View>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t.visitedOnOptional}</Text>
        <Text style={styles.ratingLabel}>
          {payload.visited_at ?? t.chatProposalNoDate}
        </Text>
      </View>
      {payload.comment ? <Text style={styles.comment}>“{payload.comment}”</Text> : null}

      {payload.food_items.length > 0 && (
        <>
          <Text style={styles.foodHeader}>{t.foodItems}</Text>
          {payload.food_items.map((item, index) => (
            <View key={index} style={styles.foodRow}>
              <Text style={styles.foodName}>{item.food_name}</Text>
              <Text style={styles.foodMeta}>{item.price.toFixed(2)} €</Text>
              <Text style={[styles.ratingValue, { color: ratingColor(item.rating) }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          ))}
        </>
      )}

      {!decided && <Text style={styles.cascadeNote}>{t.chatProposalCascade}</Text>}
      {status === 'error' && errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {!decided && (
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.saveButton, status === 'saving' && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={status === 'saving'}
            accessibilityRole="button"
            accessibilityLabel={t.chatProposalSave}
          >
            {status === 'saving'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveButtonText}>{t.chatProposalSave}</Text>}
          </Pressable>
          <Pressable
            style={styles.discardButton}
            onPress={onDiscard}
            disabled={status === 'saving'}
            accessibilityRole="button"
            accessibilityLabel={t.chatProposalDiscard}
          >
            <Text style={styles.discardButtonText}>{t.chatProposalDiscard}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
