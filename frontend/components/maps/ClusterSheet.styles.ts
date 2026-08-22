import { StyleSheet } from 'react-native'
import type { ThemeColors } from '@/constants/Colors'

export const createClusterSheetStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      maxWidth: 420,
      alignSelf: 'center',
      backgroundColor: colors.backgroundElevated,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
      overflow: 'hidden',
      zIndex: 1200,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
    },
    closeButton: {
      padding: 2,
    },
    list: {
      maxHeight: 264,
    },
    listContent: {
      paddingVertical: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    rowPressed: {
      backgroundColor: colors.background,
    },
    glyph: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    rowName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    rowMeta: {
      color: colors.textMuted,
      fontSize: 11.5,
    },
    rating: {
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 0,
    },
    ratingEmpty: {
      color: colors.textFaint,
      fontSize: 11,
      fontStyle: 'italic',
      flexShrink: 0,
    },
    zoomButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    zoomLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
  })
