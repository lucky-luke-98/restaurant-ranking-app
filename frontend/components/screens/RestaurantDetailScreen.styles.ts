import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  infoSection: {
    marginBottom: 24,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cuisineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundInput,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  cuisineBadge: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  address: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: colors.backgroundCard,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  statsSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statsSummaryLabel: {
    color: colors.textFaint,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundButton,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 14,
  },
  hintText: {
    color: colors.textFaint,
    fontSize: 12,
    fontStyle: 'italic',
    flexShrink: 1,
    textAlign: 'right',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
})
