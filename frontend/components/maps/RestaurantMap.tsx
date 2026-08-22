import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import type { ThemeColors } from '@/constants/Colors'
import type { ThemeMode } from '@/services/ThemeContext'
import { useMapLib } from './useMapLib'
import { MAP_ATTRIBUTION, MAP_STYLE_URLS, DEFAULT_CENTER, DEFAULT_ZOOM } from './mapStyles'
import RestaurantPin from './RestaurantPin'
import ClusterDonut from './ClusterDonut'
import { useMapChrome } from './useMapChrome'

const SOURCE_ID = 'restaurants'
const CLUSTER_MAX_ZOOM = 16
const FIT_PADDING = 64
const FIT_MAX_ZOOM = 15

export interface MapRestaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  street?: string
  city?: string
  latitude: number
  longitude: number
  status: 'visited' | 'wishlist'
}

interface RestaurantMapProps {
  restaurants: MapRestaurant[]
  colors: ThemeColors
  mode: ThemeMode
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOpenCluster: (payload: { members: MapRestaurant[]; total: number; zoomTo: () => void }) => void
  renderPopup: (restaurant: MapRestaurant) => React.ReactNode
  loadErrorLabel: string
  labels: {
    clusterAria: (total: number, visited: number, wishlist: number) => string
    fitBounds: string
  }
}

type ClusterFeature = {
  key: string
  isCluster: boolean
  longitude: number
  latitude: number
  clusterId?: number
  total: number
  visited: number
  restaurantId?: string
  cuisine?: string
  status?: 'visited' | 'wishlist'
}

const bindMarkerA11y = (label: string) => (instance: any) => {
  const el = instance?.getElement?.()
  if (!el) return
  el.setAttribute('aria-label', label)
  el.setAttribute('tabindex', '0')
  if (el.dataset.a11yBound) return
  el.dataset.a11yBound = '1'
  el.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      el.click()
    }
  })
}

