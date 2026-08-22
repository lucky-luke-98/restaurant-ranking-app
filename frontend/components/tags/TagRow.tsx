import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { tagLabel } from '@/constants/Tags'
import { createStyles } from './TagRow.styles'

interface TagRowProps {
  tags: string[]
  /** Cap the chips rendered, collapsing the rest into a "+N" chip. Omit to show all. */
  maxVisible?: number
  compact?: boolean
}

export default function TagRow({ tags, maxVisible, compact = false }: TagRowProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (tags.length === 0) return null

  const visible = maxVisible ? tags.slice(0, maxVisible) : tags
  const hidden = tags.length - visible.length

  return (
    <View style={styles.row}>
      {visible.map((tag) => (
        <View key={tag} style={[styles.chip, compact && styles.chipCompact]}>
          <Text style={[styles.chipText, compact && styles.chipTextCompact]} numberOfLines={1}>
            {tagLabel(tag, t)}
          </Text>
        </View>
      ))}
      {hidden > 0 && (
        <View style={[styles.chip, compact && styles.chipCompact]}>
          <Text style={[styles.chipText, compact && styles.chipTextCompact]}>{`+${hidden}`}</Text>
        </View>
      )}
    </View>
  )
}
