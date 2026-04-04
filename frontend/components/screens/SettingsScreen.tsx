import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation, type Language } from '@/services/LanguageContext'
import { useAppTheme, type ThemeMode } from '@/services/ThemeContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './SettingsScreen.styles'

export default function SettingsScreen() {
  const { t, language, setLanguage } = useTranslation()
  const { mode, setMode } = useAppTheme()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const languageOptions: { key: Language; label: string }[] = [
    { key: 'en', label: 'English' },
    { key: 'de', label: 'Deutsch' },
  ]

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: t.themeLight },
    { key: 'dark', label: t.themeDark },
  ]

  return (
    <View style={styles.container}>
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
    </View>
  )
}
