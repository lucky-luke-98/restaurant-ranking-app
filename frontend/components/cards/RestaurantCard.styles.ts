import { StyleSheet } from 'react-native'
import { ThemeColors, ThemeShadows } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundInput,
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer' as any,
    flexDirection: 'row',
    gap: 14,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  emblem: {
    width: 52,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  cuisineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundButton,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cuisine: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    color: colors.textMuted,
    fontSize: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.backgroundButton,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  commentRowPressed: {
    opacity: 0.7,
  },
  commentText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  commentIcon: {
    marginTop: 2,
  },
  commentEditIcon: {
    marginTop: 3,
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
  },
  addCommentText: {
    color: colors.textFaint,
    fontSize: 13,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsLeft: {
    flex: 1,
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsRating: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsCount: {
    color: colors.textFaint,
    fontSize: 13,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.errorBackground,
  },
})
