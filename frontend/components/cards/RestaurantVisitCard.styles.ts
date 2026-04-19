import { StyleSheet } from 'react-native'
import { ThemeColors, ThemeShadows } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      ...shadows.card,
    },
    attributionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 10,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    avatarFallback: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.backgroundButtonStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: colors.textFaint,
      fontSize: 11,
      fontWeight: '700',
    },
    attributionText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    body: {
      gap: 6,
      marginBottom: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cuisineIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    titleTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    cuisineLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    addressText: {
      color: colors.textSecondary,
      fontSize: 13,
      flexShrink: 1,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingValue: {
      fontSize: 13,
      fontWeight: '700',
    },
    ratingCount: {
      color: colors.textMuted,
      fontSize: 12,
      marginLeft: 2,
    },
    ratingEmpty: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    mapWrap: {
      marginBottom: 12,
    },
    wishlistButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.backgroundElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    wishlistButtonDisabled: {
      opacity: 0.6,
    },
    wishlistButtonText: {
      color: colors.tint,
      fontSize: 14,
      fontWeight: '600',
    },
    wishlistButtonTextDisabled: {
      color: colors.textMuted,
    },
  })
