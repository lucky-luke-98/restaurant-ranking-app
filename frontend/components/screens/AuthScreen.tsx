import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { ForkKnifeIcon, EnvelopeIcon, LockIcon, UserIcon, SignInIcon, UserPlusIcon } from 'phosphor-react-native'
import { useAuth } from '@/services/AuthContext'
import { useTranslation } from '@/services/LanguageContext'
import { ApiError } from '@/services/apiClient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './AuthScreen.styles'

export default function AuthScreen() {
  const { login, register } = useAuth()
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [isRegister, setIsRegister] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mail, setMail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      if (isRegister) {
        await register(firstName.trim(), lastName.trim(), mail.trim(), password)
      } else {
        await login(mail.trim(), password)
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? t.authInvalidCredentials
            : err.status === 409
              ? t.authEmailInUse
              : `${t.error}: ${err.body}`
          : (err as Error).message
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = isRegister
    ? firstName.trim() && lastName.trim() && mail.trim() && password.length >= 6
    : mail.trim() && password

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ForkKnifeIcon size={64} color={colors.text} weight="duotone" style={styles.logo} />
        <Text style={styles.title}>{t.appName}</Text>
        <Text style={styles.subtitle}>{isRegister ? t.authCreateAccount : t.authSignIn}</Text>

        {isRegister && (
          <>
            <View style={styles.inputRow}>
              <UserIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.authFirstName}
                placeholderTextColor={colors.textPlaceholder}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputRow}>
              <UserIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.authLastName}
                placeholderTextColor={colors.textPlaceholder}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </>
        )}

        <View style={styles.inputRow}>
          <EnvelopeIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t.authEmail}
            placeholderTextColor={colors.textPlaceholder}
            value={mail}
            onChangeText={setMail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputRow}>
          <LockIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t.authPassword}
            placeholderTextColor={colors.textPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonInner}>
              {isRegister ? (
                <UserPlusIcon size={20} color="#fff" weight="bold" />
              ) : (
                <SignInIcon size={20} color="#fff" weight="bold" />
              )}
              <Text style={styles.buttonText}>{isRegister ? t.authRegister : t.authLogin}</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={() => { setIsRegister(!isRegister); setError(null) }}>
          <Text style={styles.switchText}>
            {isRegister ? t.authAlreadyHaveAccount : t.authNoAccount}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
