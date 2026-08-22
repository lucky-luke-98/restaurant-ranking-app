import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.backgroundButton,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 1,
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  chipTextCompact: {
    fontSize: 11,
  },
})
