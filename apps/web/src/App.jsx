import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Sun, Moon, HelpCircle, MoreHorizontal } from 'lucide-react'
import { ErrorProvider } from './contexts/ErrorContext'
import { useSafeStorage, useSafeOperation } from './hooks/useSafeOperations'
import { useGlobalKeyboardShortcuts } from './hooks/useKeyboardNavigation'
import ErrorBoundary from './components/ErrorBoundary'
import Globe from './features/map/Globe'
// Lazy-load the heavy 3D map to reduce initial bundle on mobile
const SphereMap = React.lazy(() => import('./features/map/SphereMap'))
import FocusLoopBar from './features/focus/FocusLoopBar'
import { FocusLoopProvider } from './features/focus/FocusLoopContext'
const EisenhowerPanel = React.lazy(() => import('./features/matrix/EisenhowerPanel'))
import Welcome from './features/onboarding/Welcome'
import Onboarding from './features/onboarding/Onboarding'
import Preloader from './components/Preloader'
import AddIslandSheet from './components/AddIslandSheet'
const HomePanel = React.lazy(() => import('./components/HomePanel'))
const SettingsPanel = React.lazy(() => import('./components/SettingsPanel'))
const PomodoroPanel = React.lazy(() => import('./components/PomodoroPanel'))
const WeeklyScorecard = React.lazy(() => import('./components/WeeklyScorecard'))
import NotificationCenter from './components/NotificationCenter'
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp'
import MobileTutorial from './components/MobileTutorial/MobileTutorial'
import { useMobileTutorial } from './hooks/useMobileTutorial'
import Sidebar from './features/navigation/Sidebar'
import BottomNav from './features/navigation/BottomNav'

// Stable theme options at module scope to avoid identity changes across renders
const VALID_THEMES = ['light', 'dark']

