import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { Platform } from 'react-native'
import { useColorScheme } from 'react-native'

export type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const STORAGE_KEY = 'app_theme'

function persistMode(mode: ThemeMode) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  } catch {}
}

function loadMode(systemScheme: string | null | undefined): ThemeMode {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    }
  } catch {}
  return systemScheme === 'dark' ? 'dark' : 'light'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode | null>(null)

  useEffect(() => {
    setModeState((prev) => prev ?? loadMode(systemScheme))
  }, [systemScheme])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    persistMode(m)
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      persistMode(next)
      return next
    })
  }, [])

  if (mode === null) return null

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider')
  return ctx
}
