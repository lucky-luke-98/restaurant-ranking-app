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
  FlatList,
  ActivityIndicator,
} from 'react-native'
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
      setError(err.message ?? 'Failed to create restaurant')
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
            <Text style={styles.title}>Add Restaurant</Text>
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
              placeholder="Search for a restaurant..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              returnKeyType="search"
              autoFocus
            />
            <Pressable
              style={[styles.searchButton, query.trim().length < 2 && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={query.trim().length < 2 || searching}
            >
              <MagnifyingGlassIcon size={20} color="#fff" weight="bold" />
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          {searching ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#fff" />
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
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                Type a restaurant name to search
              </Text>
            </View>
          )}

          {submitting && (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.submittingText}>Adding restaurant...</Text>
            </View>
          )}
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
    maxHeight: '80%',
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
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.3,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
  resultsList: {
    maxHeight: 350,
  },
  resultItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  resultName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultAddress: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 3,
  },
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submittingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
})
