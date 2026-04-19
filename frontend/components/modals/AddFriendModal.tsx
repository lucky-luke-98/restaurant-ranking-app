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
  CheckIcon,
  UsersThreeIcon,
} from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useFriends, type FriendUser } from '@/services/FriendsContext'
import apiClient from '@/services/apiClient'
import { createStyles } from './AddFriendModal.styles'

interface AddFriendModalProps {
  visible: boolean
  onClose: () => void
}

type RowState = 'none' | 'requested' | 'incoming' | 'loading'

export default function AddFriendModal({ visible, onClose }: AddFriendModalProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    sendRequest,
    acceptRequest,
    cancelRequest,
  } = useFriends()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendUser[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const friendIds = useMemo(() => new Set(friends.map((f) => f.user_id)), [friends])
  const incomingIds = useMemo(
    () => new Set(incomingRequests.map((u) => u.user_id)),
    [incomingRequests],
  )
  const outgoingIds = useMemo(
    () => new Set(outgoingRequests.map((u) => u.user_id)),
    [outgoingRequests],
  )

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setResults([])
      setBusyId(null)
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
        setResults(data.users.filter((u) => !friendIds.has(u.user_id)))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, friendIds])

  const rowStateFor = (userId: string): RowState => {
    if (busyId === userId) return 'loading'
    if (outgoingIds.has(userId)) return 'requested'
    if (incomingIds.has(userId)) return 'incoming'
    return 'none'
  }

  const handleSend = async (userId: string) => {
    setBusyId(userId)
    try {
      await sendRequest(userId)
    } catch {
      // silently fail
    } finally {
      setBusyId(null)
    }
  }

  const handleAccept = async (userId: string) => {
    setBusyId(userId)
    try {
      await acceptRequest(userId)
    } catch {
      // silently fail
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (userId: string) => {
    setBusyId(userId)
    try {
      await cancelRequest(userId)
    } catch {
      // silently fail
    } finally {
      setBusyId(null)
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

            {results.map((u) => {
              const state = rowStateFor(u.user_id)
              return (
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

                  {state === 'loading' && (
                    <View style={[styles.addButton, styles.addButtonDisabled]}>
                      <ActivityIndicator size={14} color={colors.background} />
                    </View>
                  )}

                  {state === 'requested' && (
                    <Pressable
                      style={[styles.addButton, styles.requestedButton]}
                      onPress={() => handleCancel(u.user_id)}
                    >
                      <CheckIcon size={14} color={colors.textMuted} weight="bold" />
                      <Text style={styles.requestedButtonText}>{t.friendRequested}</Text>
                    </Pressable>
                  )}

                  {state === 'incoming' && (
                    <Pressable
                      style={styles.addButton}
                      onPress={() => handleAccept(u.user_id)}
                    >
                      <CheckIcon size={14} color={colors.background} weight="bold" />
                      <Text style={styles.addButtonText}>{t.friendAccept}</Text>
                    </Pressable>
                  )}

                  {state === 'none' && (
                    <Pressable
                      style={styles.addButton}
                      onPress={() => handleSend(u.user_id)}
                    >
                      <PlusIcon size={14} color={colors.background} weight="bold" />
                      <Text style={styles.addButtonText}>{t.addFriend}</Text>
                    </Pressable>
                  )}
                </View>
              )
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