export default function RestaurantMap({
  restaurants,
  colors,
  mode,
  selectedId,
  onSelect,
  onOpenCluster,
  renderPopup,
  loadErrorLabel,
  labels,
}: RestaurantMapProps) {
  const { lib, error } = useMapLib()
  const mapRef = useRef<any>(null)
  const byId = useMemo(
    () => new Map(restaurants.map((r) => [r.restaurant_id, r])),
    [restaurants],
  )
  const clusterLabel = useCallback(
    (total: number, visited: number) => labels.clusterAria(total, visited, total - visited),
    [labels],
  )
  const [features, setFeatures] = useState<ClusterFeature[]>([])
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [styleError, setStyleError] = useState(false)
  const signatureRef = useRef('')

  useMapChrome(colors, mode)

  const data = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: restaurants.map((r) => ({
        type: 'Feature' as const,
        id: r.restaurant_id,
        properties: {
          restaurant_id: r.restaurant_id,
          cuisine_type: r.cuisine_type,
          status: r.status,
        },
        geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
      })),
    }),
    [restaurants],
  )

  const initialBounds = useMemo(() => {
    if (restaurants.length === 0) return null
    let w = 180, s = 90, e = -180, n = -90
    for (const r of restaurants) {
      w = Math.min(w, r.longitude)
      e = Math.max(e, r.longitude)
      s = Math.min(s, r.latitude)
      n = Math.max(n, r.latitude)
    }
    return [[w, s], [e, n]] as [[number, number], [number, number]]
  }, [restaurants])

  const syncFeatures = useCallback(() => {
    const map = mapRef.current?.getMap?.()
    if (!map || !map.getSource(SOURCE_ID)) return
    let raw: any[] = []
    try {
      raw = map.querySourceFeatures(SOURCE_ID)
    } catch {
      return
    }
    // During a zoom transition MapLibre keeps tiles from the old level renderable
    // alongside the new one, so querySourceFeatures can return a cluster and its own
    // member points at once. Keep only the deepest level present.
    // (`tile` is an internal stamp; fall back to accepting everything if it is absent.)
    let deepest = -1
    for (const f of raw) {
      const z = (f as any).tile?.z
      if (typeof z === 'number' && z > deepest) deepest = z
    }

    const seen = new Map<string, ClusterFeature>()
    for (const f of raw) {
      const p = f.properties ?? {}
      const coords = f.geometry?.coordinates
      if (!coords) continue
      const tileZ = (f as any).tile?.z
      if (deepest >= 0 && typeof tileZ === 'number' && tileZ !== deepest) continue
      if (p.cluster) {
        const key = `c:${p.cluster_id}`
        if (seen.has(key)) continue
        seen.set(key, {
          key,
          isCluster: true,
          longitude: coords[0],
          latitude: coords[1],
          clusterId: p.cluster_id,
          total: p.point_count ?? 0,
          visited: p.visited ?? 0,
        })
      } else {
        const key = `p:${p.restaurant_id}`
        if (seen.has(key)) continue
        seen.set(key, {
          key,
          isCluster: false,
          longitude: coords[0],
          latitude: coords[1],
          total: 1,
          visited: p.status === 'visited' ? 1 : 0,
          restaurantId: p.restaurant_id,
          cuisine: p.cuisine_type,
          status: p.status,
        })
      }
    }
    const next = Array.from(seen.values())
    const signature = next
      .map((f) => `${f.key}@${f.longitude.toFixed(5)},${f.latitude.toFixed(5)}:${f.total}/${f.visited}`)
      .sort()
      .join('|')
    if (signature === signatureRef.current) return
    signatureRef.current = signature
    setFeatures(next)
  }, [])

  const handleLoad = useCallback(() => {
    setReady(true)
    syncFeatures()
  }, [syncFeatures])

  useEffect(() => {
    const map = mapRef.current?.getMap?.()
    if (!map || !ready) return
    const onData = (e: any) => {
      if (e.sourceId === SOURCE_ID && e.isSourceLoaded) syncFeatures()
    }
    map.on('moveend', syncFeatures)
    map.on('sourcedata', onData)
    map.on('idle', syncFeatures)
    return () => {
      map.off('moveend', syncFeatures)
      map.off('sourcedata', onData)
      map.off('idle', syncFeatures)
    }
  }, [ready, syncFeatures])

  useEffect(() => {
    if (ready) syncFeatures()
  }, [data, ready, syncFeatures])

  useEffect(() => {
    if (!selectedId || features.length === 0) return
    const stillVisible = features.some((f) => !f.isCluster && f.restaurantId === selectedId)
    if (!stillVisible) onSelect(null)
  }, [features, selectedId, onSelect])

  const fitToRestaurants = useCallback(() => {
    const map = mapRef.current?.getMap?.()
    if (!map || !initialBounds) return
    map.fitBounds(initialBounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration: 600 })
  }, [initialBounds])

  const zoomToCluster = useCallback(async (feature: ClusterFeature) => {
    const map = mapRef.current?.getMap?.()
    const source: any = map?.getSource(SOURCE_ID)
    if (!map) return
    const center: [number, number] = [feature.longitude, feature.latitude]
    let zoom = map.getZoom() + 2
    if (source && feature.clusterId != null) {
      try {
        zoom = Math.max(await source.getClusterExpansionZoom(feature.clusterId), map.getZoom() + 1)
      } catch {
        /* fall back to a fixed step */
      }
    }
    map.easeTo({ center, zoom, duration: 600 })
  }, [])

  const handleClusterPress = useCallback(
    async (feature: ClusterFeature) => {
      const map = mapRef.current?.getMap?.()
      const source: any = map?.getSource(SOURCE_ID)
      if (!source || feature.clusterId == null) return
      try {
        const leaves = await source.getClusterLeaves(feature.clusterId, feature.total, 0)
        const members = leaves
          .map((l: any) => byId.get(l.properties?.restaurant_id))
          .filter(Boolean) as MapRestaurant[]
        onOpenCluster({ members, total: feature.total, zoomTo: () => zoomToCluster(feature) })
      } catch {
        zoomToCluster(feature)
      }
    },
    [byId, onOpenCluster, zoomToCluster],
  )

  if (error || styleError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{loadErrorLabel}</Text>
      </View>
    )
  }

  if (!lib) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  const { MapGL, Source, Layer, Marker, Popup, NavigationControl, AttributionControl } = lib
  const selected = selectedId ? byId.get(selectedId) : undefined

  return (
    <MapGL
      ref={mapRef}
      mapStyle={MAP_STYLE_URLS[mode]}
      initialViewState={
        initialBounds
          ? { bounds: initialBounds, fitBoundsOptions: { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM } }
          : { ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
      }
      maxZoom={19}
      onLoad={handleLoad}
      onError={() => setStyleError(true)}
      onClick={() => onSelect(null)}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <Source
        id={SOURCE_ID}
        type="geojson"
        data={data}
        cluster
        clusterRadius={48}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterProperties={{
          visited: ['+', ['case', ['==', ['get', 'status'], 'visited'], 1, 0]],
        }}
      >
        <Layer id="cluster-probe" type="circle" paint={{ 'circle-radius': 1, 'circle-opacity': 0 }} />
      </Source>

      {features.map((f) =>
        f.isCluster ? (
          <Marker
            key={f.key}
            longitude={f.longitude}
            latitude={f.latitude}
            anchor="center"
            className="map-marker-button"
            ref={bindMarkerA11y(clusterLabel(f.total, f.visited))}
            onClick={(e: any) => {
              e.originalEvent?.stopPropagation()
              handleClusterPress(f)
            }}
          >
            <div
              title={clusterLabel(f.total, f.visited)}
              onMouseEnter={() => setHoveredCluster(f.clusterId ?? null)}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <ClusterDonut
                total={f.total}
                visited={f.visited}
                visitedColor={colors.success}
                wishlistColor={colors.warning}
                fill={colors.backgroundElevated}
                text={colors.text}
                hovered={hoveredCluster === f.clusterId}
              />
            </div>
          </Marker>
        ) : (
          <Marker
            key={f.key}
            longitude={f.longitude}
            latitude={f.latitude}
            anchor="center"
            className="map-marker-button"
            ref={bindMarkerA11y(byId.get(f.restaurantId ?? '')?.name ?? '')}
            onClick={(e: any) => {
              e.originalEvent?.stopPropagation()
              onSelect(f.restaurantId ?? null)
            }}
          >
            <div title={byId.get(f.restaurantId ?? '')?.name ?? ''}>
              <RestaurantPin
                cuisine={f.cuisine ?? 'others'}
                background={f.status === 'visited' ? colors.success : colors.warning}
                ring={colors.backgroundElevated}
                selected={selectedId === f.restaurantId}
              />
            </div>
          </Marker>
        ),
      )}

      {selected && (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          offset={22}
          closeButton={false}
          closeOnClick={false}
          focusAfterOpen={false}
          onClose={() => onSelect(null)}
          maxWidth="280px"
        >
          {renderPopup(selected)}
        </Popup>
      )}

      <NavigationControl position="top-right" showCompass={false} />
      <AttributionControl position="bottom-right" compact customAttribution={MAP_ATTRIBUTION} />
      {initialBounds && (
        <div
          style={{
            position: 'absolute',
            top: 96,
            right: 10,
            zIndex: 2,
          }}
        >
          <button
            type="button"
            onClick={fitToRestaurants}
            aria-label={labels.fitBounds}
            title={labels.fitBounds}
            className="map-chrome-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      )}
    </MapGL>
  )
}
