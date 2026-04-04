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
    maxHeight: '85%',
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
  error: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.textTertiary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInputSingle: {
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    marginBottom: 16,
    paddingRight: 14,
  },
  priceInput: {
    flex: 1,
    padding: 14,
    color: colors.text,
    fontSize: 15,
  },
  currencyLabel: {
    color: colors.textTertiary,
    fontSize: 18,
    fontWeight: '600',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  imageButton: {
    backgroundColor: colors.backgroundInput,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageButtonText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewRow: {
    marginBottom: 16,
  },
  imagePreviewWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  imageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.imageRemoveBackground,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageRemoveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: colors.backgroundButtonStrong,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
})
