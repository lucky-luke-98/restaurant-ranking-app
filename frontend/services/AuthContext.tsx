import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import apiClient, { setAccessToken } from './apiClient'

interface User {
  user_id: string
  mail: string
  first_name: string
  last_name: string
  role: string
  avatar?: string
}

interface AuthTokenResponse extends User {
  access_token: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (mail: string, password: string) => Promise<void>
  register: (firstName: string, lastName: string, mail: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const TOKEN_KEY = 'access_token'

async function saveToken(token: string) {
  setAccessToken(token)
  if (Platform.OS === 'web') {
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict; Secure`
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  }
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`))
    return match ? match[1] : null
  }
  return SecureStore.getItemAsync(TOKEN_KEY)
}

async function clearToken() {
  setAccessToken(null)
  if (Platform.OS === 'web') {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const stored = await loadToken()
    if (!stored) {
      setLoading(false)
      return
    }
    setAccessToken(stored)
    try {
      const data = await apiClient.get<User>('/users/me')
      setUser(data)
    } catch {
      await clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = async (mail: string, password: string) => {
    const data = await apiClient.post<AuthTokenResponse>('/users/login', { mail, password })
    await saveToken(data.access_token)
    setUser({ user_id: data.user_id, mail: data.mail, first_name: data.first_name, last_name: data.last_name, role: data.role })
  }

  const register = async (firstName: string, lastName: string, mail: string, password: string) => {
    const data = await apiClient.post<AuthTokenResponse>('/users/register', {
      first_name: firstName,
      last_name: lastName,
      mail,
      password,
    })
    await saveToken(data.access_token)
    setUser({ user_id: data.user_id, mail: data.mail, first_name: data.first_name, last_name: data.last_name, role: data.role })
  }

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiClient.get<User>('/users/me')
      setUser(data)
    } catch {
      // ignore
    }
  }, [])

  const logout = async () => {
    await clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
