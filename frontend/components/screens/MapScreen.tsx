import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { CheckFatIcon } from 'phosphor-react-native'
import apiClient from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import { useTranslation } from '@/services/LanguageContext'
import { useAppTheme } from '@/services/ThemeContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { tagLabel } from '@/constants/Tags'
import RestaurantMap, { type MapRestaurant } from '@/components/maps/RestaurantMap'
import RestaurantPopupCard from '@/components/maps/RestaurantPopupCard'
import ClusterSheet from '@/components/maps/ClusterSheet'
import { createStyles } from './MapScreen.styles'

interface Restaurant {
  restaurant_id: string
  name: string
  tags?: string[]
  street?: string
  city?: string
  latitude: number | null
  longitude: number | null
}

interface RestaurantStats {
  count: number
  avg_rating: number | null
}

export default function MapScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { mode } = useAppTheme()
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [statsByRestaurantId, setStatsByRestaurantId] = useState<Map<string, RestaurantStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [visible, setVisible] = useState({ visited: true, wishlist: true })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cluster, setCluster] = useState<{
    members: MapRestaurant[]
    total: number
    zoomTo: () => void
  } | null>(null)

  const toggleLayer = useCallback((layer: 'visited' | 'wishlist') => {
    setVisible((prev) => ({ ...prev, [layer]: !prev[layer] }))
    setCluster(null)
  }, [])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [allRes, visitedRes, wishlistRes] = await Promise.all([
        apiClient.get<{ restaurants: Restaurant[] }>('/restaurant'),
        apiClient.get<{ entries: { restaurant_id: string }[] }>('/visited/me'),
        apiClient.get<{ entries: { restaurant_id: string }[] }>('/wishlist/me'),
      ])
      setRestaurants(allRes.restaurants)
      const visited = new Set(visitedRes.entries.map((e) => e.restaurant_id))
      const wishlist = new Set(wishlistRes.entries.map((e) => e.restaurant_id))
      setVisitedIds(visited)
      setWishlistIds(wishlist)

      const relevantIds = Array.from(new Set([...visited, ...wishlist]))
      if (relevantIds.length > 0) {
        try {
          const query = relevantIds.map((id) => `restaurant_ids=${encodeURIComponent(id)}`).join('&')
          const statsRes = await apiClient.get<{
            stats: { restaurant_id: string; count: number; avg_rating: number | null }[]
          }>(`/review/food-review-stats?${query}`)
          const map = new Map<string, RestaurantStats>()
          for (const s of statsRes.stats) {
            map.set(s.restaurant_id, { count: s.count, avg_rating: s.avg_rating })
          }
          setStatsByRestaurantId(map)
        } catch {
          setStatsByRestaurantId(new Map())
        }
      }
    } catch {
      // silently fail – map will just be empty
    } finally {
      setLoading(false)
      setHasLoadedOnce(true)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const allMapRestaurants = useMemo<MapRestaurant[]>(() => {
    const out: MapRestaurant[] = []
    for (const r of restaurants) {
      if (r.latitude == null || r.longitude == null) continue
      const isVisited = visitedIds.has(r.restaurant_id)
      const isWishlist = wishlistIds.has(r.restaurant_id)
      if (!isVisited && !isWishlist) continue
      out.push({
        restaurant_id: r.restaurant_id,
        name: r.name,
        tags: r.tags ?? [],
        street: r.street,
        city: r.city,
        latitude: r.latitude,
        longitude: r.longitude,
        status: isVisited ? 'visited' : 'wishlist',
      })
    }
    return out
  }, [restaurants, visitedIds, wishlistIds])

  const shownRestaurants = useMemo(
    () => allMapRestaurants.filter((r) => visible[r.status]),
    [allMapRestaurants, visible],
  )

  const handleOpenRestaurant = useCallback(
    (id: string) => router.push(`/restaurant/${id}` as any),
    [router],
  )

  const tagsLabelFor = useCallback(
    (tags: string[]) => tags.map((tag) => tagLabel(tag, t)).join(' \u00B7 '),
    [t],
  )

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    setCluster(null)
  }, [])

  const handleOpenCluster = useCallback(
    (payload: { members: MapRestaurant[]; total: number; zoomTo: () => void }) => {
      setSelectedId(null)
      setCluster(payload)
    },
    [],
  )

  const handleZoomFromCluster = useCallback(() => {
    cluster?.zoomTo()
    setCluster(null)
  }, [cluster])

  const mapLabels = useMemo(
    () => ({
      clusterAria: (total: number, visited: number, wishlist: number) =>
        `${t.mapClusterTitle(total)} — ${t.mapClusterBreakdown(visited, wishlist)}`,
      fitBounds: t.mapFitBounds,
    }),
    [t],
  )

  const renderPopup = useCallback(
    (restaurant: MapRestaurant) => (
      <RestaurantPopupCard
        restaurant={restaurant}
        stats={statsByRestaurantId.get(restaurant.restaurant_id)}
        tagsLabel={tagsLabelFor(restaurant.tags)}
        noReviewsLabel={t.emptyReviews}
        colors={colors}
        userId={user?.user_id ?? ''}
        onPress={() => handleOpenRestaurant(restaurant.restaurant_id)}
      />
    ),
    [statsByRestaurantId, tagsLabelFor, t.emptyReviews, colors, user?.user_id, handleOpenRestaurant],
  )

  // Only gate the very first load: unmounting RestaurantMap on a refetch would
  // destroy and rebuild the WebGL map, losing the viewport and all map state.
  if (loading && !hasLoadedOnce) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <RestaurantMap
        restaurants={shownRestaurants}
        colors={colors}
        mode={mode}
        selectedId={selectedId}
        onSelect={handleSelect}
        onOpenCluster={handleOpenCluster}
        renderPopup={renderPopup}
        loadErrorLabel={t.mapLoadFailed}
        labels={mapLabels}
      />

      {cluster && (
        <ClusterSheet
          members={cluster.members}
          total={cluster.total}
          colors={colors}
          statsByRestaurantId={statsByRestaurantId}
          tagsLabelFor={tagsLabelFor}
          labels={{
            title: t.mapClusterTitle,
            breakdown: t.mapClusterBreakdown,
            more: t.mapClusterMore,
            zoomIn: t.mapZoomIn,
            noRating: t.mapNoRating,
          }}
          onSelect={handleOpenRestaurant}
          onZoom={handleZoomFromCluster}
          onClose={() => setCluster(null)}
        />
      )}

      {!cluster && (
        <View style={styles.legend}>
          <Pressable
            style={[styles.legendItem, !visible.visited && styles.legendItemInactive]}
            onPress={() => toggleLayer('visited')}
          >
            <View style={[styles.dot, { backgroundColor: colors.success }]}>
              {visible.visited && <CheckFatIcon size={10} color="#fff" weight="fill" />}
            </View>
            <Text style={styles.legendText}>{t.mapVisited}</Text>
          </Pressable>
          <Pressable
            style={[styles.legendItem, !visible.wishlist && styles.legendItemInactive]}
            onPress={() => toggleLayer('wishlist')}
          >
            <View style={[styles.dot, { backgroundColor: colors.warning }]}>
              {visible.wishlist && <CheckFatIcon size={10} color="#fff" weight="fill" />}
            </View>
            <Text style={styles.legendText}>{t.mapWishlist}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
