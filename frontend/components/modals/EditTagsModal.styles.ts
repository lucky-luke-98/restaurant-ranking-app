import { StyleSheet } from 'react-native'
import { ThemeColors } from '@/constants/Colors'

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    color: colors.textMuted,
    fontSize: 18,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 10,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  body: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.backgroundButton,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
