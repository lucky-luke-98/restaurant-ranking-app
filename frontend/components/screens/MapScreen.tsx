import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import apiClient from '@/services/apiClient'
import { useAuth } from '@/services/AuthContext'

interface Restaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  latitude: number | null
  longitude: number | null
}

function LeafletMap({
  visitedRestaurants,
  wishlistRestaurants,
  onMarkerPress,
}: {
  visitedRestaurants: Restaurant[]
  wishlistRestaurants: Restaurant[]
  onMarkerPress: (id: string) => void
}) {
  const [leafletReady, setLeafletReady] = useState(false)
  const [modules, setModules] = useState<any>(null)

  useEffect(() => {
    // Dynamic import to avoid SSR issues with window
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
    ]).then(([rl, L]) => {
      // Inject leaflet CSS via a link tag
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

  if (!leafletReady || !modules) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = modules.rl
  const L = modules.L

  // Phosphor ForkKnife bold SVG path (from phosphor-react-native)
  const forkKnifeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="white"><path d="M68 88V40a12 12 0 0 1 24 0v48a12 12 0 0 1-24 0m152-48v184a12 12 0 0 1-24 0v-44h-44a12 12 0 0 1-12-12 273.2 273.2 0 0 1 7.33-57.82c10.09-41.76 29.43-69.85 55.94-81.18A12 12 0 0 1 220 40m-24 22.92C182.6 77 175 98 170.77 115.38a254.4 254.4 0 0 0-6.22 40.62H196ZM128 39a12 12 0 0 0-24 2l4 47.46a28 28 0 0 1-56 0L56 41a12 12 0 1 0-24-2l-4 48v1a52.1 52.1 0 0 0 40 50.59V224a12 12 0 0 0 24 0v-85.41A52.1 52.1 0 0 0 132 88v-1Z"/></svg>`

  const makeIcon = (color: string) =>
    L.divIcon({
      html: `<div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">${forkKnifeSvg}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    })

  const greenIcon = makeIcon('#4CAF50')
  const orangeIcon = makeIcon('#FF9800')

  const allMarkers = [...visitedRestaurants, ...wishlistRestaurants]

  // Calculate bounds or use fallback
  let center: [number, number] = [50.9375, 6.9603]
  let zoom = 12
  let bounds: any = null

  if (allMarkers.length > 0) {
    bounds = L.latLngBounds(
      allMarkers.map((r: Restaurant) => [r.latitude!, r.longitude!] as [number, number]),
    )
  }

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

      {visitedRestaurants.map((r: Restaurant) => (
        <Marker
          key={`v-${r.restaurant_id}`}
          position={[r.latitude!, r.longitude!]}
          icon={greenIcon}
        >
          <Popup>
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => onMarkerPress(r.restaurant_id)}
            >
              <strong>{r.name}</strong>
              <br />
              <span style={{ color: '#666', fontSize: 12 }}>{r.cuisine_type}</span>
              <br />
              <span style={{ color: '#4CAF50', fontSize: 11, fontStyle: 'italic' }}>
                Visited
              </span>
            </div>
          </Popup>
        </Marker>
      ))}

      {wishlistRestaurants.map((r: Restaurant) => (
        <Marker
          key={`w-${r.restaurant_id}`}
          position={[r.latitude!, r.longitude!]}
          icon={orangeIcon}
        >
          <Popup>
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => onMarkerPress(r.restaurant_id)}
            >
              <strong>{r.name}</strong>
              <br />
              <span style={{ color: '#666', fontSize: 12 }}>{r.cuisine_type}</span>
              <br />
              <span style={{ color: '#FF9800', fontSize: 11, fontStyle: 'italic' }}>
                Wishlist
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default function MapScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [allRes, visitedRes, wishlistRes] = await Promise.all([
        apiClient.get<{ restaurants: Restaurant[] }>('/restaurant/'),
        apiClient.get<{ entries: { restaurant_id: string }[] }>(
          `/restaurant/visited/${user.user_id}`,
        ),
        apiClient.get<{ entries: { restaurant_id: string }[] }>(
          `/restaurant/wishlist/${user.user_id}`,
        ),
      ])
      setRestaurants(allRes.restaurants)
      setVisitedIds(new Set(visitedRes.entries.map((e) => e.restaurant_id)))
      setWishlistIds(new Set(wishlistRes.entries.map((e) => e.restaurant_id)))
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
        (r) => wishlistIds.has(r.restaurant_id) && r.latitude != null && r.longitude != null,
      ),
    [restaurants, wishlistIds],
  )

  const handleMarkerPress = useCallback(
    (id: string) => router.push(`/restaurant/${id}` as any),
    [router],
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LeafletMap
        visitedRestaurants={visitedRestaurants}
        wishlistRestaurants={wishlistRestaurants}
        onMarkerPress={handleMarkerPress}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Visited</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Wishlist</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    zIndex: 1000,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#fff',
    fontSize: 12,
  },
})
