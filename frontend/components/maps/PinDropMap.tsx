import { useCallback, useMemo } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useAppTheme } from '@/services/ThemeContext'
import { useMapLib } from './useMapLib'
import { MAP_STYLE_URLS, DEFAULT_CENTER } from './mapStyles'
import { useMapChrome } from './useMapChrome'
import RestaurantPin from './RestaurantPin'

interface PinDropMapProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
  height?: number
}

export default function PinDropMap({ latitude, longitude, onChange, height = 220 }: PinDropMapProps) {
  const colors = useThemeColors()
  const { mode } = useAppTheme()
  const { lib, error } = useMapLib()

  useMapChrome(colors, mode)

  const hasPin = latitude != null && longitude != null

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

  const handleMapClick = useCallback(
    (e: any) => {
      if (e?.lngLat) onChange(e.lngLat.lat, e.lngLat.lng)
    },
    [onChange],
  )

  const handleDragEnd = useCallback(
    (e: any) => {
      if (e?.lngLat) onChange(e.lngLat.lat, e.lngLat.lng)
    },
    [onChange],
  )

  if (error || !lib) {
    return (
      <View
        style={{
          height,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.backgroundElevated,
        }}
      >
        {!error && <ActivityIndicator size="small" color={colors.textFaint} />}
      </View>
    )
  }

  const { MapGL, Marker, NavigationControl } = lib

  return (
    <div style={containerStyle}>
      <MapGL
        mapStyle={MAP_STYLE_URLS[mode]}
        initialViewState={{
          longitude: hasPin ? longitude! : DEFAULT_CENTER.longitude,
          latitude: hasPin ? latitude! : DEFAULT_CENTER.latitude,
          zoom: hasPin ? 16 : 13,
        }}
        onClick={handleMapClick}
        attributionControl={false}
        cursor="crosshair"
        style={{ width: '100%', height: '100%' }}
      >
        {hasPin && (
          <Marker
            longitude={longitude!}
            latitude={latitude!}
            anchor="center"
            draggable
            onDragEnd={handleDragEnd}
            onClick={(e: any) => e.originalEvent?.stopPropagation()}
          >
            <RestaurantPin background={colors.success} ring={colors.backgroundElevated} />
          </Marker>
        )}
        <NavigationControl position="top-right" showCompass={false} />
      </MapGL>
    </div>
  )
}
