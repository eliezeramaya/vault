import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className="glass-card"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--radius-xl)',
        borderWidth: 1,
      }}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      <span style={{ fontWeight: 700 }}>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}
