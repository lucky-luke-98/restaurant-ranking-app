import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import apiClient, { ApiError, setAccessToken } from './apiClient'

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
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  }
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(TOKEN_KEY)
  }
  return SecureStore.getItemAsync(TOKEN_KEY)
}

async function clearToken() {
  setAccessToken(null)
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(TOKEN_KEY)
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

    // Retry with backoff to survive Render free-tier cold starts (~30–60s).
    // Only a real 401/403 clears the token — transient errors keep the session.
    const backoffsMs = [0, 3000, 8000, 20000]
    for (let attempt = 0; attempt < backoffsMs.length; attempt++) {
      if (backoffsMs[attempt] > 0) {
        await new Promise((r) => setTimeout(r, backoffsMs[attempt]))
      }
      try {
        const data = await apiClient.get<User>('/users/me')
        setUser(data)
        setLoading(false)
        return
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await clearToken()
          setUser(null)
          setLoading(false)
          return
        }
      }
    }
    // Backend unreachable — keep token so next reload can re-verify.
    setLoading(false)
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
