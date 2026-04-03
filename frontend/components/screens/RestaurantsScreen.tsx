import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
} from 'react-native'
import { Stack } from 'expo-router'
import { PlusIcon, CheckCircleIcon, HeartIcon, TrashIcon } from 'phosphor-react-native'
import apiClient, { ApiError } from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import RestaurantCard from '@/components/RestaurantCard'
import AddRestaurantModal from '@/components/AddRestaurantModal'
import AddVisitedModal from '@/components/AddVisitedModal'

interface Restaurant {
  restaurant_id: string
  google_place_id: string
  name: string
  cuisine_type: string
  street: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
}

interface ListEntry {
  entry_id: string
  restaurant_id: string
}

type Tab = 'visited' | 'wishlist'

const TAB_CONFIG: { key: Tab; label: string; Icon: typeof CheckCircleIcon }[] = [
  { key: 'visited', label: 'Visited', Icon: CheckCircleIcon },
  { key: 'wishlist', label: 'Wishlist', Icon: HeartIcon },
]

function confirmDelete(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message))
  }
  return new Promise((resolve) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
    ])
  })
}

export default function RestaurantsScreen() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [visitedEntries, setVisitedEntries] = useState<ListEntry[]>([])
  const [wishlistEntries, setWishlistEntries] = useState<ListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addWishlistVisible, setAddWishlistVisible] = useState(false)
  const [addVisitedVisible, setAddVisitedVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('visited')

  const fetchAllData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      apiClient.get<{ restaurants: Restaurant[] }>('/restaurant/'),
      apiClient.get<{ entries: ListEntry[] }>(`/restaurant/visited/${user!.user_id}`),
      apiClient.get<{ entries: ListEntry[] }>(`/restaurant/wishlist/${user!.user_id}`),
    ])
      .then(([restaurantsData, visitedData, wishlistData]) => {
        setRestaurants(restaurantsData.restaurants)
        setVisitedEntries(visitedData.entries)
        setWishlistEntries(wishlistData.entries)
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? `Error ${err.status}: ${err.body}`
            : err.message
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
  }

  const visitedIds = useMemo(
    () => new Set(visitedEntries.map((e) => e.restaurant_id)),
    [visitedEntries],
  )
  const wishlistIds = useMemo(
    () => new Set(wishlistEntries.map((e) => e.restaurant_id)),
    [wishlistEntries],
  )

  const filteredRestaurants = useMemo(
    () =>
      restaurants.filter((r) => {
        if (activeTab === 'visited') return visitedIds.has(r.restaurant_id)
        if (activeTab === 'wishlist') return wishlistIds.has(r.restaurant_id)
        return false
      }),
    [restaurants, visitedIds, wishlistIds, activeTab],
  )

  const wishlistRestaurants = useMemo(
    () => restaurants.filter((r) => wishlistIds.has(r.restaurant_id)),
    [restaurants, wishlistIds],
  )

  const handleAddToWishlist = async (googlePlaceId: string) => {
    const res = await apiClient.post<{ restaurant_id: string; success: boolean }>(
      '/restaurant/',
      { google_place_id: googlePlaceId },
    )
    await apiClient.post('/restaurant/wishlist', {
      user_id: user!.user_id,
      restaurant_id: res.restaurant_id,
    })
  }

  const handleAddVisitedFromSearch = async (googlePlaceId: string) => {
    const res = await apiClient.post<{ restaurant_id: string; success: boolean }>(
      '/restaurant/',
      { google_place_id: googlePlaceId },
    )
    await apiClient.post('/restaurant/visited', {
      user_id: user!.user_id,
      restaurant_id: res.restaurant_id,
    })
  }

  const handleAddVisitedFromWishlist = async (restaurantId: string) => {
    await apiClient.post('/restaurant/visited/from-wishlist', {
      user_id: user!.user_id,
      restaurant_id: restaurantId,
    })
  }

  const handleDeleteEntry = async (restaurantId: string) => {
    const entries = activeTab === 'visited' ? visitedEntries : wishlistEntries
    const entry = entries.find((e) => e.restaurant_id === restaurantId)
    if (!entry) return

    const label = activeTab === 'visited' ? 'visited list' : 'wishlist'
    const confirmed = await confirmDelete(`Remove from ${label}?`)
    if (!confirmed) return

    const path =
      activeTab === 'visited'
        ? `/restaurant/visited/${entry.entry_id}`
        : `/restaurant/wishlist/${entry.entry_id}`
    await apiClient.delete(path)
    fetchAllData()
  }

  const refreshAfterAdd = () => {
    fetchAllData()
  }

  const openAddModal = () => {
    if (activeTab === 'wishlist') setAddWishlistVisible(true)
    if (activeTab === 'visited') setAddVisitedVisible(true)
  }

  const emptyMessage =
    activeTab === 'visited'
      ? 'No visited restaurants yet.'
      : 'Your wishlist is empty.'

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Restaurants',
          headerRight: () => (
            <Pressable onPress={openAddModal} hitSlop={8}>
              <PlusIcon size={24} color="#fff" weight="bold" />
            </Pressable>
          ),
        }}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map(({ key, label, Icon }) => {
          const active = activeTab === key
          return (
            <Pressable
              key={key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabChange(key)}
            >
              <Icon
                size={18}
                color={active ? '#fff' : 'rgba(255,255,255,0.4)'}
                weight={active ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredRestaurants.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <Pressable style={styles.emptyAddButton} onPress={openAddModal}>
            <PlusIcon size={18} color="#fff" weight="bold" />
            <Text style={styles.emptyAddButtonText}>
              {activeTab === 'wishlist' ? 'Add to wishlist' : 'Add visited restaurant'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRestaurants}
          keyExtractor={(item) => item.restaurant_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              <View style={styles.cardWrapper}>
                <RestaurantCard restaurant={item} />
              </View>
              <Pressable
                style={styles.deleteEntryButton}
                onPress={() => handleDeleteEntry(item.restaurant_id)}
              >
                <TrashIcon size={18} color="#ff6b6b" />
              </Pressable>
            </View>
          )}
        />
      )}

      {/* Wishlist tab: Google search modal */}
      <AddRestaurantModal
        visible={addWishlistVisible}
        onClose={() => setAddWishlistVisible(false)}
        onCreated={() => {
          setAddWishlistVisible(false)
          refreshAfterAdd()
        }}
        onSubmit={handleAddToWishlist}
      />

      {/* Visited tab: pick from wishlist or Google search */}
      <AddVisitedModal
        visible={addVisitedVisible}
        onClose={() => setAddVisitedVisible(false)}
        onCreated={() => {
          setAddVisitedVisible(false)
          refreshAfterAdd()
        }}
        wishlistRestaurants={wishlistRestaurants}
        onSelectFromWishlist={handleAddVisitedFromWishlist}
        onSubmitFromSearch={handleAddVisitedFromSearch}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardWrapper: {
    flex: 1,
  },
  deleteEntryButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginBottom: 16,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0.8,0.3,0.6,0.75)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
  },
})
