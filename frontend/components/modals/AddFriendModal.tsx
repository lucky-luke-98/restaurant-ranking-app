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
  Image,
  ScrollView,
} from 'react-native'
import {
  MagnifyingGlassIcon,
  XIcon,
  PlusIcon,
  UsersThreeIcon,
} from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import apiClient from '@/services/apiClient'
import { createStyles } from './AddFriendModal.styles'

interface FriendUser {
  user_id: string
  first_name: string
  last_name: string
  avatar?: string
}

interface AddFriendModalProps {
  visible: boolean
  existingFriendIds: Set<string>
  onClose: () => void
  onFriendAdded: () => void
}

export default function AddFriendModal({
  visible,
  existingFriendIds,
  onClose,
  onFriendAdded,
}: AddFriendModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendUser[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
      setAdding(null)
    }
  }, [visible])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await apiClient.get<{ users: FriendUser[] }>(
          '/users/search',
          { params: { query: query.trim() } },
        )
        setResults(data.users.filter((u) => !existingFriendIds.has(u.user_id)))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, existingFriendIds])

  const handleAdd = async (userId: string) => {
    setAdding(userId)
    try {
      await apiClient.post('/users/friends', { friend_user_id: userId })
      setResults((prev) => prev.filter((u) => u.user_id !== userId))
      onFriendAdded()
    } catch {
      // silently fail
    } finally {
      setAdding(null)
    }
  }

  const trimmed = query.trim()
  const showEmpty = trimmed.length >= 2 && !searching && results.length === 0
  const showHint = trimmed.length < 2

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.addFriendTitle}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <XIcon size={18} color={colors.text} weight="bold" />
            </Pressable>
          </View>

          <View style={styles.searchWrapper}>
            <MagnifyingGlassIcon size={18} color={colors.textFaint} weight="bold" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t.searchFriends}
              placeholderTextColor={colors.textPlaceholder}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <XIcon size={16} color={colors.textFaint} weight="bold" />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
          >
            {showHint && (
              <View style={styles.emptyState}>
                <MagnifyingGlassIcon size={32} color={colors.textFaint} weight="regular" />
                <Text style={styles.emptyStateText}>{t.searchToStart}</Text>
              </View>
            )}

            {searching && (
              <ActivityIndicator size="small" style={{ paddingVertical: 16 }} />
            )}

            {showEmpty && (
              <View style={styles.emptyState}>
                <UsersThreeIcon size={32} color={colors.textFaint} weight="regular" />
                <Text style={styles.emptyStateText}>{t.noUsersFound}</Text>
              </View>
            )}

            {results.map((u) => (
              <View key={u.user_id} style={styles.row}>
                {u.avatar ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${u.avatar}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {u.first_name[0]}{u.last_name[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {u.first_name} {u.last_name}
                </Text>
                <Pressable
                  style={[styles.addButton, adding === u.user_id && styles.addButtonDisabled]}
                  onPress={() => handleAdd(u.user_id)}
                  disabled={adding === u.user_id}
                >
                  {adding === u.user_id ? (
                    <ActivityIndicator size={14} color={colors.background} />
                  ) : (
                    <>
                      <PlusIcon size={14} color={colors.background} weight="bold" />
                      <Text style={styles.addButtonText}>{t.addFriend}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
