import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { Platform } from 'react-native'
import apiClient, { setAccessToken } from './apiClient'

interface User {
  user_id: string
  mail: string
  first_name: string
  last_name: string
  role: string
}

interface AuthTokenResponse extends User {
  access_token: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (mail: string, password: string) => Promise<void>
  register: (firstName: string, lastName: string, mail: string, password: string) => Promise<void>
  logout: () => void
}

const COOKIE_NAME = 'access_token'

function saveToken(token: string) {
  setAccessToken(token)
  if (Platform.OS === 'web') {
    document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`
  }
}

function loadToken(): string | null {
  if (Platform.OS === 'web') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
    return match ? match[1] : null
  }
  return null
}

function clearToken() {
  setAccessToken(null)
  if (Platform.OS === 'web') {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const stored = loadToken()
    if (!stored) {
      setLoading(false)
      return
    }
    setAccessToken(stored)
    try {
      const data = await apiClient.get<User>('/users/me')
      setUser(data)
    } catch {
      clearToken()
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
    saveToken(data.access_token)
    setUser({ user_id: data.user_id, mail: data.mail, first_name: data.first_name, last_name: data.last_name, role: data.role })
  }

  const register = async (firstName: string, lastName: string, mail: string, password: string) => {
    const data = await apiClient.post<AuthTokenResponse>('/users/register', {
      first_name: firstName,
      last_name: lastName,
      mail,
      password,
    })
    saveToken(data.access_token)
    setUser({ user_id: data.user_id, mail: data.mail, first_name: data.first_name, last_name: data.last_name, role: data.role })
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
