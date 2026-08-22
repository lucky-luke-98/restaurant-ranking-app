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
  offline: boolean
  hasSession: boolean
  login: (mail: string, password: string) => Promise<void>
  register: (firstName: string, lastName: string, mail: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  retry: () => Promise<void>
}

const TOKEN_KEY = 'access_token'
const USER_KEY = 'cached_user'

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value)
  } else {
    await SecureStore.setItemAsync(key, value)
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(key)
  }
  return SecureStore.getItemAsync(key)
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key)
  } else {
    await SecureStore.deleteItemAsync(key)
  }
}

function toUser(data: AuthTokenResponse): User {
  return {
    user_id: data.user_id,
    mail: data.mail,
    first_name: data.first_name,
    last_name: data.last_name,
    role: data.role,
    avatar: data.avatar,
  }
}

async function cacheUser(user: User) {
  await setItem(USER_KEY, JSON.stringify(user))
}

async function loadCachedUser(): Promise<User | null> {
  const raw = await getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

async function saveSession(token: string, user: User) {
  setAccessToken(token)
  await setItem(TOKEN_KEY, token)
  await cacheUser(user)
}

async function clearSession() {
  setAccessToken(null)
  await removeItem(TOKEN_KEY)
  await removeItem(USER_KEY)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  const fetchMe = useCallback(async () => {
    const stored = await getItem(TOKEN_KEY)
    if (!stored) {
      setHasSession(false)
      setLoading(false)
      return
    }
    setAccessToken(stored)
    setHasSession(true)

    // Render straight from cache so an installed app opens without waiting on the network.
    const cached = await loadCachedUser()
    if (cached) {
      setUser(cached)
      setLoading(false)
    }

    // Retry with backoff to survive Render free-tier cold starts (~30–60s).
    // Only a real 401/403 clears the session — transient errors keep it.
    const backoffsMs = [0, 3000, 8000, 20000]
    for (let attempt = 0; attempt < backoffsMs.length; attempt++) {
      if (backoffsMs[attempt] > 0) {
        await new Promise((r) => setTimeout(r, backoffsMs[attempt]))
      }
      try {
        const data = await apiClient.get<User>('/users/me')
        setUser(data)
        await cacheUser(data)
        setOffline(false)
        setLoading(false)
        return
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await clearSession()
          setUser(null)
          setHasSession(false)
          setOffline(false)
          setLoading(false)
          return
        }
      }
    }

    // Backend unreachable: keep the session and let the UI show a degraded state.
    setOffline(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const retry = useCallback(async () => {
    setLoading(true)
    setOffline(false)
    await fetchMe()
  }, [fetchMe])

  const login = async (mail: string, password: string) => {
    const data = await apiClient.post<AuthTokenResponse>('/users/login', { mail, password })
    const next = toUser(data)
    await saveSession(data.access_token, next)
    setUser(next)
    setHasSession(true)
    setOffline(false)
  }

  const register = async (firstName: string, lastName: string, mail: string, password: string) => {
    const data = await apiClient.post<AuthTokenResponse>('/users/register', {
      first_name: firstName,
      last_name: lastName,
      mail,
      password,
    })
    const next = toUser(data)
    await saveSession(data.access_token, next)
    setUser(next)
    setHasSession(true)
    setOffline(false)
  }

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiClient.get<User>('/users/me')
      setUser(data)
      await cacheUser(data)
      setOffline(false)
    } catch {
      // ignore
    }
  }, [])

  const logout = async () => {
    await clearSession()
    setUser(null)
    setHasSession(false)
    setOffline(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, offline, hasSession, login, register, logout, refreshUser, retry }}
    >
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
