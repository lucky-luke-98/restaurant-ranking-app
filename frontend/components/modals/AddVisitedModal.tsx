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
import { createStyles } from './AddVisitedModal.styles'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'
import { MagnifyingGlassIcon, HeartIcon, CaretLeftIcon, PencilSimpleIcon } from 'phosphor-react-native'
import TagPicker from '@/components/tags/TagPicker'
import PinDropMap from '@/components/maps/PinDropMap'

interface PlaceResult {
  google_place_id: string
  name: string
  address: string
}

interface WishlistRestaurant {
  restaurant_id: string
  name: string
  tags?: string[]
  street: string
  city: string
}

type Mode = 'choose' | 'wishlist' | 'search' | 'manual'

interface AddVisitedModalProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
  wishlistRestaurants: WishlistRestaurant[]
  onSelectFromWishlist: (restaurantId: string) => Promise<void>
  onSubmitFromSearch: (googlePlaceId: string, tags: string[]) => Promise<void>
  onSubmitManual: (name: string, latitude: number, longitude: number, tags: string[]) => Promise<void>
  knownTags: string[]
  canCreate: boolean
}

export default function AddVisitedModal({
  visible,
  onClose,
  onCreated,
  wishlistRestaurants,
  onSelectFromWishlist,
  onSubmitFromSearch,
  onSubmitManual,
  knownTags,
  canCreate,
}: AddVisitedModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { sheetStyle } = useWebModalEffects(visible)
  const [mode, setMode] = useState<Mode>('choose')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [manualName, setManualName] = useState('')
  const [manualLat, setManualLat] = useState<number | null>(null)
  const [manualLng, setManualLng] = useState<number | null>(null)
  const [manualDetailsConfirmed, setManualDetailsConfirmed] = useState(false)
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (!visible) {
      setMode('choose')
      setQuery('')
      setResults([])
      setHasSearched(false)
      setSelectedPlace(null)
      setManualName('')
      setManualLat(null)
      setManualLng(null)
      setManualDetailsConfirmed(false)
      setTags([])
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

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place)
  }

  const handleSubmitFromSearch = async () => {
    if (!selectedPlace) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmitFromSearch(selectedPlace.google_place_id, tags)
      onCreated()
    } catch (err: any) {
      setError(err.message ?? t.failedAddRestaurant)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitManual = async () => {
    if (manualLat == null || manualLng == null) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmitManual(manualName.trim(), manualLat, manualLng, tags)
      onCreated()
    } catch (err: any) {
      setError(err.message ?? t.addressNotFound)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectWishlist = async (restaurantId: string) => {
    setSubmitting(true)
    setError(null)
    try {
      await onSelectFromWishlist(restaurantId)
      onCreated()
    } catch (err: any) {
      setError(err.message ?? t.failedAddRestaurant)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setMode('choose')
    setQuery('')
    setResults([])
    setHasSearched(false)
    setSelectedPlace(null)
    setManualName('')
    setManualLat(null)
    setManualLng(null)
    setManualDetailsConfirmed(false)
    setError(null)
    onClose()
  }

  const handleBack = () => {
    if (selectedPlace) {
      setSelectedPlace(null)
      setError(null)
      return
    }
    if (mode === 'manual' && manualDetailsConfirmed) {
      setManualDetailsConfirmed(false)
      setError(null)
      return
    }
    setMode('choose')
    setQuery('')
    setResults([])
    setHasSearched(false)
    setManualName('')
    setManualLat(null)
    setManualLng(null)
    setManualDetailsConfirmed(false)
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
            <Text style={styles.title}>
              {mode === 'choose'
                ? t.addVisitedTitle
                : mode === 'wishlist'
                  ? t.fromWishlistTitle
                  : mode === 'manual'
                    ? t.manualEntryTitle
                    : t.searchRestaurantTitle}
            </Text>
            {mode !== 'choose' ? (
              <Pressable onPress={handleBack} hitSlop={12}>
                <Text style={styles.backButton}>{t.back}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={handleClose} hitSlop={12}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            )}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          {mode === 'choose' && (
            <View style={styles.chooseContainer}>
              {wishlistRestaurants.length > 0 && (
                <Pressable style={styles.chooseOption} onPress={() => setMode('wishlist')}>
                  <HeartIcon size={24} color={colors.text} weight="fill" />
                  <View style={styles.chooseTextContainer}>
                    <Text style={styles.chooseOptionTitle}>{t.fromWishlistOption}</Text>
                    <Text style={styles.chooseOptionSubtitle}>
                      {t.restaurantCount(wishlistRestaurants.length)}
                    </Text>
                  </View>
                </Pressable>
              )}
              <Pressable style={styles.chooseOption} onPress={() => setMode('search')}>
                <MagnifyingGlassIcon size={24} color={colors.text} weight="bold" />
                <View style={styles.chooseTextContainer}>
                  <Text style={styles.chooseOptionTitle}>{t.searchNewOption}</Text>
                  <Text style={styles.chooseOptionSubtitle}>{t.findOnGoogleMaps}</Text>
                </View>
              </Pressable>
              <Pressable style={styles.chooseOption} onPress={() => setMode('manual')}>
                <PencilSimpleIcon size={24} color={colors.text} weight="bold" />
                <View style={styles.chooseTextContainer}>
                  <Text style={styles.chooseOptionTitle}>{t.enterManuallyOption}</Text>
                  <Text style={styles.chooseOptionSubtitle}>{t.enterManuallySubtitle}</Text>
                </View>
              </Pressable>
            </View>
          )}

          {mode === 'wishlist' && (
            <FlatList
              data={wishlistRestaurants}
              keyExtractor={(item) => item.restaurant_id}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultItem}
                  onPress={() => handleSelectWishlist(item.restaurant_id)}
                  disabled={submitting}
                >
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress}>
                    {item.street}, {item.city}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>{t.wishlistEmpty}</Text>
                </View>
              }
            />
          )}

          {mode === 'search' && !selectedPlace && (
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
                      onPress={() => handleSelectPlace(item)}
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
          )}

          {mode === 'search' && selectedPlace && (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.tagsPrompt}>{t.selectTags}</Text>
              <TagPicker
                selected={tags}
                onChange={setTags}
                knownTags={knownTags}
                canCreate={canCreate}
                disabled={submitting}
              />
              <Pressable
                style={[styles.continueButton, submitting && styles.continueButtonDisabled]}
                onPress={handleSubmitFromSearch}
                disabled={submitting}
              >
                <Text style={styles.continueButtonText}>{t.add}</Text>
              </Pressable>
            </ScrollView>
          )}

          {mode === 'manual' && !manualDetailsConfirmed && (
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.manualForm}>
                <Text style={styles.manualFieldLabel}>{t.restaurantNameLabel}</Text>
                <TextInput
                  style={styles.searchInput}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder={t.restaurantNamePlaceholder}
                  placeholderTextColor={colors.textPlaceholder}
                />
                <Text style={styles.manualFieldLabel}>{t.dropPinInstruction}</Text>
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

          {mode === 'manual' && manualDetailsConfirmed && (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.tagsPrompt}>{t.selectTags}</Text>
              <TagPicker
                selected={tags}
                onChange={setTags}
                knownTags={knownTags}
                canCreate={canCreate}
                disabled={submitting}
              />
              <Pressable
                style={[styles.continueButton, submitting && styles.continueButtonDisabled]}
                onPress={handleSubmitManual}
                disabled={submitting}
              >
                <Text style={styles.continueButtonText}>{t.add}</Text>
              </Pressable>
            </ScrollView>
          )}

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
