import React, { useState, useMemo, useEffect } from 'react'
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
import RatingSlider from '@/components/inputs/RatingSlider'
import DateInput from '@/components/inputs/DateInput'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './AddFoodReviewModal.styles'
import * as ImagePicker from 'expo-image-picker'

export interface FoodReviewInitialValues {
  food_review_id: string
  food_name: string
  price: number
  rating: number
  comment?: string
  visited_at?: string
}

interface AddFoodReviewModalProps {
  visible: boolean
  onClose: () => void
  initialValues?: FoodReviewInitialValues | null
  onSubmit: (data: {
    food_name: string
    price: number
    rating: number
    comment: string
    images: string[]
    visited_at?: string
  }) => Promise<void>
}

export default function AddFoodReviewModal({
  visible,
  onClose,
  initialValues,
  onSubmit,
}: AddFoodReviewModalProps) {
  const isEdit = !!initialValues
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [foodName, setFoodName] = useState('')
  const [price, setPrice] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<string[]>([])
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const [visitedAt, setVisitedAt] = useState(todayStr)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && initialValues) {
      setFoodName(initialValues.food_name)
      setPrice(String(initialValues.price))
      setRating(initialValues.rating)
      setComment(initialValues.comment ?? '')
      setVisitedAt(initialValues.visited_at ?? '')
    }
  }, [visible, initialValues])

  const priceNum = parseFloat(price)
  const isValid = foodName.trim().length > 0 && !isNaN(priceNum) && priceNum > 0

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

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        food_name: foodName.trim(),
        price: priceNum,
        rating,
        comment: comment.trim(),
        images,
        ...(visitedAt ? { visited_at: visitedAt } : {}),
      })
      handleClose()
    } catch (err: any) {
      setError(err.message ?? t.failedSubmitFoodReview)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setFoodName('')
    setPrice('')
    setRating(5)
    setComment('')
    setImages([])
    setVisitedAt(todayStr())
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
            <Text style={styles.title}>{isEdit ? t.editFoodReviewTitle : t.addFoodReviewTitle}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.fieldLabel}>{t.foodName}</Text>
            <TextInput
              style={styles.textInputSingle}
              value={foodName}
              onChangeText={setFoodName}
              placeholder={t.foodNamePlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              autoFocus
            />

            <Text style={styles.fieldLabel}>{t.priceLabel}</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder={t.pricePlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencyLabel}>{'\u20AC'}</Text>
            </View>

            <RatingSlider label={t.rating} value={rating} onChange={setRating} />

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
              placeholder={t.dishCommentPlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={4}
            />

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
                      <Text style={styles.imageRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable
              style={[
                styles.submitButton,
                (!isValid || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{isEdit ? t.saveChanges : t.submitFoodReview}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
