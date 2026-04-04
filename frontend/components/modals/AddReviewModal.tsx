import React, { useState, useMemo, useEffect, useCallback } from 'react'
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
  Image,
} from 'react-native'
import { PlusIcon, XIcon } from 'phosphor-react-native'
import RatingSlider from '@/components/inputs/RatingSlider'
import DateInput from '@/components/inputs/DateInput'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import apiClient from '@/services/apiClient'
import { createStyles } from './AddReviewModal.styles'

interface Friend {
  user_id: string
  first_name: string
  last_name: string
  avatar?: string
}

export interface ReviewInitialValues {
  review_id: string
  cleanliness_rating: number
  experience_rating: number
  comment?: string
  visited_at?: string
}

interface AddReviewModalProps {
  visible: boolean
  onClose: () => void
  initialValues?: ReviewInitialValues | null
  onSubmit: (data: {
    cleanliness_rating: number
    experience_rating: number
    comment: string
    visited_at?: string
    coauthor_ids?: string[]
  }) => Promise<void>
}

export default function AddReviewModal({
  visible,
  onClose,
  initialValues,
  onSubmit,
}: AddReviewModalProps) {
  const isEdit = !!initialValues
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [cleanliness, setCleanliness] = useState(5)
  const [experience, setExperience] = useState(5)
  const [comment, setComment] = useState('')
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const [visitedAt, setVisitedAt] = useState(todayStr)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Coauthor state
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedCoauthors, setSelectedCoauthors] = useState<Friend[]>([])

  const fetchFriends = useCallback(async () => {
    try {
      const data = await apiClient.get<{ friends: Friend[] }>('/users/friends')
      setFriends(data.friends)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (visible) {
      fetchFriends()
      if (initialValues) {
        setCleanliness(initialValues.cleanliness_rating)
        setExperience(initialValues.experience_rating)
        setComment(initialValues.comment ?? '')
        setVisitedAt(initialValues.visited_at ?? '')
      }
    }
  }, [visible, fetchFriends, initialValues])

  const availableFriends = useMemo(
    () => friends.filter((f) => !selectedCoauthors.some((s) => s.user_id === f.user_id)),
    [friends, selectedCoauthors],
  )

  const addCoauthor = (friend: Friend) => {
    setSelectedCoauthors((prev) => [...prev, friend])
  }

  const removeCoauthor = (userId: string) => {
    setSelectedCoauthors((prev) => prev.filter((f) => f.user_id !== userId))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        cleanliness_rating: cleanliness,
        experience_rating: experience,
        comment: comment.trim(),
        ...(visitedAt ? { visited_at: visitedAt } : {}),
        ...(selectedCoauthors.length > 0
          ? { coauthor_ids: selectedCoauthors.map((f) => f.user_id) }
          : {}),
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
    setVisitedAt(todayStr())
    setSelectedCoauthors([])
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
            <Text style={styles.title}>{isEdit ? t.editReviewTitle : t.addReviewTitle}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeButton}>{'\u2715'}</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.error}>{error}</Text>}

            <RatingSlider
              label={t.cleanliness}
              value={cleanliness}
              onChange={setCleanliness}
            />

            <RatingSlider
              label={t.experience}
              value={experience}
              onChange={setExperience}
            />

            <DateInput
              label={t.visitedOnOptional}
              value={visitedAt}
              onChange={setVisitedAt}
              placeholder={t.datePlaceholder}
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

            {/* Coauthors section */}
            {friends.length > 0 && (
              <View style={styles.coauthorSection}>
                <Text style={styles.fieldLabel}>{t.inviteFriend}</Text>
                {selectedCoauthors.length > 0 && (
                  <View style={styles.coauthorChips}>
                    {selectedCoauthors.map((f) => (
                      <View key={f.user_id} style={styles.coauthorChip}>
                        {f.avatar ? (
                          <Image
                            source={{ uri: `data:image/jpeg;base64,${f.avatar}` }}
                            style={styles.coauthorChipAvatar}
                          />
                        ) : null}
                        <Text style={styles.coauthorChipText}>{f.first_name}</Text>
                        <Pressable onPress={() => removeCoauthor(f.user_id)} hitSlop={4}>
                          <XIcon size={12} color={colors.textFaint} weight="bold" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                {availableFriends.length > 0 && (
                  <View style={styles.coauthorList}>
                    {availableFriends.map((f) => (
                      <Pressable
                        key={f.user_id}
                        style={styles.coauthorRow}
                        onPress={() => addCoauthor(f)}
                      >
                        {f.avatar ? (
                          <Image
                            source={{ uri: `data:image/jpeg;base64,${f.avatar}` }}
                            style={styles.coauthorAvatar}
                          />
                        ) : (
                          <View style={styles.coauthorAvatarFallback}>
                            <Text style={styles.coauthorAvatarText}>
                              {f.first_name[0]}{f.last_name[0]}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.coauthorName}>{f.first_name} {f.last_name}</Text>
                        <PlusIcon size={16} color={colors.textFaint} weight="bold" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{isEdit ? t.saveChanges : t.submitReview}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
