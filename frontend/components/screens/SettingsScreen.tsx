import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation, type Language } from '@/services/LanguageContext'
import { useAppTheme, type ThemeMode } from '@/services/ThemeContext'
import { useAuth } from '@/services/AuthContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import apiClient from '@/services/apiClient'
import { createStyles } from './SettingsScreen.styles'

interface AdminUser {
  user_id: string
  first_name: string
  last_name: string
  mail: string
  role: string
  last_logged_in?: string
}

export default function SettingsScreen() {
  const { t, language, setLanguage } = useTranslation()
  const { mode, setMode } = useAppTheme()
  const { user } = useAuth()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isAdmin = user?.role === 'admin'

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(false)

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
    if (isAdmin) fetchUsers()
  }, [isAdmin, fetchUsers])

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 24, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: t.navSettings }} />

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

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.adminPanel}</Text>
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
      )}
    </ScrollView>
  )
}
