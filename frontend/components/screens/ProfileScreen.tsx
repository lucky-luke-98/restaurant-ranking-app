import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, Platform, RefreshControl, Modal } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  SignOutIcon,
  CameraIcon,
  PlusIcon,
  XIcon,
  GearSixIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  SunIcon,
  MoonIcon,
  CaretRightIcon,
  CheckIcon,
} from 'phosphor-react-native'
import { useTranslation, type Language } from '@/services/LanguageContext'
import { useAppTheme, type ThemeMode } from '@/services/ThemeContext'
import { useAuth } from '@/services/AuthContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import apiClient from '@/services/apiClient'
import ConfirmModal from '@/components/modals/ConfirmModal'
import AddFriendModal from '@/components/modals/AddFriendModal'
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
  const [addFriendVisible, setAddFriendVisible] = useState(false)
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false)

  const [friends, setFriends] = useState<FriendUser[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)

  const friendIds = useMemo(() => new Set(friends.map((f) => f.user_id)), [friends])

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

  const themeOptions: { key: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
    { key: 'light', label: t.themeLight, Icon: SunIcon },
    { key: 'dark', label: t.themeDark, Icon: MoonIcon },
  ]

  const currentLanguageLabel = languageOptions.find((o) => o.key === language)?.label ?? ''

  const renderSettingsTab = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.friends}</Text>
          <Pressable
            style={styles.sectionAction}
            onPress={() => setAddFriendVisible(true)}
            hitSlop={8}
          >
            <PlusIcon size={14} color={colors.background} weight="bold" />
          </Pressable>
        </View>

        {friendsLoading ? (
          <ActivityIndicator size="small" style={{ paddingVertical: 16 }} />
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <UsersThreeIcon size={32} color={colors.textFaint} weight="regular" />
            <Text style={styles.emptyStateText}>{t.noFriendsYet}</Text>
            <Text style={styles.emptyStateHint}>{t.noFriendsHint}</Text>
          </View>
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
        <Text style={styles.sectionTitle}>{t.preferences}</Text>
        <View style={styles.preferencesCard}>
          <Pressable
            style={styles.languageRow}
            onPress={() => setLanguagePickerVisible(true)}
          >
            <Text style={styles.preferenceLabel}>{t.settingsLanguage}</Text>
            <View style={styles.languageRowValue}>
              <Text style={styles.languageRowValueText}>{currentLanguageLabel}</Text>
              <CaretRightIcon size={16} color={colors.textFaint} weight="bold" />
            </View>
          </Pressable>

          <View style={styles.preferenceDivider} />

          <View style={styles.themeSection}>
            <Text style={styles.preferenceLabel}>{t.settingsTheme}</Text>
            <View style={styles.themeTileRow}>
              {themeOptions.map(({ key, label, Icon }) => {
                const active = mode === key
                return (
                  <Pressable
                    key={key}
                    style={[styles.themeTile, active && styles.themeTileActive]}
                    onPress={() => setMode(key)}
                  >
                    <Icon
                      size={26}
                      color={active ? colors.background : colors.textMuted}
                      weight={active ? 'fill' : 'regular'}
                    />
                    <Text style={[styles.themeTileText, active && styles.themeTileTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.account}</Text>
        <Pressable style={styles.logoutButton} onPress={() => setLogoutConfirmVisible(true)}>
          <SignOutIcon size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t.homeLogout}</Text>
        </Pressable>
      </View>
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
            <Pressable
              onPress={pickAvatar}
              style={styles.avatarWrapper}
              accessibilityLabel={t.editAvatar}
            >
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
              <View style={styles.avatarEditBadge}>
                {uploading ? (
                  <ActivityIndicator size={12} color={colors.background} />
                ) : (
                  <CameraIcon size={14} color={colors.background} weight="bold" />
                )}
              </View>
            </Pressable>
            <Text style={styles.profileName}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.profileEmail}>{user.mail}</Text>
          </View>
        )}

        {activeTab === 'settings' ? renderSettingsTab() : renderAdminTab()}
      </ScrollView>

      <AddFriendModal
        visible={addFriendVisible}
        existingFriendIds={friendIds}
        onClose={() => setAddFriendVisible(false)}
        onFriendAdded={fetchFriends}
      />

      <Modal
        visible={languagePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setLanguagePickerVisible(false)}
        >
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t.chooseLanguage}</Text>
              <Pressable
                onPress={() => setLanguagePickerVisible(false)}
                hitSlop={12}
                style={styles.pickerClose}
              >
                <XIcon size={18} color={colors.text} weight="bold" />
              </Pressable>
            </View>
            {languageOptions.map(({ key, label }) => {
              const active = language === key
              return (
                <Pressable
                  key={key}
                  style={styles.pickerRow}
                  onPress={() => {
                    setLanguage(key)
                    setLanguagePickerVisible(false)
                  }}
                >
                  <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>
                    {label}
                  </Text>
                  {active && <CheckIcon size={18} color={colors.text} weight="bold" />}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>

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
