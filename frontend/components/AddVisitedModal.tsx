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
import { MagnifyingGlassIcon, HeartIcon } from 'phosphor-react-native'

interface PlaceResult {
  google_place_id: string
  name: string
  address: string
}

interface WishlistRestaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  street: string
  city: string
}

type Mode = 'choose' | 'wishlist' | 'search'

interface AddVisitedModalProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
  wishlistRestaurants: WishlistRestaurant[]
  onSelectFromWishlist: (restaurantId: string) => Promise<void>
  onSubmitFromSearch: (googlePlaceId: string) => Promise<void>
}

export default function AddVisitedModal({
  visible,
  onClose,
  onCreated,
  wishlistRestaurants,
  onSelectFromWishlist,
  onSubmitFromSearch,
}: AddVisitedModalProps) {
  const [mode, setMode] = useState<Mode>('choose')
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

  const handleSelectPlace = async (place: PlaceResult) => {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmitFromSearch(place.google_place_id)
      onCreated()
    } catch (err: any) {
      setError(err.message ?? 'Failed to add restaurant')
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
      setError(err.message ?? 'Failed to add restaurant')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setMode('choose')
    setQuery('')
    setResults([])
    setHasSearched(false)
    setError(null)
    onClose()
  }

  const handleBack = () => {
    setMode('choose')
    setQuery('')
    setResults([])
    setHasSearched(false)
    setError(null)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'choose' ? 'Add Visited' : mode === 'wishlist' ? 'From Wishlist' : 'Search Restaurant'}
            </Text>
            {mode !== 'choose' ? (
              <Pressable onPress={handleBack} hitSlop={12}>
                <Text style={styles.backButton}>Back</Text>
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
                  <HeartIcon size={24} color="#fff" weight="fill" />
                  <View style={styles.chooseTextContainer}>
                    <Text style={styles.chooseOptionTitle}>From Wishlist</Text>
                    <Text style={styles.chooseOptionSubtitle}>
                      {wishlistRestaurants.length} restaurant{wishlistRestaurants.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>
              )}
              <Pressable style={styles.chooseOption} onPress={() => setMode('search')}>
                <MagnifyingGlassIcon size={24} color="#fff" weight="bold" />
                <View style={styles.chooseTextContainer}>
                  <Text style={styles.chooseOptionTitle}>Search New</Text>
                  <Text style={styles.chooseOptionSubtitle}>Find on Google Maps</Text>
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
                  <Text style={styles.emptyText}>Your wishlist is empty</Text>
                </View>
              }
            />
          )}

          {mode === 'search' && (
            <>
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
                      onPress={() => handleSelectPlace(item)}
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
                  <Text style={styles.emptyText}>Type a restaurant name to search</Text>
                </View>
              )}
            </>
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
  backButton: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  chooseContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  chooseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
  },
  chooseTextContainer: {
    flex: 1,
  },
  chooseOptionTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  chooseOptionSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 2,
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
