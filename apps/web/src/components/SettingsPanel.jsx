import React, { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Palette, Info, AlertTriangle, Smartphone } from 'lucide-react'
import { useSafeStorage } from '../hooks/useSafeOperations'
import { useError } from '../contexts/ErrorContext'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useMobileButton } from '../hooks/useTouchGestures'
import { useMobileTutorial } from '../hooks/useMobileTutorial'
import { exportData, downloadSnapshot, importFromFile } from '../lib/backup'

function ThemeOptionButton({ option, selected, onSelect }) {
  const Icon = option.icon
  const mobileButton = useMobileButton({
    onPress: onSelect,
    hapticFeedback: true,
    rippleEffect: true,
  })
  return (
    <button
      type="button"
      ref={mobileButton.ref}
      data-theme={option.value}
      onClick={mobileButton.handleClick}
      onTouchStart={mobileButton.handleTouchStart}
      onTouchEnd={mobileButton.handleTouchEnd}
      aria-label={`Cambiar a tema ${option.label.toLowerCase()}`}
      aria-pressed={selected}
      className="theme-button touch-feedback"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '20px 16px',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'center',
        background: selected ? 'var(--primary)' : 'var(--panel-bg)',
        color: selected ? 'var(--on-primary)' : 'var(--text)',
        border: selected ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
        transition: 'all 0.2s ease',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: selected ? 'var(--elevation-2)' : 'var(--elevation-0)',
        outline: 'none',
        minHeight: '80px',
        fontSize: '14px',
        fontWeight: selected ? 600 : 400,
      }}
      onFocus={e => {
        e.target.style.outline = '2px solid var(--accent)'
        e.target.style.outlineOffset = '2px'
      }}
      onBlur={e => {
        e.target.style.outline = 'none'
      }}
    >
      <Icon size={24} aria-hidden="true" />
      <div style={{ fontWeight: 700 }}>{option.label}</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.8,
          lineHeight: 1.3,
          color: selected ? 'var(--on-primary)' : 'var(--text-secondary)',
        }}
      >
        {option.description}
      </div>
      {selected && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          ✓ Activo
        </div>
      )}
    </button>
  )
}

