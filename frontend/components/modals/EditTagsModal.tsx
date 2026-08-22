import { useEffect, useMemo, useState } from 'react'
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'
import TagPicker from '@/components/tags/TagPicker'
import { createStyles } from './EditTagsModal.styles'

interface EditTagsModalProps {
  visible: boolean
  initialTags: string[]
  knownTags: string[]
  canCreate: boolean
  canRemove: boolean
  onClose: () => void
  onSave: (add: string[], remove: string[]) => Promise<void>
}

export default function EditTagsModal({
  visible,
  initialTags,
  knownTags,
  canCreate,
  canRemove,
  onClose,
  onSave,
}: EditTagsModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { sheetStyle } = useWebModalEffects(visible)
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setTags(initialTags)
      setError(null)
    }
  }, [visible, initialTags])

  const add = tags.filter((tag) => !initialTags.includes(tag))
  const remove = initialTags.filter((tag) => !tags.includes(tag))
  const dirty = add.length > 0 || remove.length > 0

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(add, remove)
      onClose()
    } catch (err: any) {
      setError(err.message ?? t.tagsUpdateFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, sheetStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.editTags}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeButton}>{'✕'}</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {!canRemove && <Text style={styles.hint}>{t.tagRemoveOwnerOnly}</Text>}

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <TagPicker
              selected={tags}
              onChange={setTags}
              knownTags={knownTags}
              canCreate={canCreate}
              lockedTags={canRemove ? [] : initialTags}
              disabled={saving}
            />
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>{t.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, (saving || !dirty) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t.save}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
