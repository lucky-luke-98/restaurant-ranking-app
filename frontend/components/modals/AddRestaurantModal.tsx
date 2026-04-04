import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './AddRestaurantModal.styles'
import { MagnifyingGlassIcon } from 'phosphor-react-native'

interface PlaceResult {
  google_place_id: string
  name: string
  address: string
}

interface AddRestaurantModalProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
  onSubmit: (googlePlaceId: string) => Promise<void>
}

export default function AddRestaurantModal({
  visible,
  onClose,
  onCreated,
  onSubmit,
}: AddRestaurantModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch {
      setResults([])
    } finally {
      setSearching(false)
      setHasSearched(true)
    }
  }

  const handleSelect = async (place: PlaceResult) => {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(place.google_place_id)
      onCreated()
    } catch (err: any) {
      setError(err.message ?? t.failedCreateRestaurant)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
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
            <Text style={styles.title}>{t.addRestaurantTitle}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

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

          {error && <Text style={styles.error}>{error}</Text>}

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
                  onPress={() => handleSelect(item)}
                  disabled={submitting}
                >
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress}>{item.address}</Text>
                </Pressable>
              )}
            />
          ) : hasSearched && results.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t.noResults}</Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {t.searchInstruction}
              </Text>
            </View>
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
