import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, Platform, TextInput, RefreshControl } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { SignOutIcon, CameraIcon, PlusIcon, XIcon, GearSixIcon, ShieldCheckIcon } from 'phosphor-react-native'
import { useTranslation, type Language } from '@/services/LanguageContext'
import { useAppTheme, type ThemeMode } from '@/services/ThemeContext'
import { useAuth } from '@/services/AuthContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import apiClient from '@/services/apiClient'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { createStyles } from './ProfileScreen.styles'

interface AdminUser {
  user_id: string
  first_name: string
  last_name: string
  mail: string
  role: string
  last_logged_in?: string
}

interface FriendUser {
  user_id: string
  first_name: string
  last_name: string
  avatar?: string
}

type ProfileTab = 'settings' | 'admin'

const THUMB_SIZE = 200
const JPEG_QUALITY = 0.7

function resizeToThumbnailWeb(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const scale = THUMB_SIZE / Math.max(img.width, img.height)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = uri
  })
}

export default function ProfileScreen() {
  const { t, language, setLanguage } = useTranslation()
  const { mode, setMode } = useAppTheme()
  const { user, logout, refreshUser } = useAuth()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState<ProfileTab>('settings')
  const [uploading, setUploading] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(false)

  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Friends state
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [searching, setSearching] = useState(false)

  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true)
    try {
      const data = await apiClient.get<{ friends: FriendUser[] }>('/users/friends')
      setFriends(data.friends)
    } catch {
      // ignore
    } finally {
      setFriendsLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  const fetchUsers = useCallback(async () => {
    setAdminLoading(true)
    setAdminError(false)
    try {
      const data = await apiClient.get<{ all_users: AdminUser[] }>('/users/')
      setAdminUsers(data.all_users)
    } catch {
      setAdminError(true)
    } finally {
      setAdminLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin && activeTab === 'admin') fetchUsers()
  }, [isAdmin, activeTab, fetchUsers])

  // Debounced user search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await apiClient.get<{ users: FriendUser[] }>(
          '/users/search',
          { params: { query: searchQuery.trim() } },
        )
        const friendIds = new Set(friends.map((f) => f.user_id))
        setSearchResults(data.users.filter((u) => !friendIds.has(u.user_id)))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, friends])

  const handleAddFriend = async (friendUserId: string) => {
    await apiClient.post('/users/friends', { friend_user_id: friendUserId })
    setSearchQuery('')
    setSearchResults([])
    fetchFriends()
  }

  const handleRemoveFriend = async (friendUserId: string) => {
    await apiClient.delete(`/users/friends/${friendUserId}`)
    fetchFriends()
  }

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: JPEG_QUALITY,
      base64: true,
      exif: false,
    })
    if (result.canceled) return

    setUploading(true)
    try {
      let b64: string | null = null
      if (Platform.OS === 'web') {
        b64 = await resizeToThumbnailWeb(result.assets[0].uri)
      } else {
        b64 = result.assets[0].base64 ?? null
      }
      if (!b64) return

      await apiClient.put('/users/me/avatar', { avatar: b64 })
      await refreshUser()
    } catch {
      // silently fail
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return t.adminNever
    const d = new Date(iso)
    return d.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const languageOptions: { key: Language; label: string }[] = [
    { key: 'en', label: 'English' },
    { key: 'de', label: 'Deutsch' },
  ]

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: t.themeLight },
    { key: 'dark', label: t.themeDark },
  ]

  const renderSettingsTab = () => (
    <>
      {/* Friends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.friends}</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t.searchFriends}
          placeholderTextColor={colors.textPlaceholder}
        />
        {searching && <ActivityIndicator size="small" style={{ paddingVertical: 8 }} />}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsList}>
            {searchResults.map((u) => (
              <View key={u.user_id} style={styles.friendRow}>
                {u.avatar ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${u.avatar}` }}
                    style={styles.friendAvatar}
                  />
                ) : (
                  <View style={styles.friendAvatarFallback}>
                    <Text style={styles.friendAvatarText}>
                      {u.first_name[0]}{u.last_name[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.friendName} numberOfLines={1}>
                  {u.first_name} {u.last_name}
                </Text>
                <Pressable
                  style={styles.friendAddButton}
                  onPress={() => handleAddFriend(u.user_id)}
                >
                  <PlusIcon size={14} color="#fff" weight="bold" />
                  <Text style={styles.friendAddButtonText}>{t.addFriend}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <Text style={styles.friendsEmptyText}>{t.noUsersFound}</Text>
        )}

        {friendsLoading ? (
          <ActivityIndicator size="small" style={{ paddingVertical: 12 }} />
        ) : friends.length === 0 ? (
          <Text style={styles.friendsEmptyText}>{t.noFriendsYet}</Text>
        ) : (
          <View style={styles.friendsList}>
            {friends.map((f) => (
              <View key={f.user_id} style={styles.friendRow}>
                {f.avatar ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${f.avatar}` }}
                    style={styles.friendAvatar}
                  />
                ) : (
                  <View style={styles.friendAvatarFallback}>
                    <Text style={styles.friendAvatarText}>
                      {f.first_name[0]}{f.last_name[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.friendName} numberOfLines={1}>
                  {f.first_name} {f.last_name}
                </Text>
                <Pressable
                  style={styles.friendRemoveButton}
                  onPress={() => handleRemoveFriend(f.user_id)}
                >
                  <XIcon size={14} color={colors.error} weight="bold" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settingsLanguage}</Text>
        <View style={styles.toggleRow}>
          {languageOptions.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.toggleOption, language === key && styles.toggleOptionActive]}
              onPress={() => setLanguage(key)}
            >
              <Text style={[styles.toggleText, language === key && styles.toggleTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settingsTheme}</Text>
        <View style={styles.toggleRow}>
          {themeOptions.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.toggleOption, mode === key && styles.toggleOptionActive]}
              onPress={() => setMode(key)}
            >
              <Text style={[styles.toggleText, mode === key && styles.toggleTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={() => setLogoutConfirmVisible(true)}>
        <SignOutIcon size={20} color={colors.error} />
        <Text style={styles.logoutText}>{t.homeLogout}</Text>
      </Pressable>
    </>
  )

  const renderAdminTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.adminUsers}</Text>
      <View style={styles.adminCard}>
        {adminLoading ? (
          <ActivityIndicator style={{ paddingVertical: 12 }} />
        ) : adminError ? (
          <Text style={styles.adminStatusText}>{t.adminFailedToLoad}</Text>
        ) : (
          <>
            <View style={styles.adminHeaderRow}>
              <Text style={styles.adminHeaderCell}>{t.adminName}</Text>
              <Text style={styles.adminHeaderCell}>{t.adminEmail}</Text>
              <Text style={styles.adminHeaderCell}>{t.adminRole}</Text>
              <Text style={styles.adminHeaderCell}>{t.adminLastLoggedIn}</Text>
            </View>
            {adminUsers.map((u) => (
              <View key={u.user_id} style={styles.adminRow}>
                <Text style={styles.adminCell} numberOfLines={1}>{u.first_name} {u.last_name}</Text>
                <Text style={styles.adminCell} numberOfLines={1}>{u.mail}</Text>
                <Text style={styles.adminCell}>{u.role}</Text>
                <Text style={styles.adminCell} numberOfLines={1}>{formatDate(u.last_logged_in)}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  )

  return (
    <View style={styles.outerContainer}>
      {/* Admin tab bar — only visible for admins */}
      {isAdmin && (
        <View style={styles.profileTabBar}>
          <Pressable
            style={[styles.profileTab, activeTab === 'settings' && styles.profileTabActive]}
            onPress={() => setActiveTab('settings')}
          >
            <GearSixIcon
              size={18}
              color={activeTab === 'settings' ? colors.text : colors.textFaint}
              weight={activeTab === 'settings' ? 'fill' : 'regular'}
            />
            <Text style={[styles.profileTabText, activeTab === 'settings' && styles.profileTabTextActive]}>
              {t.navSettings}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.profileTab, activeTab === 'admin' && styles.profileTabActive]}
            onPress={() => setActiveTab('admin')}
          >
            <ShieldCheckIcon
              size={18}
              color={activeTab === 'admin' ? colors.text : colors.textFaint}
              weight={activeTab === 'admin' ? 'fill' : 'regular'}
            />
            <Text style={[styles.profileTabText, activeTab === 'admin' && styles.profileTabTextActive]}>
              {t.adminPanel}
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ gap: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFriends(); if (isAdmin && activeTab === 'admin') fetchUsers() }}
            tintColor={colors.text}
          />
        }
      >
        {user && (
          <View style={styles.profileHeader}>
            <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
              {user.avatar ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${user.avatar}` }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.first_name[0]}{user.last_name[0]}
                  </Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                {uploading ? (
                  <ActivityIndicator size={12} color="#fff" />
                ) : (
                  <CameraIcon size={14} color="#fff" weight="bold" />
                )}
              </View>
            </Pressable>
            <Text style={styles.profileName}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.profileEmail}>{user.mail}</Text>
          </View>
        )}

        {activeTab === 'settings' ? renderSettingsTab() : renderAdminTab()}
      </ScrollView>

      <ConfirmModal
        visible={logoutConfirmVisible}
        title={t.confirmLogout}
        message={t.confirmLogoutMessage}
        confirmLabel={t.logout}
        cancelLabel={t.cancel}
        onConfirm={() => { setLogoutConfirmVisible(false); logout() }}
        onCancel={() => setLogoutConfirmVisible(false)}
      />
    </View>
  )
}
