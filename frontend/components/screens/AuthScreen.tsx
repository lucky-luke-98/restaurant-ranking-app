import { useState, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  LayoutAnimation,
  StyleSheet,
  UIManager,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ForkKnifeIcon, EnvelopeIcon, LockIcon, UserIcon, SignInIcon, UserPlusIcon, EyeIcon, EyeSlashIcon } from 'phosphor-react-native'
import { useAuth } from '@/services/AuthContext'
import { useTranslation } from '@/services/LanguageContext'
import { ApiError } from '@/services/apiClient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './AuthScreen.styles'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastNameRef = useRef<TextInput>(null)
  const mailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
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

  const toggleMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    setIsRegister(!isRegister)
    setError(null)
  }

  const canSubmit = isRegister
    ? firstName.trim() && lastName.trim() && mail.trim() && password.length >= 6
    : mail.trim() && password

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ForkKnifeIcon size={88} color={colors.text} weight="duotone" style={styles.logo} />
        <Text style={styles.title}>{t.appName}</Text>
        <Text style={styles.tagline}>{t.authTagline}</Text>
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
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </View>
            <View style={styles.inputRow}>
              <UserIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                ref={lastNameRef}
                style={styles.input}
                placeholder={t.authLastName}
                placeholderTextColor={colors.textPlaceholder}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => mailRef.current?.focus()}
              />
            </View>
          </>
        )}

        <View style={styles.inputRow}>
          <EnvelopeIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
          <TextInput
            ref={mailRef}
            style={styles.input}
            placeholder={t.authEmail}
            placeholderTextColor={colors.textPlaceholder}
            value={mail}
            onChangeText={setMail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </View>
        <View style={styles.inputRow}>
          <LockIcon size={20} color={colors.textFaint} style={styles.inputIcon} />
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder={t.authPassword}
            placeholderTextColor={colors.textPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            textContentType={isRegister ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            {showPassword ? (
              <EyeSlashIcon size={20} color={colors.textFaint} />
            ) : (
              <EyeIcon size={20} color={colors.textFaint} />
            )}
          </Pressable>
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

        <Pressable onPress={toggleMode}>
          <Text style={styles.switchText}>
            {isRegister ? t.authAlreadyHaveAccount : t.authNoAccount}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