export default function SettingsPanel({ theme, onThemeToggle }) {
  const { safeGetItem, safeRemoveItem } = useSafeStorage()
  const { addError, addNotification, clearErrors } = useError()
  const { isMobile, forceTutorial, getTutorialStatus } = useMobileTutorial()
  const [systemTheme, setSystemTheme] = useState('dark')
  const [hasUserPreference, setHasUserPreference] = useState(false)
  const [backupStatus, setBackupStatus] = useState(null)
  const [importMode, setImportMode] = useState('merge') // 'merge' | 'replace'
  const [isImporting, setIsImporting] = useState(false)
  const fileInputId = 'backup-import-file'

  // Keyboard navigation setup
  const { containerRef, focusElement } = useKeyboardNavigation({
    enabled: true,
    gridMode: true,
    gridColumns: 2, // Theme buttons in grid
    onEnter: event => {
      const target = event.target
      if (target && target.tagName === 'BUTTON') {
        target.click()
        return true
      }
      return false
    },
    onEscape: () => {
      // Clear any active states or selections
      document.activeElement?.blur()
      return true
    },
    customShortcuts: {
      1: () => {
        focusElement('[data-theme="light"]')
        return true
      },
      2: () => {
        focusElement('[data-theme="dark"]')
        return true
      },
      r: () => {
        resetToSystemTheme()
        return true
      },
      R: () => {
        resetToSystemTheme()
        return true
      },
      t: () => {
        onThemeToggle()
        return true
      },
      T: () => {
        onThemeToggle()
        return true
      },
    },
    excludeInputs: false, // Allow navigation within settings
  })

  // Detect system theme and user preference
  useEffect(() => {
    // Detect system theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = e => setSystemTheme(e.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)

    // Check if user has a saved preference
    const savedTheme = safeGetItem('vault-theme-preference')
    setHasUserPreference(!!savedTheme)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [safeGetItem])

  // Reset to system theme
  const resetToSystemTheme = () => {
    if (safeRemoveItem('vault-theme-preference')) {
      setHasUserPreference(false)
      // The app will automatically detect system theme
      window.location.reload() // Simple way to reset to system preference
    }
  }

  const themeOptions = [
    {
      value: 'light',
      label: 'Claro',
      icon: Sun,
      description: 'Tema claro con colores brillantes',
    },
    {
      value: 'dark',
      label: 'Oscuro',
      icon: Moon,
      description: 'Tema oscuro para reducir fatiga visual',
    },
  ]

  return (
    <section
      ref={containerRef}
      aria-label="Ajustes"
      style={{
        position: 'relative',
        minHeight: '70vh',
        margin: 'max(16px, env(safe-area-inset-top)) auto 80px',
        padding: '24px 16px',
        maxWidth: 720,
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        color: 'var(--surface-text)',
        borderRadius: 16,
        boxShadow: 'var(--elevation-1)',
      }}
      tabIndex={-1}
    >
      <h2 style={{ marginTop: 0, marginBottom: 24, color: 'var(--text)' }}>⚙️ Configuraciones</h2>

      {/* Theme Section */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            color: 'var(--text)',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          <Palette size={20} aria-hidden="true" />
          Apariencia
        </h3>

        {/* System Theme Info */}
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Monitor size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              Sistema: {systemTheme === 'dark' ? 'Oscuro' : 'Claro'}
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, color: 'var(--text-secondary)' }}>
              Tu sistema operativo está configurado en modo{' '}
              {systemTheme === 'dark' ? 'oscuro' : 'claro'}
            </div>
          </div>
        </div>

        {/* Theme Options */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="theme-grid"
            style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              color: 'var(--text)',
              fontSize: 14,
            }}
          >
            Seleccionar tema:
          </label>

          <div
            id="theme-grid"
            className="settings-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            {themeOptions.map(option => (
              <ThemeOptionButton
                key={option.value}
                option={option}
                selected={theme === option.value}
                onSelect={() => {
                  if (theme !== option.value) {
                    onThemeToggle()
                    setHasUserPreference(true)
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Reset to System Theme */}
        {hasUserPreference && (
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={resetToSystemTheme}
              aria-label="Resetear a tema del sistema"
              className="touch-feedback"
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px dashed var(--accent)',
                borderRadius: 12,
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                outline: 'none',
                minHeight: '44px', // Touch-friendly
                transition: 'all 0.2s ease',
              }}
              onFocus={e => {
                e.target.style.outline = '2px solid var(--accent)'
                e.target.style.outlineOffset = '2px'
              }}
              onBlur={e => {
                e.target.style.outline = 'none'
              }}
            >
              <Monitor
                size={18}
                style={{ marginRight: 8, verticalAlign: 'middle' }}
                aria-hidden="true"
              />
              Seguir tema del sistema
            </button>
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginTop: 8,
                color: 'var(--text-secondary)',
              }}
            >
              Cambiar automáticamente según las preferencias de tu sistema
            </div>
          </div>
        )}
      </div>

      {/* Error Testing Section (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginBottom: 32 }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              color: 'var(--text)',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={20} aria-hidden="true" />
            Pruebas de Error (Desarrollo)
          </h3>

          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => addNotification('Mensaje de prueba exitoso', 'success')}
                aria-label="Probar notificación de éxito"
                data-test="success"
                className="touch-feedback"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: '40px', // Touch-friendly
                  transition: 'all 0.2s ease',
                }}
                onFocus={e => {
                  e.target.style.outline = '2px solid #4ade80'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={e => {
                  e.target.style.outline = 'none'
                }}
              >
                Éxito
              </button>

              <button
                type="button"
                onClick={() => addNotification('Mensaje de información', 'info')}
                aria-label="Probar notificación informativa"
                data-test="info"
                className="touch-feedback"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: '40px', // Touch-friendly
                  transition: 'all 0.2s ease',
                }}
                onFocus={e => {
                  e.target.style.outline = '2px solid #60a5fa'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={e => {
                  e.target.style.outline = 'none'
                }}
              >
                Info
              </button>

              <button
                type="button"
                onClick={() => addNotification('Mensaje de advertencia', 'warning')}
                aria-label="Probar notificación de advertencia"
                data-test="warning"
                className="touch-feedback"
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: '40px', // Touch-friendly
                  transition: 'all 0.2s ease',
                }}
                onFocus={e => {
                  e.target.style.outline = '2px solid #fbbf24'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={e => {
                  e.target.style.outline = 'none'
                }}
              >
                Advertencia
              </button>

              <button
                type="button"
                onClick={() => addError(new Error('Error de prueba'), 'settings-test')}
                aria-label="Probar notificación de error"
                data-test="error"
                className="touch-feedback"
                style={{
                  background: 'rgba(220, 38, 38, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: '40px', // Touch-friendly
                  transition: 'all 0.2s ease',
                }}
                onFocus={e => {
                  e.target.style.outline = '2px solid #f87171'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={e => {
                  e.target.style.outline = 'none'
                }}
              >
                Error
              </button>

              <button
                type="button"
                onClick={() => clearErrors()}
                aria-label="Limpiar todas las notificaciones"
                data-test="clear"
                className="touch-feedback"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--surface-text)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: '40px', // Touch-friendly
                  transition: 'all 0.2s ease',
                }}
                onFocus={e => {
                  e.target.style.outline = '2px solid var(--accent)'
                  e.target.style.outlineOffset = '2px'
                }}
                onBlur={e => {
                  e.target.style.outline = 'none'
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Restore Section */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            color: 'var(--text)',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          🗄️ Respaldo y Restauración
        </h3>
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Exporta tus datos locales (tareas, sesiones de foco, eventos, notas, métricas Pomodoro y
            preferencias de tema) a un archivo JSON. Puedes importarlo más tarde o migrarlo a otro
            dispositivo.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                try {
                  const snap = exportData()
                  const ok = downloadSnapshot(snap)
                  if (ok)
                    setBackupStatus({
                      type: 'success',
                      msg: `Exportado (${Object.keys(snap.data).length} claves)`,
                    })
                  else setBackupStatus({ type: 'error', msg: 'Fallo al descargar' })
                } catch (e) {
                  setBackupStatus({ type: 'error', msg: 'Error en exportación' })
                }
              }}
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Descargar backup JSON
            </button>
            <label
              htmlFor={fileInputId}
              style={{
                background: 'var(--surface)',
                color: 'var(--surface-text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Importar JSON
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                setIsImporting(true)
                try {
                  const res = await importFromFile(file, {
                    replace: importMode === 'replace',
                    merge: importMode === 'merge',
                  })
                  setBackupStatus({
                    type: 'success',
                    msg: `Importado: ${res.written.length} claves (${res.skipped.length} omitidas)`,
                  })
                  addNotification('Importación completada', 'success')
                } catch (err) {
                  console.error(err)
                  setBackupStatus({
                    type: 'error',
                    msg: 'Importación fallida: ' + (err?.message || ''),
                  })
                  addError(err, 'backup-import')
                } finally {
                  setIsImporting(false)
                  e.target.value = ''
                }
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <label htmlFor="import-mode" style={{ fontWeight: 600 }}>
                Modo:
              </label>
              <select
                id="import-mode"
                value={importMode}
                onChange={e => setImportMode(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  color: 'var(--surface-text)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 6,
                  padding: '6px 8px',
                }}
              >
                <option value="merge">Fusionar</option>
                <option value="replace">Reemplazar</option>
              </select>
            </div>
          </div>
          {backupStatus && (
            <div
              role="status"
              style={{
                fontSize: 12,
                padding: '8px 10px',
                borderRadius: 8,
                background:
                  backupStatus.type === 'success' ? 'rgba(34,197,94,.12)' : 'rgba(220,38,38,.12)',
                border: '1px solid',
                borderColor:
                  backupStatus.type === 'success' ? 'rgba(34,197,94,.4)' : 'rgba(220,38,38,.4)',
                color: backupStatus.type === 'success' ? '#22c55e' : '#f87171',
              }}
            >
              {isImporting ? 'Procesando… ' : ''}
              {backupStatus.msg}
            </div>
          )}
          <details style={{ fontSize: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              Detalles / claves incluidas
            </summary>
            <ul style={{ margin: '8px 0 0 16px', padding: 0, listStyle: 'disc' }}>
              <li>
                <code>tasks_v1</code> (tareas)
              </li>
              <li>
                <code>focus_sessions_v1</code> (sesiones Pomodoro/foco)
              </li>
              <li>
                <code>analytics_events_v1</code> (eventos internos)
              </li>
              <li>
                <code>eh_notes_v1</code> (notas de matriz)
              </li>
              <li>
                <code>pomodoroHistory</code> (historial granular)
              </li>
              <li>
                <code>pomodoroGoals</code> (objetivos)
              </li>
              <li>
                <code>vault-theme-preference</code> & <code>theme</code> (tema actual)
              </li>
            </ul>
          </details>
          <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.4 }}>
            Modo <strong>Fusionar</strong>: combina arrays (evita duplicados simples) y sobrescribe
            propiedades de objetos. <strong>Reemplazar</strong>: escribe exactamente el contenido
            del backup.
          </div>
        </div>
      </div>

      {/* Additional Settings Sections */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            color: 'var(--text)',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          <Info size={20} aria-hidden="true" />
          Información
        </h3>

        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>Versión:</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>0.2.0</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>Tema actual:</strong>{' '}
            <span
              style={{
                color: theme === 'dark' ? 'var(--accent)' : 'var(--warning)',
                fontWeight: 600,
              }}
            >
              {theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--text)' }}>Preferencia:</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              {hasUserPreference ? 'Manual' : 'Sistema'}
            </span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: 12,
          padding: 16,
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>💡 Consejo:</div>
        <div>
          Puedes cambiar el tema rápidamente desde cualquier lugar usando el botón en la barra
          superior, o presiona{' '}
          <kbd
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace',
            }}
          >
            H
          </kbd>{' '}
          para ver todos los atajos disponibles.
        </div>
      </div>

      {/* Mobile Tutorial Section */}
      {isMobile && (
        <section
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Smartphone size={20} style={{ color: 'var(--accent)' }} />
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Tutorial Móvil
            </h2>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Aprende a usar todos los gestos táctiles y optimizaciones móviles de Sphere Vault.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => {
                forceTutorial()
                addNotification('Tutorial móvil iniciado', 'success')
              }}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={e => {
                e.target.style.background = 'var(--accent-hover)'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.target.style.background = 'var(--accent)'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <Smartphone size={16} />
              Mostrar Tutorial
            </button>

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {(() => {
                const status = getTutorialStatus()
                if (status?.completed) {
                  return (
                    <>
                      <span style={{ color: 'var(--success)' }}>✓</span>
                      Completado {new Date(status.completedAt).toLocaleDateString()}
                    </>
                  )
                } else if (status?.skipped) {
                  return (
                    <>
                      <span style={{ color: 'var(--warning)' }}>⏭</span>
                      Omitido {new Date(status.skippedAt).toLocaleDateString()}
                    </>
                  )
                } else {
                  return (
                    <>
                      <span style={{ color: 'var(--text-secondary)' }}>📱</span>
                      Disponible
                    </>
                  )
                }
              })()}
            </div>
          </div>
        </section>
      )}
    </section>
  )
}
