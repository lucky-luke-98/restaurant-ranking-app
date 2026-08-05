import { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './AddWishlistModal.styles'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'
import { MagnifyingGlassIcon, CaretLeftIcon } from 'phosphor-react-native'
import { CUISINE_TYPES, CUISINE_ICONS, CUISINE_LABEL_KEYS, type CuisineType } from '@/constants/CuisineTypes'
import PinDropMap from '@/components/maps/PinDropMap'

interface PlaceResult {
  google_place_id: string
  name: string
  address: string
}

const WISHLIST_COMMENT_MAX = 400

type Mode = 'search' | 'manual'

interface AddWishlistModalProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
  onSubmit: (googlePlaceId: string, cuisineType: CuisineType, comment: string) => Promise<void>
  onSubmitManual: (name: string, latitude: number, longitude: number, cuisineType: CuisineType, comment: string) => Promise<void>
}

export default function AddWishlistModal({
  visible,
  onClose,
  onCreated,
  onSubmit,
  onSubmitManual,
}: AddWishlistModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { sheetStyle } = useWebModalEffects(visible)
  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [comment, setComment] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualLat, setManualLat] = useState<number | null>(null)
  const [manualLng, setManualLng] = useState<number | null>(null)
  const [manualDetailsConfirmed, setManualDetailsConfirmed] = useState(false)

  useEffect(() => {
    if (!visible) {
      setMode('search')
      setQuery('')
      setResults([])
      setHasSearched(false)
      setSelectedPlace(null)
      setComment('')
      setManualName('')
      setManualLat(null)
      setManualLng(null)
      setManualDetailsConfirmed(false)
      setError(null)
    }
  }, [visible])

  const handleSearch = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    setError(null)
    try {
      const { default: apiClient } = await import('@/services/apiClient')
      const data = await apiClient.get<{ results: PlaceResult[] }>(
        '/restaurant/search',
        { params: { query: query.trim() } },
      )
      setResults(data.results)
    } catch (err) {
      console.warn('Restaurant search failed:', err)
      setResults([])
      setError(t.searchFailed)
    } finally {
      setSearching(false)
      setHasSearched(true)
    }
  }

  const handleSelectCuisine = async (cuisineType: CuisineType) => {
    if (!selectedPlace) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(selectedPlace.google_place_id, cuisineType, comment.trim())
      onCreated()
    } catch (err: any) {
      setError(err.message ?? t.failedCreateRestaurant)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectManualCuisine = async (cuisineType: CuisineType) => {
    if (manualLat == null || manualLng == null) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmitManual(manualName.trim(), manualLat, manualLng, cuisineType, comment.trim())
      onCreated()
    } catch (err: any) {
      setError(err.message ?? t.addressNotFound)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setMode('search')
    setQuery('')
    setResults([])
    setHasSearched(false)
    setSelectedPlace(null)
    setComment('')
    setManualName('')
    setManualLat(null)
    setManualLng(null)
    setManualDetailsConfirmed(false)
    setError(null)
    onClose()
  }

  const handleBackToSearch = () => {
    setSelectedPlace(null)
    setComment('')
    setError(null)
  }

  const handleBackFromManual = () => {
    if (manualDetailsConfirmed) {
      setManualDetailsConfirmed(false)
      setError(null)
      return
    }
    setMode('search')
    setManualName('')
    setManualLat(null)
    setManualLng(null)
    setError(null)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, sheetStyle]}>
          <View style={styles.header}>
            {selectedPlace ? (
              <Pressable onPress={handleBackToSearch} hitSlop={12} style={styles.backRow}>
                <CaretLeftIcon size={18} color={colors.text} weight="bold" />
                <Text style={styles.title}>{selectedPlace.name}</Text>
              </Pressable>
            ) : mode === 'manual' ? (
              <Pressable onPress={handleBackFromManual} hitSlop={12} style={styles.backRow}>
                <CaretLeftIcon size={18} color={colors.text} weight="bold" />
                <Text style={styles.title}>{manualDetailsConfirmed ? manualName : t.manualEntryTitle}</Text>
              </Pressable>
            ) : (
              <Text style={styles.title}>{t.addRestaurantTitle}</Text>
            )}
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeButton}>{'\u2715'}</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          {mode === 'manual' && !manualDetailsConfirmed && (
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.manualForm}>
                <Text style={styles.fieldLabel}>{t.restaurantNameLabel}</Text>
                <TextInput
                  style={styles.searchInput}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder={t.restaurantNamePlaceholder}
                  placeholderTextColor={colors.textPlaceholder}
                />
                <Text style={styles.fieldLabel}>{t.dropPinInstruction}</Text>
                <PinDropMap
                  latitude={manualLat}
                  longitude={manualLng}
                  onChange={(lat, lng) => {
                    setManualLat(lat)
                    setManualLng(lng)
                  }}
                />
                <Pressable
                  style={[
                    styles.continueButton,
                    (!manualName.trim() || manualLat == null || manualLng == null) && styles.continueButtonDisabled,
                  ]}
                  onPress={() => setManualDetailsConfirmed(true)}
                  disabled={!manualName.trim() || manualLat == null || manualLng == null}
                >
                  <Text style={styles.continueButtonText}>{t.continueButton}</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {(selectedPlace || (mode === 'manual' && manualDetailsConfirmed)) ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>{t.wishlistCommentLabel}</Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={(v) => setComment(v.slice(0, WISHLIST_COMMENT_MAX))}
                placeholder={t.wishlistCommentPlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                multiline
                maxLength={WISHLIST_COMMENT_MAX}
              />
              <Text style={styles.charCount}>
                {t.charsRemaining(WISHLIST_COMMENT_MAX - comment.length)}
              </Text>
              <Text style={styles.cuisinePrompt}>{t.selectCuisineType}</Text>
              <View style={styles.cuisineGrid}>
                {CUISINE_TYPES.map((ct) => {
                  const Icon = CUISINE_ICONS[ct]
                  const labelKey = CUISINE_LABEL_KEYS[ct] as keyof typeof t
                  return (
                    <Pressable
                      key={ct}
                      style={({ pressed }) => [styles.cuisineChip, pressed && styles.cuisineChipPressed]}
                      onPress={() => (mode === 'manual' ? handleSelectManualCuisine(ct) : handleSelectCuisine(ct))}
                      disabled={submitting}
                    >
                      <Icon size={20} color={colors.text} weight="duotone" />
                      <Text style={styles.cuisineChipText}>{t[labelKey] as string}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
          ) : mode === 'search' ? (
            <>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  placeholder={t.searchPlaceholder}
                  placeholderTextColor={colors.textPlaceholder}
                  returnKeyType="search"
                  autoFocus
                />
                <Pressable
                  style={[styles.searchButton, query.trim().length < 2 && styles.searchButtonDisabled]}
                  onPress={handleSearch}
                  disabled={query.trim().length < 2 || searching}
                >
                  <MagnifyingGlassIcon size={20} color={colors.text} weight="bold" />
                </Pressable>
              </View>

              <Pressable onPress={() => setMode('manual')} hitSlop={8}>
                <Text style={styles.manualLink}>{t.enterManuallyOption}</Text>
              </Pressable>

              {searching ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={colors.tint} />
                </View>
              ) : results.length > 0 ? (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.google_place_id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.resultsList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.resultItem}
                      onPress={() => setSelectedPlace(item)}
                      disabled={submitting}
                    >
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultAddress}>{item.address}</Text>
                    </Pressable>
                  )}
                />
              ) : hasSearched && results.length === 0 && !error ? (
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>{t.noResults}</Text>
                </View>
              ) : (
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>{t.searchInstruction}</Text>
                </View>
              )}
            </>
          ) : null}

          {submitting && (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={styles.submittingText}>{t.addingRestaurant}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
