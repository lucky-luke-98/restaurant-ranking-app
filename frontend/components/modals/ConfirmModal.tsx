import { useMemo } from 'react'
import { View, Text, Modal, Pressable } from 'react-native'
import { StyleSheet } from 'react-native'
import { WarningIcon } from 'phosphor-react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ThemeColors } from '@/constants/Colors'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'

interface ConfirmModalProps {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  useWebModalEffects(visible)

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <WarningIcon
            size={36}
            color={destructive ? colors.error : colors.warning}
            weight="duotone"
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                destructive && styles.confirmButtonDestructive,
                pressed && styles.buttonPressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, destructive && styles.confirmTextDestructive]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
      padding: 32,
    },
    card: {
      backgroundColor: colors.backgroundElevated,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      width: '100%',
      maxWidth: 340,
      gap: 12,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    message: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.backgroundButton,
      alignItems: 'center',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.backgroundButtonStrong,
      alignItems: 'center',
    },
    confirmButtonDestructive: {
      backgroundColor: colors.errorBackground,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    cancelText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    confirmText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    confirmTextDestructive: {
      color: colors.error,
    },
  })
