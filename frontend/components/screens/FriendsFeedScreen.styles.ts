import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    listContent: {
      padding: 12,
      paddingBottom: 24,
    },
    emptyScroll: {
      flexGrow: 1,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    footerSpinner: {
      paddingVertical: 16,
    },
    endReachedText: {
      color: colors.textFaint,
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 16,
    },
  })
