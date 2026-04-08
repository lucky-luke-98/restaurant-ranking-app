import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: colors.textTertiary,
    fontSize: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: colors.backgroundButtonStrong,
    borderRadius: 10,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.3,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 15,
  },
  resultsList: {
    maxHeight: 350,
  },
  resultItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  resultAddress: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cuisinePrompt: {
    color: colors.textTertiary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cuisineChipPressed: {
    backgroundColor: colors.backgroundButtonStrong,
  },
  cuisineChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlaySubmitting,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submittingText: {
    color: colors.textTertiary,
    fontSize: 15,
  },
})
