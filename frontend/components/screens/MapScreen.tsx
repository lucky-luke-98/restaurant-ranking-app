import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { CheckFatIcon } from 'phosphor-react-native'
import apiClient from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { CUISINE_LABEL_KEYS, type CuisineType } from '@/constants/CuisineTypes'
import { buildMarkerHtml, cuisineIconSvg } from '@/constants/CuisineMapIcons'
import { createStyles } from './MapScreen.styles'

interface Restaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  street?: string
  city?: string
  latitude: number | null
  longitude: number | null
}

interface RestaurantStats {
  count: number
  avg_rating: number | null
}

interface ReviewImage {
  image_id: string
  data: string
  content_type: string
}

interface Review {
  review_id: string
  user_id: string
  coauthor_ids?: string[]
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

function PopupCard({
  restaurant,
  status,
  stats,
  cuisineLabel,
  noReviewsLabel,
  colors,
  userId,
  onPress,
}: {
  restaurant: Restaurant
  status: 'visited' | 'wishlist'
  stats?: RestaurantStats
  cuisineLabel: string
  noReviewsLabel: string
  colors: ReturnType<typeof useThemeColors>
  userId: string
  onPress: () => void
}) {
  const [images, setImages] = useState<ReviewImage[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { reviews } = await apiClient.get<{ reviews: Review[] }>(
          `/review/${restaurant.restaurant_id}`,
        )
        const ownReviews = reviews.filter(
          (r) => r.user_id === userId || (r.coauthor_ids ?? []).includes(userId),
        )
        const imageResults = await Promise.all(
          ownReviews.map((r) =>
            apiClient
              .get<{ images: ReviewImage[] }>(`/review/${r.review_id}/images`)
              .then((res) => res.images)
              .catch(() => []),
          ),
        )
        if (cancelled) return
        setImages(imageResults.flat().slice(0, 3))
      } catch {
        if (!cancelled) setImages([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [restaurant.restaurant_id, userId])

  const accent = status === 'visited' ? colors.success : colors.warning
  const hasRating = stats && stats.count > 0 && stats.avg_rating != null
  const iconPath = cuisineIconSvg(restaurant.cuisine_type)
  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ')
  const mapsQuery = encodeURIComponent(
    [restaurant.name, address].filter(Boolean).join(', ') ||
      `${restaurant.latitude},${restaurant.longitude}`,
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  return (
    <div
      onClick={onPress}
      style={{
        cursor: 'pointer',
        minWidth: 220,
        maxWidth: 260,
        fontFamily: 'inherit',
        color: colors.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          dangerouslySetInnerHTML={{
            __html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="white"><path d="${iconPath}"/></svg>`,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '18px',
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {restaurant.name}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {cuisineLabel}
          </div>
        </div>
      </div>

      {address && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: colors.link,
            textDecoration: 'none',
            marginBottom: 6,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{
              flexShrink: 0,
              marginLeft: -2,
              transform: 'translateY(-1px)',
            }}
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
          {address}
        </a>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          marginBottom: images.length > 0 ? 10 : 0,
        }}
      >
        {hasRating ? (
          <>
            <span
              style={{
                color: ratingColor(stats!.avg_rating!),
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ★
            </span>
            <span
              style={{
                color: ratingColor(stats!.avg_rating!),
                fontWeight: 600,
              }}
            >
              {stats!.avg_rating!.toFixed(1)}
            </span>
            <span style={{ color: colors.textMuted }}>({stats!.count})</span>
          </>
        ) : (
          <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>
            {noReviewsLabel}
          </span>
        )}
      </div>

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {images.map((img) => (
            <img
              key={img.image_id}
              src={`data:${img.content_type};base64,${img.data}`}
              alt=""
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                objectFit: 'cover',
                border: `1px solid ${colors.border}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeafletMap({
  visitedRestaurants,
  wishlistRestaurants,
  statsByRestaurantId,
  onMarkerPress,
  colors,
  userId,
  cuisineLabelFor,
  noReviewsLabel,
}: {
  visitedRestaurants: Restaurant[]
  wishlistRestaurants: Restaurant[]
  statsByRestaurantId: Map<string, RestaurantStats>
  onMarkerPress: (id: string) => void
  colors: ReturnType<typeof useThemeColors>
  userId: string
  cuisineLabelFor: (cuisine: string) => string
  noReviewsLabel: string
}) {
  const styles = useMemo(() => createStyles(colors), [colors])
  const [leafletReady, setLeafletReady] = useState(false)
  const [modules, setModules] = useState<any>(null)

  useEffect(() => {
    Promise.all([import('react-leaflet'), import('leaflet')]).then(([rl, L]) => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      setModules({ rl, L })
      setLeafletReady(true)
    })
  }, [])

  useEffect(() => {
    const id = 'map-popup-theme'
    let style = document.getElementById(id) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = `
      .leaflet-popup-content-wrapper {
        background: ${colors.backgroundElevated} !important;
        color: ${colors.text} !important;
        border-radius: 14px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        padding: 4px;
      }
      .leaflet-popup-content {
        margin: 12px 14px;
      }
      .leaflet-popup-tip {
        background: ${colors.backgroundElevated} !important;
      }
      .leaflet-popup-close-button {
        color: ${colors.textMuted} !important;
      }
    `
  }, [colors])

  if (!leafletReady || !modules) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = modules.rl
  const L = modules.L

  const makeIcon = (cuisine: string, background: string) =>
    L.divIcon({
      html: buildMarkerHtml(cuisine, background),
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22],
    })

  const allMarkers = [...visitedRestaurants, ...wishlistRestaurants]

  const center: [number, number] = [50.9375, 6.9603]
  const zoom = 12
  let bounds: any = null

  if (allMarkers.length > 0) {
    bounds = L.latLngBounds(
      allMarkers.map((r: Restaurant) => [r.latitude!, r.longitude!] as [number, number]),
    )
  }

  const renderMarker = (r: Restaurant, status: 'visited' | 'wishlist') => (
    <Marker
      key={`${status[0]}-${r.restaurant_id}`}
      position={[r.latitude!, r.longitude!]}
      icon={makeIcon(r.cuisine_type, status === 'visited' ? colors.success : colors.warning)}
    >
      <Popup closeButton={false}>
        <PopupCard
          restaurant={r}
          status={status}
          stats={statsByRestaurantId.get(r.restaurant_id)}
          cuisineLabel={cuisineLabelFor(r.cuisine_type)}
          noReviewsLabel={noReviewsLabel}
          colors={colors}
          userId={userId}
          onPress={() => onMarkerPress(r.restaurant_id)}
        />
      </Popup>
    </Marker>
  )

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      bounds={bounds}
      boundsOptions={{ padding: [50, 50] }}
      style={{ flex: 1, width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {visitedRestaurants.map((r) => renderMarker(r, 'visited'))}
      {wishlistRestaurants.map((r) => renderMarker(r, 'wishlist'))}
    </MapContainer>
  )
}

export default function MapScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [statsByRestaurantId, setStatsByRestaurantId] = useState<Map<string, RestaurantStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState({ visited: true, wishlist: true })

  const toggleLayer = useCallback((layer: 'visited' | 'wishlist') => {
    setVisible((prev) => ({ ...prev, [layer]: !prev[layer] }))
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
          const statsRes = await apiClient.get<{ stats: { restaurant_id: string; count: number; avg_rating: number | null }[] }>(
            `/review/food-review-stats?${query}`,
          )
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
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const visitedRestaurants = useMemo(
    () =>
      restaurants.filter(
        (r) => visitedIds.has(r.restaurant_id) && r.latitude != null && r.longitude != null,
      ),
    [restaurants, visitedIds],
  )

  const wishlistRestaurants = useMemo(
    () =>
      restaurants.filter(
        (r) =>
          wishlistIds.has(r.restaurant_id) &&
          !visitedIds.has(r.restaurant_id) &&
          r.latitude != null &&
          r.longitude != null,
      ),
    [restaurants, wishlistIds, visitedIds],
  )

  const handleMarkerPress = useCallback(
    (id: string) => router.push(`/restaurant/${id}` as any),
    [router],
  )

  const cuisineLabelFor = useCallback(
    (cuisine: string) => {
      const key = CUISINE_LABEL_KEYS[cuisine as CuisineType] as keyof typeof t | undefined
      return key ? (t[key] as string) : cuisine
    },
    [t],
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LeafletMap
        visitedRestaurants={visible.visited ? visitedRestaurants : []}
        wishlistRestaurants={visible.wishlist ? wishlistRestaurants : []}
        statsByRestaurantId={statsByRestaurantId}
        onMarkerPress={handleMarkerPress}
        colors={colors}
        userId={user?.user_id ?? ''}
        cuisineLabelFor={cuisineLabelFor}
        noReviewsLabel={t.emptyReviews}
      />

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
    </View>
  )
}
