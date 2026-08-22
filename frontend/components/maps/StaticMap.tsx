import { useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useAppTheme } from '@/services/ThemeContext'
import RestaurantPin from './RestaurantPin'

const TILE = 256

/**
 * A non-interactive map rendered as plain raster <img> tiles.
 *
 * Deliberately does NOT use MapLibre: this renders once per feed card, and a WebGL
 * context per card exhausts the browser's context limit (~8-16) on a scrolling list.
 */
interface StaticMapProps {
  latitude: number
  longitude: number
  cuisineType: string
  height?: number
  zoom?: number
  onPress?: () => void
}

function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE * 2 ** zoom
  const sinLat = Math.sin((latitude * Math.PI) / 180)
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  }
}

export default function StaticMap({
  latitude,
  longitude,
  cuisineType,
  height = 140,
  zoom = 13,
  onPress,
}: StaticMapProps) {
  const colors = useThemeColors()
  const { mode } = useAppTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev))
    })
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  const variant = mode === 'dark' ? 'dark_all' : 'light_all'

  const tiles = useMemo(() => {
    if (width <= 0) return []
    const { x, y } = project(latitude, longitude, zoom)
    const left = x - width / 2
    const top = y - height / 2
    const count = 2 ** zoom
    const out: { key: string; url: string; left: number; top: number }[] = []

    for (let col = Math.floor(left / TILE); col <= Math.floor((left + width - 1) / TILE); col++) {
      for (let row = Math.floor(top / TILE); row <= Math.floor((top + height - 1) / TILE); row++) {
        if (row < 0 || row >= count) continue
        const wrapped = ((col % count) + count) % count
        out.push({
          key: `${col}:${row}`,
          url: `https://basemaps.cartocdn.com/${variant}/${zoom}/${wrapped}/${row}@2x.png`,
          left: col * TILE - left,
          top: row * TILE - top,
        })
      }
    }
    return out
  }, [latitude, longitude, zoom, width, height, variant])

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.backgroundElevated }}>
      <div
        ref={ref}
        onClick={onPress}
        style={{
          position: 'relative',
          width: '100%',
          height,
          overflow: 'hidden',
          cursor: onPress ? 'pointer' : 'default',
          backgroundColor: colors.backgroundElevated,
        }}
      >
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            loading="lazy"
            width={TILE}
            height={TILE}
            style={{
              position: 'absolute',
              left: t.left,
              top: t.top,
              width: TILE,
              height: TILE,
              userSelect: 'none',
            }}
          />
        ))}

        {width > 0 && (
          <div
            style={{
              position: 'absolute',
              left: width / 2,
              top: height / 2,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <RestaurantPin cuisine={cuisineType} background={colors.success} ring={colors.backgroundElevated} />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            right: 3,
            bottom: 2,
            fontSize: 8,
            lineHeight: '10px',
            padding: '0 3px',
            borderRadius: 3,
            color: colors.textMuted,
            background: colors.legendBackground,
            pointerEvents: 'none',
          }}
        >
          © OpenStreetMap, CARTO
        </div>
      </div>
    </View>
  )
}
