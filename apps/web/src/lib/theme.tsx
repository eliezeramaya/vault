import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'
interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtx | null>(null)
const STORAGE_KEY = 'vault-theme-preference'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
      const sys = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const next = saved === 'light' || saved === 'dark' ? saved : sys ? 'dark' : 'light'
      setTheme(next)
      document.documentElement.setAttribute('data-theme', next)
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark')
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme: (t: Theme) => setTheme(t),
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
