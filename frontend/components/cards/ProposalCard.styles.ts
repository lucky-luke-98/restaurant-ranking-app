import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Dashed warning border — deliberately NOT the olive ownCard border, which in this
  // app already means "your saved review". This card is a correctness control: it is
  // the only thing that catches a valid-but-wrong restaurant_id.
  card: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.warning,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: colors.background,
  },
  cardSaved: {
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  cardDiscarded: {
    opacity: 0.5,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.warning,
  },
  statusPillSaved: {
    backgroundColor: colors.primary,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  restaurantAddress: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -4,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  comment: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
  },
  foodHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  foodName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  foodMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cascadeNote: {
    fontSize: 11,
    color: colors.textFaint,
    lineHeight: 15,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  discardButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  discardButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
})
