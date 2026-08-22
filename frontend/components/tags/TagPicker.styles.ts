import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    outlineStyle: 'none' as any,
  },
  limitHint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipBlocked: {
    opacity: 0.35,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  createText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
})
