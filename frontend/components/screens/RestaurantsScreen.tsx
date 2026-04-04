import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native'
import { Tabs } from 'expo-router'
import { PlusIcon, CheckCircleIcon, HeartIcon, ForkKnifeIcon } from 'phosphor-react-native'
import apiClient, { ApiError } from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import RestaurantCard from '@/components/cards/RestaurantCard'
import AddRestaurantModal from '@/components/modals/AddRestaurantModal'
import AddVisitedModal from '@/components/modals/AddVisitedModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import DateInput from '@/components/inputs/DateInput'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './RestaurantsScreen.styles'

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

interface FoodReviewStatsEntry {
  restaurant_id: string
  count: number
  avg_rating: number | null
  last_visited: string | null
}

interface ListEntry {
  entry_id: string
  restaurant_id: string
}

type Tab = 'visited' | 'wishlist'

export default function RestaurantsScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [visitedEntries, setVisitedEntries] = useState<ListEntry[]>([])
  const [wishlistEntries, setWishlistEntries] = useState<ListEntry[]>([])
  const [foodStats, setFoodStats] = useState<Record<string, FoodReviewStatsEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addWishlistVisible, setAddWishlistVisible] = useState(false)
  const [addVisitedVisible, setAddVisitedVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('visited')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const fetchAllData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      apiClient.get<{ restaurants: Restaurant[] }>('/restaurant'),
      apiClient.get<{ entries: ListEntry[] }>('/restaurant/visited/me'),
      apiClient.get<{ entries: ListEntry[] }>('/restaurant/wishlist/me'),
    ])
      .then(([restaurantsData, visitedData, wishlistData]) => {
        setRestaurants(restaurantsData.restaurants)
        setVisitedEntries(visitedData.entries)
        setWishlistEntries(wishlistData.entries)

        // Fetch food review stats for all restaurants
        const allIds = restaurantsData.restaurants.map((r: Restaurant) => r.restaurant_id)
        if (allIds.length > 0) {
          const params = new URLSearchParams()
          allIds.forEach((id: string) => params.append('restaurant_ids', id))
          apiClient
            .get<{ stats: FoodReviewStatsEntry[] }>(`/restaurant/food-review-stats?${params.toString()}`)
            .then((statsData) => {
              const map: Record<string, FoodReviewStatsEntry> = {}
              statsData.stats.forEach((s) => { map[s.restaurant_id] = s })
              setFoodStats(map)
            })
            .catch(() => {})
        }
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
        if (activeTab === 'visited') {
          if (!visitedIds.has(r.restaurant_id)) return false
          if (filterFrom || filterTo) {
            const lastVisited = foodStats[r.restaurant_id]?.last_visited
            if (!lastVisited) return false
            if (filterFrom && lastVisited < filterFrom) return false
            if (filterTo && lastVisited > filterTo) return false
          }
          return true
        }
        if (activeTab === 'wishlist') return wishlistIds.has(r.restaurant_id)
        return false
      }),
    [restaurants, visitedIds, wishlistIds, activeTab, filterFrom, filterTo, foodStats],
  )

  const wishlistRestaurants = useMemo(
    () => restaurants.filter((r) => wishlistIds.has(r.restaurant_id)),
    [restaurants, wishlistIds],
  )

  const handleAddToWishlist = async (googlePlaceId: string) => {
    const res = await apiClient.post<{ restaurant_id: string; success: boolean }>(
      '/restaurant',
      { google_place_id: googlePlaceId },
    )
    await apiClient.post('/restaurant/wishlist', {
      restaurant_id: res.restaurant_id,
    })
  }

  const handleAddVisitedFromSearch = async (googlePlaceId: string) => {
    const res = await apiClient.post<{ restaurant_id: string; success: boolean }>(
      '/restaurant',
      { google_place_id: googlePlaceId },
    )
    await apiClient.post('/restaurant/visited', {
      restaurant_id: res.restaurant_id,
    })
  }

  const handleAddVisitedFromWishlist = async (restaurantId: string) => {
    await apiClient.post('/restaurant/visited/from-wishlist', {
      restaurant_id: restaurantId,
    })
  }

  const handleDeleteEntry = (restaurantId: string) => {
    setDeleteConfirmId(restaurantId)
  }

  const executeDeleteEntry = async () => {
    if (!deleteConfirmId) return
    const entries = activeTab === 'visited' ? visitedEntries : wishlistEntries
    const entry = entries.find((e) => e.restaurant_id === deleteConfirmId)
    setDeleteConfirmId(null)
    if (!entry) return
    const path = activeTab === 'visited'
      ? `/restaurant/visited/${entry.entry_id}`
      : `/restaurant/wishlist/${entry.entry_id}`
    await apiClient.delete(path)
    fetchAllData()
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchAllData()
  }, [fetchAllData])

  useEffect(() => {
    if (!loading) setRefreshing(false)
  }, [loading])

  const refreshAfterAdd = () => {
    fetchAllData()
  }

  const openAddModal = () => {
    if (activeTab === 'wishlist') setAddWishlistVisible(true)
    if (activeTab === 'visited') setAddVisitedVisible(true)
  }

  const tabConfig: { key: Tab; label: string; Icon: typeof CheckCircleIcon }[] = [
    { key: 'visited', label: t.tabVisited, Icon: CheckCircleIcon },
    { key: 'wishlist', label: t.tabWishlist, Icon: HeartIcon },
  ]

  const emptyMessage =
    activeTab === 'visited'
      ? t.emptyVisited
      : t.emptyWishlist

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          title: t.navRestaurants,
          headerRight: () => (
            <Pressable onPress={openAddModal} hitSlop={8} style={{ marginRight: 16 }}>
              <PlusIcon size={24} color={colors.text} weight="bold" />
            </Pressable>
          ),
        }}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabConfig.map(({ key, label, Icon }) => {
          const active = activeTab === key
          return (
            <Pressable
              key={key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabChange(key)}
            >
              <Icon
                size={18}
                color={active ? colors.text : colors.textFaint}
                weight={active ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {activeTab === 'visited' && (
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <DateInput label={t.filterFrom} value={filterFrom} onChange={setFilterFrom} />
          </View>
          <View style={styles.filterField}>
            <DateInput label={t.filterTo} value={filterTo} onChange={setFilterTo} />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredRestaurants.length === 0 ? (
        <View style={styles.centered}>
          <ForkKnifeIcon size={56} color={colors.textFaint} weight="duotone" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <Pressable style={styles.emptyAddButton} onPress={openAddModal}>
            <PlusIcon size={18} color="#fff" weight="bold" />
            <Text style={styles.emptyAddButtonText}>
              {activeTab === 'wishlist' ? t.addToWishlist : t.addVisitedRestaurant}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRestaurants}
          keyExtractor={(item) => item.restaurant_id}
          contentContainerStyle={styles.list}
          extraData={foodStats}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />
          }
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              stats={foodStats[item.restaurant_id]}
              onDelete={handleDeleteEntry}
            />
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

      <ConfirmModal
        visible={!!deleteConfirmId}
        title={t.confirm}
        message={t.confirmRemoveFrom(activeTab === 'visited' ? t.visitedList : t.wishlist)}
        confirmLabel={t.remove}
        cancelLabel={t.cancel}
        onConfirm={executeDeleteEntry}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </View>
  )
}
