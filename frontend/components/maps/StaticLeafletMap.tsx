import { useEffect, useMemo, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { buildMarkerHtml } from '@/constants/CuisineMapIcons'
import { useThemeColors } from '@/hooks/useThemeColors'

interface StaticLeafletMapProps {
  latitude: number
  longitude: number
  cuisineType: string
  height?: number
  zoom?: number
  onPress?: () => void
}

export default function StaticLeafletMap({
  latitude,
  longitude,
  cuisineType,
  height = 140,
  zoom = 15,
  onPress,
}: StaticLeafletMapProps) {
  const colors = useThemeColors()
  const [modules, setModules] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([import('react-leaflet'), import('leaflet')]).then(([rl, L]) => {
      if (cancelled) return
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      setModules({ rl, L })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const containerStyle = useMemo(
    () => ({
      height,
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden' as const,
      backgroundColor: colors.backgroundElevated,
      cursor: onPress ? 'pointer' : 'default',
    }),
    [height, colors.backgroundElevated, onPress],
  )

  if (!modules) {
    return (
      <View style={{ height, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundElevated }}>
        <ActivityIndicator size="small" color={colors.textFaint} />
      </View>
    )
  }

  const { MapContainer, TileLayer, Marker } = modules.rl
  const L = modules.L

  const icon = L.divIcon({
    html: buildMarkerHtml(cuisineType, colors.success),
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })

  return (
    <div style={containerStyle} onClick={onPress}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <Marker position={[latitude, longitude]} icon={icon} interactive={false} />
      </MapContainer>
    </div>
  )
}
