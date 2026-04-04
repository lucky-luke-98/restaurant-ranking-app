import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  ownCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.borderOwnCard,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  date: {
    color: colors.textFaint,
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ratingLabel: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  ratingValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  comment: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
})
