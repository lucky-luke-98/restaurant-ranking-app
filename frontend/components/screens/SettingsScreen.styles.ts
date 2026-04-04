import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
  },
  toggleOptionActive: {
    backgroundColor: colors.text,
  },
  toggleText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.background,
  },
})
