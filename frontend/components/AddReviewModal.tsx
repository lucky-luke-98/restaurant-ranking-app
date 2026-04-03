import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'

interface AddReviewModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
  }) => Promise<void>
}

function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <View style={styles.ratingGroup}>
      <Text style={styles.fieldLabel}>
        {label}: <Text style={styles.ratingDisplay}>{value}/10</Text>
      </Text>
      <View style={styles.ratingRow}>
        {Array.from({ length: 11 }, (_, i) => (
          <Pressable
            key={i}
            style={[styles.ratingDot, value === i && styles.ratingDotActive]}
            onPress={() => onChange(i)}
          >
            <Text
              style={[
                styles.ratingDotText,
                value === i && styles.ratingDotTextActive,
              ]}
            >
              {i}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default function AddReviewModal({
  visible,
  onClose,
  onSubmit,
}: AddReviewModalProps) {
  const [cleanliness, setCleanliness] = useState(5)
  const [experience, setExperience] = useState(5)
  const [comment, setComment] = useState('')
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
      })
      handleClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setCleanliness(5)
    setExperience(5)
    setComment('')
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
            <Text style={styles.title}>Add Review</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.error}>{error}</Text>}

            <RatingPicker
              label="Cleanliness"
              value={cleanliness}
              onChange={setCleanliness}
            />

            <RatingPicker
              label="Experience"
              value={experience}
              onChange={setExperience}
            />

            <Text style={styles.fieldLabel}>Comment (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={comment}
              onChangeText={setComment}
              placeholder="How was your experience?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={3}
            />

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  ratingGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingDisplay: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingDotActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  ratingDotText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
  ratingDotTextActive: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
