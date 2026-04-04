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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  authorAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.backgroundButtonStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  author: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  date: {
    color: colors.textFaint,
    fontSize: 12,
  },
  editedBadge: {
    color: colors.textFaint,
    fontSize: 11,
    fontStyle: 'italic',
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  foodPrice: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ratingLabel: {
    color: colors.textTertiary,
    fontSize: 13,
    width: 90,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sliderTrack,
    marginHorizontal: 10,
  },
  ratingBarFill: {
    height: 6,
    borderRadius: 3,
  },
  ratingValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  comment: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  imageRow: {
    marginTop: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  imagePlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    color: colors.tint,
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
})
