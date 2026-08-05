import { useEffect, useMemo, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { buildMarkerHtml } from '@/constants/CuisineMapIcons'
import { useThemeColors } from '@/hooks/useThemeColors'

const DEFAULT_CENTER: [number, number] = [50.9375, 6.9603]

interface PinDropMapProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
  height?: number
}

export default function PinDropMap({ latitude, longitude, onChange, height = 220 }: PinDropMapProps) {
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
    }),
    [height, colors.backgroundElevated],
  )

  const ClickHandler = useMemo(() => {
    if (!modules) return null
    const { useMapEvents } = modules.rl
    return function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
      useMapEvents({
        click(e: any) {
          onPick(e.latlng.lat, e.latlng.lng)
        },
      })
      return null
    }
  }, [modules])

  if (!modules || !ClickHandler) {
    return (
      <View style={{ height, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundElevated }}>
        <ActivityIndicator size="small" color={colors.textFaint} />
      </View>
    )
  }

  const { MapContainer, TileLayer, Marker } = modules.rl
  const L = modules.L
  const hasPin = latitude != null && longitude != null
  const center: [number, number] = hasPin ? [latitude!, longitude!] : DEFAULT_CENTER

  const icon = L.divIcon({
    html: buildMarkerHtml('others', colors.success),
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  })

  return (
    <div style={containerStyle}>
      <MapContainer
        center={center}
        zoom={hasPin ? 16 : 13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <ClickHandler onPick={onChange} />
        {hasPin && (
          <Marker
            position={[latitude!, longitude!]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e: any) => {
                const pos = e.target.getLatLng()
                onChange(pos.lat, pos.lng)
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
