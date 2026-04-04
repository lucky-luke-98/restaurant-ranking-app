import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './AddReviewModal.styles'

interface AddReviewModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
    visited_at?: string
  }) => Promise<void>
}

function RatingSlider({
  label,
  value,
  onChange,
  styles,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  styles: ReturnType<typeof createStyles>
}) {
  const trackRef = React.useRef<View>(null)

  const resolveValue = (pageX: number) => {
    trackRef.current?.measure((_x, _y, width, _h, px) => {
      const clamped = Math.min(Math.max((pageX - px) / width, 0), 1)
      onChange(Math.round(clamped * 100) / 10)
    })
  }

  return (
    <View style={styles.ratingGroup}>
      <Text style={styles.fieldLabel}>
        {label}: <Text style={styles.ratingDisplay}>{value.toFixed(1)}/10</Text>
      </Text>
      <View
        ref={trackRef}
        style={styles.sliderTrack}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => resolveValue(e.nativeEvent.pageX)}
        onResponderMove={(e) => resolveValue(e.nativeEvent.pageX)}
      >
        <View style={[styles.sliderFill, { width: `${value * 10}%` }]} />
        <View style={[styles.sliderThumb, { left: `${value * 10}%` }]} />
      </View>
    </View>
  )
}

export default function AddReviewModal({
  visible,
  onClose,
  onSubmit,
}: AddReviewModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [cleanliness, setCleanliness] = useState(5)
  const [experience, setExperience] = useState(5)
  const [comment, setComment] = useState('')
  const [visitedAt, setVisitedAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        cleanliness_rating: cleanliness,
        experience_rating: experience,
        comment: comment.trim(),
        ...(visitedAt ? { visited_at: visitedAt } : {}),
      })
      handleClose()
    } catch (err: any) {
      setError(err.message ?? t.failedSubmitReview)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setCleanliness(5)
    setExperience(5)
    setComment('')
    setVisitedAt('')
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.addReviewTitle}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.error}>{error}</Text>}

            <RatingSlider
              label={t.cleanliness}
              value={cleanliness}
              onChange={setCleanliness}
              styles={styles}
            />

            <RatingSlider
              label={t.experience}
              value={experience}
              onChange={setExperience}
              styles={styles}
            />

            <Text style={styles.fieldLabel}>{t.visitedOnOptional}</Text>
            <TextInput
              style={styles.dateInput}
              value={visitedAt}
              onChangeText={setVisitedAt}
              placeholder={t.datePlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              maxLength={10}
            />

            <Text style={styles.fieldLabel}>{t.commentOptional}</Text>
            <TextInput
              style={styles.textInput}
              value={comment}
              onChangeText={setComment}
              placeholder={t.commentPlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={4}
            />

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t.submitReview}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
