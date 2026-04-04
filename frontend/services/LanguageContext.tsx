import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Platform } from 'react-native'
import en, { type Translations } from '@/i18n/en'
import de from '@/i18n/de'

export type Language = 'en' | 'de'

interface LanguageContextValue {
  language: Language
  t: Translations
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const translations: Record<Language, Translations> = { en, de }

const STORAGE_KEY = 'app_language'

function persistLanguage(lang: Language) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  } catch {}
}

function loadLanguage(): Language {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'de') return stored
    }
  } catch {}
  return 'en'
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    persistLanguage(lang)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'de' : 'en'
      persistLanguage(next)
      return next
    })
  }, [])

  return (
    <LanguageContext.Provider value={{ language, t: translations[language], setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used inside LanguageProvider')
  return ctx
}