function AppContent() {
  const { safeGetItem, safeSetItem, safeRemoveItem } = useSafeStorage()
  const { safeSync } = useSafeOperation()
  const { showTutorial, completeTutorial, skipTutorial } = useMobileTutorial()
  const [theme, setTheme] = useState('dark') // 'dark' | 'light'
  const [showWelcome, setShowWelcome] = useState(true)
  const [showOb, setShowOb] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const globeApiRef = useRef(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [view, setView] = useState('map') // 'home' | 'map' | 'matrix' | 'pomodoro' | 'settings' | 'scorecard'
  const [mapMode, setMapMode] = useState('sphere') // 'plane' | 'sphere'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)
  const headerRef = useRef(null)
  const [bottomNavH, setBottomNavH] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  // Sidebar: default open on desktop, closed on mobile; remember user preference
  useEffect(() => {
    try {
      const saved = safeGetItem('sidebarOpen')
      if (typeof saved === 'boolean') {
        setSidebarOpen(saved)
        return
      }
      if (typeof saved === 'string') {
        if (saved === 'true' || saved === 'false') {
          setSidebarOpen(saved === 'true')
          return
        }
      }
      const mq = window.matchMedia('(max-width: 768px)')
      setSidebarOpen(!mq.matches)
    } catch {
      /* ignore */
    }
  }, [safeGetItem])

  // Track viewport width bucket to compute content offset for sidebar
  useEffect(() => {
    try {
      const mq = window.matchMedia('(max-width: 768px)')
      const apply = e => setIsNarrow(!!e.matches)
      apply(mq)
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev
      try {
        safeSetItem('sidebarOpen', next)
      } catch {}
      return next
    })
  }, [safeSetItem])

  useEffect(() => {
    /* cleanup placeholder */
  }, [])

  // Detect embedded mode (?embed=1) so native apps can control nav and we hide web bottom bar
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      setIsEmbedded(sp.get('embed') === '1')
    } catch {
      /* ignore */
    }
  }, [])

  // Enhanced theme system with system preference detection and validation
  const THEME_STORAGE_KEY = 'vault-theme-preference'
  const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

  // Initialize theme system
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check localStorage first
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme && VALID_THEMES.includes(savedTheme)) {
          setTheme(savedTheme)
          document.documentElement.setAttribute('data-theme', savedTheme)
          return savedTheme
        }
      } catch (error) {
        console.warn('Failed to read theme from localStorage:', error)
      }

      // Fallback to system preference
      try {
        const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
        const systemPrefersDark = mediaQuery.matches
        const systemTheme = systemPrefersDark ? 'dark' : 'light'

        setTheme(systemTheme)
        document.documentElement.setAttribute('data-theme', systemTheme)

        // Listen for system theme changes
        const handleSystemThemeChange = e => {
          // Only auto-switch if user hasn't manually set a preference
          try {
            const userPreference = localStorage.getItem(THEME_STORAGE_KEY)
            if (!userPreference) {
              const newSystemTheme = e.matches ? 'dark' : 'light'
              setTheme(newSystemTheme)
              document.documentElement.setAttribute('data-theme', newSystemTheme)
            }
          } catch (error) {
            // ignore theme change read errors
            console.warn('Failed to handle system theme change:', error)
          }
        }

        mediaQuery.addEventListener('change', handleSystemThemeChange)

        // Cleanup function
        return () => {
          try {
            mediaQuery.removeEventListener('change', handleSystemThemeChange)
          } catch (error) {
            // ignore cleanup errors
            console.warn('Failed to cleanup theme listener:', error)
          }
        }
      } catch (error) {
        console.warn('Failed to detect system theme preference:', error)
        // Ultimate fallback
        const fallbackTheme = 'dark'
        setTheme(fallbackTheme)
        document.documentElement.setAttribute('data-theme', fallbackTheme)
      }
    }

    return initializeTheme()
  }, [])

  // Load initial view from localStorage (persist selected tab)
  useEffect(() => {
    const savedView = safeGetItem('view')
    if (
      savedView === 'map' ||
      savedView === 'matrix' ||
      savedView === 'home' ||
      savedView === 'pomodoro' ||
      savedView === 'settings' ||
      savedView === 'scorecard'
    ) {
      setView(savedView)
    }
    const savedMode = safeGetItem('mapMode')
    if (savedMode === 'plane' || savedMode === 'sphere') setMapMode(savedMode)
  }, [safeGetItem])

  // Hash-based navigation bridge for native embedding (#home/#map/#matrix/etc)
  useEffect(() => {
    const valid = new Set(['home', 'map', 'matrix', 'pomodoro', 'settings', 'scorecard'])
    const apply = () => {
      try {
        const h = (window.location.hash || '').replace(/^#/, '')
        if (valid.has(h)) setView(h)
      } catch {
        /* ignore */
      }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  // Keep hash in sync when view changes (helps deep links and native webview control)
  useEffect(() => {
    try {
      const h = (window.location.hash || '').replace(/^#/, '')
      if (h !== view) history.replaceState(null, '', `#${view}`)
    } catch {
      /* ignore */
    }
  }, [view])

  // Enhanced theme persistence with validation and error handling
  useEffect(() => {
    const result = safeSync(() => {
      if (!VALID_THEMES.includes(theme)) {
        throw new Error(`Invalid theme: ${theme}. Falling back to 'dark'`)
      }

      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme)

      // Update CSS custom properties for legacy compatibility
      const root = document.documentElement
      if (theme === 'dark') {
        root.style.setProperty('--bg', '#0a0a15')
        root.style.setProperty('--fg', '#EAEAEA')
      } else {
        root.style.setProperty('--bg', '#f8f9fa')
        root.style.setProperty('--fg', '#1a1a1a')
      }

      // Persist to localStorage
      safeSetItem(THEME_STORAGE_KEY, theme)
      // Also persist to legacy key expected by some tests/utilities
      try {
        localStorage.setItem('theme', theme)
      } catch {
        /* ignore */
      }

      // Dispatch custom event for other components
      const themeChangeEvent = new CustomEvent('themeChange', {
        detail: { theme, previousTheme: document.documentElement.getAttribute('data-theme') },
      })
      window.dispatchEvent(themeChangeEvent)

      return true
    }, 'theme-apply')

    if (!result.success && !VALID_THEMES.includes(theme)) {
      setTheme('dark')
    }
  }, [theme, safeSync, safeSetItem])

  // Enhanced theme toggle function
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    // Eagerly persist for tests that read immediately after action
    try {
      localStorage.setItem('theme', newTheme)
    } catch {
      /* ignore */
    }
    setTheme(newTheme)
  }, [theme])

  // Function to set specific theme with validation
  const setSpecificTheme = useCallback(
    newTheme => {
      if (VALID_THEMES.includes(newTheme) && newTheme !== theme) {
        setTheme(newTheme)
      }
    },
    [theme],
  )

  // Function to reset to system preference
  const resetToSystemTheme = useCallback(() => {
    const result = safeSync(() => {
      // Remove user preference
      safeRemoveItem(THEME_STORAGE_KEY)

      // Detect system preference
      const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
      const systemTheme = mediaQuery.matches ? 'dark' : 'light'
      setTheme(systemTheme)

      return systemTheme
    }, 'theme-reset')

    return result.success
  }, [safeSync, safeRemoveItem, THEME_MEDIA_QUERY])

  // Enhanced global keyboard shortcuts
  const globalShortcuts = useMemo(
    () => ({
      // Help shortcuts
      h: () => {
        setShowOb(true)
        return true
      },
      H: () => {
        setShowOb(true)
        return true
      },
      '?': () => {
        setShowOb(true)
        return true
      },
      'Shift+/': () => {
        setShowOb(true)
        return true
      },
      F1: () => {
        setShowKeyboardHelp(true)
        return true
      },
      k: () => {
        setShowKeyboardHelp(true)
        return true
      },
      K: () => {
        setShowKeyboardHelp(true)
        return true
      },

      // Theme shortcuts
      'Ctrl+Shift+t': () => {
        toggleTheme()
        return true
      },
      'Ctrl+Shift+T': () => {
        toggleTheme()
        return true
      },
      'Ctrl+Shift+l': () => {
        setSpecificTheme('light')
        return true
      },
      'Ctrl+Shift+L': () => {
        setSpecificTheme('light')
        return true
      },
      'Ctrl+Shift+d': () => {
        setSpecificTheme('dark')
        return true
      },
      'Ctrl+Shift+D': () => {
        setSpecificTheme('dark')
        return true
      },
      'Ctrl+Shift+r': () => {
        resetToSystemTheme()
        return true
      },
      'Ctrl+Shift+R': () => {
        resetToSystemTheme()
        return true
      },

      // View navigation shortcuts
      1: () => {
        setView('home')
        return true
      },
      2: () => {
        setView('matrix')
        return true
      },
      3: () => {
        setView('map')
        return true
      },
      4: () => {
        setView('settings')
        return true
      },
      p: () => {
        setView('pomodoro')
        return true
      },
      P: () => {
        setView('pomodoro')
        return true
      },
      'Alt+1': () => {
        setView('home')
        return true
      },
      'Alt+2': () => {
        setView('matrix')
        return true
      },
      'Alt+3': () => {
        setView('map')
        return true
      },
      'Alt+4': () => {
        setView('settings')
        return true
      },

      // Quick actions
      Escape: () => {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false)
          return true
        }
        if (showOb) {
          setShowOb(false)
          return true
        }
        return false
      },
    }),
    [
      toggleTheme,
      setSpecificTheme,
      resetToSystemTheme,
      setView,
      showOb,
      setShowOb,
      showKeyboardHelp,
      setShowKeyboardHelp,
    ],
  )

  useGlobalKeyboardShortcuts(globalShortcuts)

  // Persist view selection
  useEffect(() => {
    safeSetItem('view', view)
  }, [view, safeSetItem])

  // Persist map mode
  useEffect(() => {
    safeSetItem('mapMode', mapMode)
  }, [mapMode, safeSetItem])

  // Deterministic loader for tests: reach 100% quickly and hide
  useEffect(() => {
    if (!loading) return
    setLoadPct(0)
    const t1 = setTimeout(() => setLoadPct(100), 800)
    const t2 = setTimeout(() => setLoading(false), 1200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [loading])

  // Failsafe: if Globe never signals ready (e.g., no WebGL / slow devices), finish loader after a timeout
  useEffect(() => {
    if (!loading) return
    const FAILSAFE_MS = 12000
    const t = setTimeout(() => {
      // If still loading after the timeout, complete and hide the loader
      setLoadPct(100)
      setTimeout(() => setLoading(false), 280)
    }, FAILSAFE_MS)
    return () => clearTimeout(t)
  }, [loading])

  const handleGlobeReady = () => {
    setLoadPct(100)
    setTimeout(() => setLoading(false), 280)
  }
  // If in sphere mode, skip loader (renders instantly)
  useEffect(() => {
    if (view === 'map' && mapMode === 'sphere') {
      setLoadPct(100)
      const t = setTimeout(() => setLoading(false), 150)
      return () => clearTimeout(t)
    }
  }, [view, mapMode])

  // Idle prefetch: when on Map (plane mode), prefetch SphereMap chunk after a short delay
  useEffect(() => {
    let t
    try {
      if (view === 'map' && mapMode === 'plane') {
        t = setTimeout(() => {
          import('./features/map/SphereMap')
        }, 2000)
      }
    } catch {
      /* ignore */
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [view, mapMode])

  // Demo feature removed per request

  // Close menu on outside click or Esc
  useEffect(() => {
    if (!menuOpen) return
    const onDocDown = e => {
      const m = menuRef.current
      const b = menuBtnRef.current
      if (!m || !b) return
      if (!m.contains(e.target) && !b.contains(e.target)) setMenuOpen(false)
    }
    const onKey = e => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    const el = headerRef.current
    const navEl = document.querySelector('.nav-bottom')
    if (!el && !navEl) return
    const measure = () => {
      try {
        /* header height currently unused */ el?.getBoundingClientRect?.()
      } catch {
        /* ignore */
      }
      try {
        setBottomNavH(navEl?.getBoundingClientRect?.().height || 0)
      } catch {
        setBottomNavH(0)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    try {
      if (el) ro.observe(el)
      if (navEl) ro.observe(navEl)
    } catch {
      /* ignore */
    }
    const onWin = () => measure()
    window.addEventListener('resize', onWin)
    const onDom = () => {
      // in case nav-bottom mounts after first paint
      const n = document.querySelector('.nav-bottom')
      if (n && n !== navEl) {
        try {
          ro.observe(n)
        } catch {
          /* ignore */
        }
        measure()
        document.removeEventListener('DOMContentLoaded', onDom)
      }
    }
    document.addEventListener('DOMContentLoaded', onDom)
    return () => {
      try {
        ro.disconnect()
      } catch {
        /* ignore */
      }
      window.removeEventListener('resize', onWin)
      document.removeEventListener('DOMContentLoaded', onDom)
    }
  }, [])

  // Global error listeners for better diagnostics in production
  useEffect(() => {
    const onError = e => {
      try {
        console.error('[GlobalError]', e?.message || e, e?.error)
      } catch (err) {
        /* swallow console error */
      }
    }
    const onRej = e => {
      try {
        console.error('[UnhandledRejection]', e?.reason || e)
      } catch (err) {
        /* swallow console error */
      }
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRej)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRej)
    }
  }, [])

  return (
    <div className="app" style={{ position: 'relative' }}>
      {/* Left Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        currentView={view}
        onSelect={v => setView(v)}
      />
      {/* Mobile backdrop when sidebar is open */}
      {isNarrow && sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 21,
            background: 'rgba(0,0,0,.35)',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
          }}
        />
      )}
      {/* Top navigation bar (persistent) */}
      {/* Skip link */}
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>

      <header
        ref={headerRef}
        role="banner"
        style={{
          position: 'sticky',
          top: 'max(10px, env(safe-area-inset-top))',
          zIndex: 18,
          pointerEvents: 'none',
          paddingLeft: `max(${isNarrow ? 0 : sidebarOpen ? 260 : 86}px, env(safe-area-inset-left))`,
          paddingRight: 'max(10px, env(safe-area-inset-right))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text)',
            padding: '10px 12px',
            borderRadius: 12,
            boxShadow: '0 12px 36px rgba(0,0,0,.22)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
          }}
        >
          {/* Logo */}
          <div
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              background: 'conic-gradient(from 210deg, #0f2a4d, #f0375d 40%, #db2d50, #0f2a4d)',
              fontWeight: 900,
            }}
          >
            IS
          </div>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Idea Sphere</div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Vistas"
            style={{ display: 'flex', gap: 6, marginLeft: 16 }}
          >
            <button
              id="tab-home"
              role="tab"
              aria-selected={view === 'home'}
              aria-controls="panel-home"
              onClick={() => setView('home')}
              style={{
                background: view === 'home' ? 'var(--primary)' : 'transparent',
                color: view === 'home' ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 10,
                padding: '8px 12px',
                minHeight: 36,
                minWidth: 44,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Inicio
            </button>
            <button
              id="tab-map"
              role="tab"
              aria-selected={view === 'map'}
              aria-controls="panel-map"
              onClick={() => setView('map')}
              style={{
                background: view === 'map' ? 'var(--primary)' : 'transparent',
                color: view === 'map' ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 10,
                padding: '8px 12px',
                minHeight: 36,
                minWidth: 44,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Mapa
            </button>
            <button
              id="tab-matrix"
              role="tab"
              aria-selected={view === 'matrix'}
              aria-controls="panel-matrix"
              onClick={() => setView('matrix')}
              style={{
                background: view === 'matrix' ? 'var(--primary)' : 'transparent',
                color: view === 'matrix' ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 10,
                padding: '8px 12px',
                minHeight: 36,
                minWidth: 44,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Matriz
            </button>
            <button
              id="tab-pomo"
              role="tab"
              aria-selected={view === 'pomodoro'}
              aria-controls="panel-pomo"
              onClick={() => setView('pomodoro')}
              style={{
                background: view === 'pomodoro' ? 'var(--primary)' : 'transparent',
                color: view === 'pomodoro' ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 10,
                padding: '8px 12px',
                minHeight: 36,
                minWidth: 44,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Pomodoro
            </button>
            <button
              id="tab-settings"
              role="tab"
              aria-selected={view === 'settings'}
              aria-controls="panel-settings"
              onClick={() => setView('settings')}
              style={{
                background: view === 'settings' ? 'var(--primary)' : 'transparent',
                color: view === 'settings' ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 10,
                padding: '8px 12px',
                minHeight: 36,
                minWidth: 44,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ajustes
            </button>
            <button
              id="tab-score"
              role="tab"
              aria-selected={view === 'scorecard'}
              aria-controls="panel-score"
              onClick={() => setView('scorecard')}
              style={{
                background: view === 'scorecard' ? 'var(--primary)' : 'transparent',
                color: view === 'scorecard' ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--surface-border)',
                borderRadius: 10,
                padding: '8px 12px',
                minHeight: 36,
                minWidth: 44,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Scorecard
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Help */}
            <button
              type="button"
              onClick={() => setShowOb(true)}
              aria-label="Ayuda y atajos (H / ?)"
              title="Ayuda y atajos (H / ?)"
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--surface-border)',
                padding: '8px 10px',
                minHeight: 36,
                minWidth: 36,
                borderRadius: 10,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={18} aria-hidden="true" />
            </button>
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Modo claro (Ctrl+Shift+L)' : 'Modo oscuro (Ctrl+Shift+D)'}
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--surface-border)',
                padding: '8px 10px',
                minHeight: 36,
                minWidth: 44,
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {theme === 'dark' ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>
            {/* Profile mini */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface)',
                color: 'var(--surface-text)',
                border: '1px solid var(--surface-border)',
                padding: '6px 10px',
                borderRadius: 10,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontWeight: 900,
                }}
              >
                U
              </div>
              <span className="hide-on-compact" style={{ fontWeight: 800 }}>
                usuario
              </span>
            </div>
            {/* Menu */}
            <div style={{ position: 'relative' }}>
              <button
                ref={menuBtnRef}
                type="button"
                aria-label="Menú"
                title="Menú"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--surface-border)',
                  padding: '8px 10px',
                  minHeight: 36,
                  minWidth: 44,
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Menú principal"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    zIndex: 30,
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text)',
                    borderRadius: 12,
                    boxShadow: '0 16px 48px rgba(0,0,0,.28)',
                    minWidth: 200,
                    padding: 6,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setShowOb(true)
                      setMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      color: 'var(--text)',
                      border: '1px solid transparent',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Ayuda y atajos
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      toggleTheme()
                      setMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      color: 'var(--text)',
                      border: '1px solid transparent',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Cambiar tema ({theme === 'dark' ? 'claro' : 'oscuro'})
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setView('pomodoro')
                      setMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      color: 'var(--text)',
                      border: '1px solid transparent',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Ir a Pomodoro
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setView(v => (v === 'map' ? 'matrix' : 'map'))
                      setMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      color: 'var(--text)',
                      border: '1px solid transparent',
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {view === 'map' ? 'Ir a Matriz' : 'Ir a Mapa'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {showWelcome && (
        <Welcome
          onEnterMatrix={() => {
            setView('matrix')
            setShowWelcome(false)
          }}
          onEnterMap={() => {
            setView('map')
            setShowWelcome(false)
          }}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Main content area with tabpanels */}
      <main
        id="main"
        role="main"
        style={{
          position: 'relative',
          paddingTop: 0,
          paddingLeft: isNarrow ? 0 : sidebarOpen ? 260 : 86,
          transition: 'padding-left .18s ease',
          paddingBottom:
            view === 'matrix' ||
            view === 'home' ||
            view === 'pomodoro' ||
            view === 'settings' ||
            view === 'scorecard'
              ? bottomNavH + 12
              : 0,
        }}
      >
        {/* Home */}
        <div role="tabpanel" id="panel-home" aria-labelledby="tab-home" hidden={view !== 'home'}>
          {view === 'home' && (
            <React.Suspense fallback={<div style={{ padding: 16 }}>Cargando inicio…</div>}>
              <HomePanel />
            </React.Suspense>
          )}
        </div>

        {/* Map */}
        <div role="tabpanel" id="panel-map" aria-labelledby="tab-map" hidden={view !== 'map'}>
          {view === 'map' && (
            <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)' }}>
              {mapMode === 'plane' ? (
                <Globe
                  onHelp={() => setShowOb(true)}
                  onReady={handleGlobeReady}
                  onApi={api => (globeApiRef.current = api)}
                  showControls={!showWelcome}
                />
              ) : (
                <React.Suspense
                  fallback={
                    <div
                      style={{
                        position: 'absolute',
                        inset: 12,
                        zIndex: 17,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        boxShadow: '0 10px 28px rgba(0,0,0,.28)',
                      }}
                    >
                      <span role="status" aria-live="polite">
                        Cargando 3D…
                      </span>
                    </div>
                  }
                >
                  <SphereMap showPanel={!showWelcome} />
                </React.Suspense>
              )}
              {/* Toggle de modo: Plano / Esfera */}
              <div
                style={{
                  position: 'absolute',
                  top: 'max(12px, env(safe-area-inset-top))',
                  right: 'max(12px, env(safe-area-inset-right))',
                  zIndex: 17,
                  display: 'flex',
                  gap: 6,
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: '0 10px 28px rgba(0,0,0,.28)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMapMode('plane')}
                  aria-pressed={mapMode === 'plane'}
                  style={{
                    background: mapMode === 'plane' ? 'var(--primary)' : 'transparent',
                    color: mapMode === 'plane' ? 'var(--on-primary)' : 'var(--text)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minWidth: 64,
                  }}
                >
                  Plano
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('sphere')}
                  aria-pressed={mapMode === 'sphere'}
                  style={{
                    background: mapMode === 'sphere' ? 'var(--primary)' : 'transparent',
                    color: mapMode === 'sphere' ? 'var(--on-primary)' : 'var(--text)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minWidth: 64,
                  }}
                >
                  Esfera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Matrix */}
        <div
          role="tabpanel"
          id="panel-matrix"
          aria-labelledby="tab-matrix"
          hidden={view !== 'matrix'}
        >
          {view === 'matrix' && (
            <>
              <FocusLoopBar />
              <React.Suspense fallback={<div style={{ padding: 16 }}>Cargando matriz…</div>}>
                <EisenhowerPanel />
              </React.Suspense>
            </>
          )}
        </div>

        {/* Pomodoro */}
        <div
          role="tabpanel"
          id="panel-pomo"
          aria-labelledby="tab-pomo"
          hidden={view !== 'pomodoro'}
        >
          {view === 'pomodoro' && (
            <React.Suspense fallback={<div style={{ padding: 16 }}>Cargando pomodoro…</div>}>
              <PomodoroPanel />
            </React.Suspense>
          )}
        </div>

        {/* Settings */}
        <div
          role="tabpanel"
          id="panel-settings"
          aria-labelledby="tab-settings"
          hidden={view !== 'settings'}
        >
          {view === 'settings' && (
            <React.Suspense fallback={<div style={{ padding: 16 }}>Cargando ajustes…</div>}>
              <SettingsPanel
                theme={theme}
                onThemeToggle={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              />
            </React.Suspense>
          )}
        </div>

        {/* Scorecard */}
        <div
          role="tabpanel"
          id="panel-score"
          aria-labelledby="tab-score"
          hidden={view !== 'scorecard'}
        >
          {view === 'scorecard' && (
            <React.Suspense fallback={<div style={{ padding: 16 }}>Cargando scorecard…</div>}>
              <WeeklyScorecard />
            </React.Suspense>
          )}
        </div>
      </main>

      <Onboarding open={showOb} onClose={() => setShowOb(false)} />
      <KeyboardShortcutsHelp show={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
      <Preloader progress={loadPct} visible={loading && view === 'map'} />
      {/* Bottom navigation (mobile icons only) */}
      {isNarrow && !isEmbedded && <BottomNav view={view} onSelect={setView} />}
      {/* FAB visible solo en mapa plano */}
      {view === 'map' && mapMode === 'plane' && (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Crear nueva isla"
            title="Crear nueva isla"
            style={{
              position: 'absolute',
              right: 'max(16px, env(safe-area-inset-right))',
              bottom: isNarrow ? bottomNavH + 20 : 'max(16px, env(safe-area-inset-bottom))',
              width: 56,
              height: 56,
              borderRadius: 28,
              cursor: 'pointer',
              zIndex: 15,
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              border: 'none',
              boxShadow: '0 10px 26px rgba(240,55,93,.35)',
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            +
          </button>
          <AddIslandSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onCreate={({ title, emoji, zone }) =>
              globeApiRef.current?.addIsland?.({ title, emoji, zone })
            }
          />
        </>
      )}
      {/* Demo banner removed */}

      {/* Removed old floating theme/view switcher in favor of top nav */}
      {/* Footer landmark */}
      <footer
        role="contentinfo"
        style={{ position: 'absolute', left: 16, right: 16, bottom: 16, pointerEvents: 'none' }}
        aria-hidden
      >
        {/* Reserved for future legal/links; kept minimal to avoid overlap */}
      </footer>

      {/* Error notifications */}
      <NotificationCenter />

      {/* Mobile Tutorial */}
      {showTutorial && <MobileTutorial onComplete={completeTutorial} onSkip={skipTutorial} />}
    </div>
  )
}

// Componente principal envuelto con ErrorProvider y ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <FocusLoopProvider>
          <AppContent />
        </FocusLoopProvider>
      </ErrorProvider>
    </ErrorBoundary>
  )
}
