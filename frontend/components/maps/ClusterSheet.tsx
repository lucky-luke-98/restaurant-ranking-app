import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { XIcon, MagnifyingGlassPlusIcon } from 'phosphor-react-native'
import type { ThemeColors } from '@/constants/Colors'
import { RESTAURANT_GLYPH_PATH } from '@/constants/MapGlyph'
import type { MapRestaurant } from './RestaurantMap'
import { createClusterSheetStyles } from './ClusterSheet.styles'

const MAX_ROWS = 12

export interface ClusterStats {
  count: number
  avg_rating: number | null
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

export default function ClusterSheet({
  members,
  total,
  colors,
  statsByRestaurantId,
  tagsLabelFor,
  labels,
  onSelect,
  onZoom,
  onClose,
}: {
  members: MapRestaurant[]
  total: number
  colors: ThemeColors
  statsByRestaurantId: Map<string, ClusterStats>
  tagsLabelFor: (tags: string[]) => string
  labels: {
    title: (n: number) => string
    breakdown: (visited: number, wishlist: number) => string
    more: (n: number) => string
    zoomIn: string
    noRating: string
  }
  onSelect: (id: string) => void
  onZoom: () => void
  onClose: () => void
}) {
  const styles = useMemo(() => createClusterSheetStyles(colors), [colors])

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'visited' ? -1 : 1
      const ra = statsByRestaurantId.get(a.restaurant_id)?.avg_rating ?? -1
      const rb = statsByRestaurantId.get(b.restaurant_id)?.avg_rating ?? -1
      if (rb !== ra) return rb - ra
      return a.name.localeCompare(b.name)
    })
  }, [members, statsByRestaurantId])

  const visitedCount = useMemo(
    () => members.filter((m) => m.status === 'visited').length,
    [members],
  )

  const shown = sorted.slice(0, MAX_ROWS)
  const overflow = total - shown.length

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{labels.title(total)}</Text>
          <Text style={styles.subtitle}>
            {labels.breakdown(visitedCount, members.length - visitedCount)}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
          <XIcon size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {shown.map((r) => {
          const stats = statsByRestaurantId.get(r.restaurant_id)
          const hasRating = stats && stats.count > 0 && stats.avg_rating != null
          const accent = r.status === 'visited' ? colors.success : colors.warning
          return (
            <Pressable
              key={r.restaurant_id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelect(r.restaurant_id)}
            >
              <View style={[styles.glyph, { backgroundColor: accent }]}>
                <svg width="16" height="16" viewBox="0 0 256 256" fill="#fff">
                  <path d={RESTAURANT_GLYPH_PATH} />
                </svg>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {tagsLabelFor(r.tags)}
                </Text>
              </View>
              {hasRating ? (
                <Text style={[styles.rating, { color: ratingColor(stats!.avg_rating!) }]}>
                  {'★ '}
                  {stats!.avg_rating!.toFixed(1)}
                </Text>
              ) : (
                <Text style={styles.ratingEmpty}>{labels.noRating}</Text>
              )}
            </Pressable>
          )
        })}
      </ScrollView>

      <Pressable style={styles.zoomButton} onPress={onZoom}>
        <MagnifyingGlassPlusIcon size={15} color={colors.text} />
        <Text style={styles.zoomLabel}>
          {overflow > 0 ? labels.more(overflow) : labels.zoomIn}
        </Text>
      </Pressable>
    </View>
  )
}
