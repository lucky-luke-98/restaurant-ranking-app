import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './EditWishlistCommentModal.styles'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'

const WISHLIST_COMMENT_MAX = 400

interface EditWishlistCommentModalProps {
  visible: boolean
  initialComment?: string
  onClose: () => void
  onSave: (comment: string) => Promise<void>
}

export default function EditWishlistCommentModal({
  visible,
  initialComment,
  onClose,
  onSave,
}: EditWishlistCommentModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { sheetStyle } = useWebModalEffects(visible)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setComment(initialComment ?? '')
      setError(null)
    }
  }, [visible, initialComment])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(comment.trim())
      onClose()
    } catch (err: any) {
      setError(err.message ?? t.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, sheetStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.wishlistCommentTitle}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeButton}>{'\u2715'}</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={(v) => setComment(v.slice(0, WISHLIST_COMMENT_MAX))}
            placeholder={t.wishlistCommentPlaceholder}
            placeholderTextColor={colors.textPlaceholder}
            multiline
            maxLength={WISHLIST_COMMENT_MAX}
            autoFocus
          />
          <Text style={styles.charCount}>
            {t.charsRemaining(WISHLIST_COMMENT_MAX - comment.length)}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>{t.save}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
