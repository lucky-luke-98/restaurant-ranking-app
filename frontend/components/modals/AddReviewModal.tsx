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
import { PlusIcon, XIcon, TrashIcon } from 'phosphor-react-native'
import RatingSlider from '@/components/inputs/RatingSlider'
import DateInput from '@/components/inputs/DateInput'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import apiClient from '@/services/apiClient'
import { createStyles } from './AddReviewModal.styles'
import * as ImagePicker from 'expo-image-picker'

interface Friend {
  user_id: string
  first_name: string
  last_name: string
  avatar?: string
}

export interface FoodItemEntry {
  food_review_id?: string
  food_name: string
  price: number
  rating: number
  comment: string
}

export interface ReviewInitialValues {
  review_id: string
  cleanliness_rating: number
  experience_rating: number
  comment?: string
  visited_at?: string
  food_items?: FoodItemEntry[]
  coauthors?: { user_id: string; first_name: string; avatar?: string }[]
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
    images: string[]
    food_items: FoodItemEntry[]
  }) => Promise<void>
}

interface FoodItemState {
  key: string
  food_review_id?: string
  food_name: string
  price: string
  rating: number
  comment: string
}

let foodItemKeyCounter = 0

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

  // Review-level images
  const [images, setImages] = useState<string[]>([])

  // Coauthor state
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedCoauthors, setSelectedCoauthors] = useState<Friend[]>([])

  // Food items state
  const [foodItems, setFoodItems] = useState<FoodItemState[]>([])

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
        if (initialValues.food_items && initialValues.food_items.length > 0) {
          setFoodItems(
            initialValues.food_items.map((fi) => ({
              key: String(++foodItemKeyCounter),
              food_review_id: fi.food_review_id,
              food_name: fi.food_name,
              price: String(fi.price),
              rating: fi.rating,
              comment: fi.comment,
            }))
          )
        }
        if (initialValues.coauthors && initialValues.coauthors.length > 0) {
          setSelectedCoauthors(
            initialValues.coauthors.map((c) => ({
              user_id: c.user_id,
              first_name: c.first_name,
              last_name: '',
              avatar: c.avatar,
            }))
          )
        }
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

  const addFoodItem = () => {
    setFoodItems((prev) => [
      ...prev,
      { key: String(++foodItemKeyCounter), food_name: '', price: '', rating: 5, comment: '' },
    ])
  }

  const removeFoodItem = (key: string) => {
    setFoodItems((prev) => prev.filter((fi) => fi.key !== key))
  }

  const updateFoodItem = (key: string, field: keyof FoodItemState, value: any) => {
    setFoodItems((prev) =>
      prev.map((fi) => (fi.key === key ? { ...fi, [field]: value } : fi))
    )
  }

  // Image handling (review-level)
  const MAX_DIMENSION = 1920
  const JPEG_QUALITY = 0.8
  const MAX_BASE64_LENGTH = 12_000_000

  const resizeOnWeb = (uri: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(dataUrl.split(',')[1])
      }
      img.onerror = reject
      img.src = uri
    })

  const processAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (asset.uri) return resizeOnWeb(asset.uri)
      return null
    }
    if (asset.base64) {
      if (asset.base64.length > MAX_BASE64_LENGTH) return null
      return asset.base64
    }
    return null
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
      allowsMultipleSelection: true,
      exif: false,
    })
    if (!result.canceled) {
      const newImages: string[] = []
      for (const asset of result.assets) {
        const b64 = await processAsset(asset)
        if (b64) newImages.push(b64)
      }
      setImages((prev) => [...prev, ...newImages])
    }
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
      exif: false,
    })
    if (!result.canceled) {
      const b64 = await processAsset(result.assets[0])
      if (b64) setImages((prev) => [...prev, b64])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const foodItemsValid = useMemo(() => {
    return foodItems.every((fi) => {
      const priceNum = parseFloat(fi.price)
      return fi.food_name.trim().length > 0 && !isNaN(priceNum) && priceNum > 0
    })
  }, [foodItems])

  const handleSubmit = async () => {
    if (!foodItemsValid) return
    setSubmitting(true)
    setError(null)
    try {
      const parsedFoodItems: FoodItemEntry[] = foodItems.map((fi) => ({
        ...(fi.food_review_id ? { food_review_id: fi.food_review_id } : {}),
        food_name: fi.food_name.trim(),
        price: parseFloat(fi.price),
        rating: fi.rating,
        comment: fi.comment.trim(),
      }))
      await onSubmit({
        cleanliness_rating: cleanliness,
        experience_rating: experience,
        comment: comment.trim(),
        ...(visitedAt ? { visited_at: visitedAt } : {}),
        ...(selectedCoauthors.length > 0
          ? { coauthor_ids: selectedCoauthors.map((f) => f.user_id) }
          : {}),
        images,
        food_items: parsedFoodItems,
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
    setFoodItems([])
    setImages([])
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
              label={t.ambiance}
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

            {/* Photos section (review-level) */}
            <Text style={styles.fieldLabel}>{t.photosOptional}</Text>
            <View style={styles.imageActions}>
              <Pressable style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>{t.gallery}</Text>
              </Pressable>
              {Platform.OS !== 'web' && (
                <Pressable style={styles.imageButton} onPress={takePhoto}>
                  <Text style={styles.imageButtonText}>{t.camera}</Text>
                </Pressable>
              )}
            </View>
            {images.length > 0 && (
              <ScrollView horizontal style={styles.imagePreviewRow} showsHorizontalScrollIndicator={false}>
                {images.map((img, i) => (
                  <View key={i} style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${img}` }}
                      style={styles.imagePreview}
                    />
                    <Pressable style={styles.imageRemove} onPress={() => removeImage(i)}>
                      <Text style={styles.imageRemoveText}>{'\u2715'}</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Food items section */}
            <View style={styles.foodSection}>
              <View style={styles.foodSectionHeader}>
                <Text style={styles.foodSectionTitle}>{t.foodItems}</Text>
                <Pressable style={styles.addFoodButton} onPress={addFoodItem}>
                  <PlusIcon size={14} color={colors.text} weight="bold" />
                  <Text style={styles.addFoodButtonText}>{t.add}</Text>
                </Pressable>
              </View>

              {foodItems.length === 0 && (
                <Text style={styles.foodSectionHint}>{t.foodItemsHint}</Text>
              )}

              {foodItems.map((item) => (
                <View key={item.key} style={styles.foodItemCard}>
                  <View style={styles.foodItemHeader}>
                    <Text style={styles.foodItemTitle}>{item.food_name || t.foodName}</Text>
                    <Pressable onPress={() => removeFoodItem(item.key)} hitSlop={8}>
                      <TrashIcon size={16} color={colors.error} />
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>{t.foodName}</Text>
                  <TextInput
                    style={styles.textInputSingle}
                    value={item.food_name}
                    onChangeText={(v) => updateFoodItem(item.key, 'food_name', v)}
                    placeholder={t.foodNamePlaceholder}
                    placeholderTextColor={colors.textPlaceholder}
                  />

                  <Text style={styles.fieldLabel}>{t.priceLabel}</Text>
                  <View style={styles.priceRow}>
                    <TextInput
                      style={styles.priceInput}
                      value={item.price}
                      onChangeText={(v) => updateFoodItem(item.key, 'price', v)}
                      placeholder={t.pricePlaceholder}
                      placeholderTextColor={colors.textPlaceholder}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.currencyLabel}>{'\u20AC'}</Text>
                  </View>

                  <RatingSlider
                    label={t.rating}
                    value={item.rating}
                    onChange={(v: number) => updateFoodItem(item.key, 'rating', v)}
                  />

                  <Text style={styles.fieldLabel}>{t.commentOptional}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.comment}
                    onChangeText={(v) => updateFoodItem(item.key, 'comment', v)}
                    placeholder={t.dishCommentPlaceholder}
                    placeholderTextColor={colors.textPlaceholder}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              ))}
            </View>

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
              style={[styles.submitButton, (submitting || !foodItemsValid) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !foodItemsValid}
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
