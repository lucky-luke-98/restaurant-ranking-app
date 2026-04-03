import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { ForkKnifeIcon, EnvelopeIcon, LockIcon, UserIcon, SignInIcon, UserPlusIcon } from 'phosphor-react-native'
import { useAuth } from '@/services/AuthContext'
import { ApiError } from '@/services/apiClient'

export default function AuthScreen() {
  const { login, register } = useAuth()
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
            ? 'Invalid email or password.'
            : err.status === 409
              ? 'Email already in use.'
              : `Error: ${err.body}`
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
        <ForkKnifeIcon size={64} color="#fff" weight="duotone" style={styles.logo} />
        <Text style={styles.title}>ResRank</Text>
        <Text style={styles.subtitle}>{isRegister ? 'Create Account' : 'Sign In'}</Text>

        {isRegister && (
          <>
            <View style={styles.inputRow}>
              <UserIcon size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputRow}>
              <UserIcon size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </>
        )}

        <View style={styles.inputRow}>
          <EnvelopeIcon size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={mail}
            onChangeText={setMail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputRow}>
          <LockIcon size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.4)"
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
              <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Login'}</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={() => { setIsRegister(!isRegister); setError(null) }}>
          <Text style={styles.switchText}>
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    color: 'white',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: 'white',
    fontSize: 16,
  },
  button: {
    backgroundColor: 'rgba(0.8,0.3,0.6,0.75)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  switchText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
})
