import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
// testAct is a no-op in prod; in test we try to use ReactDOM's act to wrap external event updates
let testAct = (fn) => fn()
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  // Use dynamic import to avoid CommonJS require (better tree-shaking / ESM compliance)
  import('react-dom/test-utils')
    .then((rt) => {
      if (rt && typeof rt.act === 'function') testAct = rt.act
    })
    .catch(() => {})
}

const STORAGE_KEY = 'focus-loop-stats-v1'
const FocusLoopContext = createContext(null)

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { days: {}, target: 120, lastMessage: '' }
    const parsed = JSON.parse(raw)
    return { days: {}, target: 120, lastMessage: '', ...parsed }
  } catch {
    return { days: {}, target: 120, lastMessage: '' }
  }
}
const saveStats = (s) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

function computeStreak(days) {
  let streak = 0
  const d = new Date()
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const e = days[k]
    if (e && (e.total || 0) > 0) {
      streak++
      d.setDate(d.getDate() - 1)
    } else break
  }
  return streak
}

export function FocusLoopProvider({ children }) {
  const [stats, setStats] = useState(loadStats)
  const [session, setSession] = useState(null) // { taskId, quadrant, minutes, startedAt, endAt, remainingSec, running }
  const timerRef = useRef(null)

  useEffect(() => saveStats(stats), [stats])

  const today = todayKey()
  const todayTotal = stats.days[today]?.total || 0
  const streak = useMemo(() => computeStreak(stats.days), [stats.days])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    setSession((s) => {
      if (!s) return s
      const remaining = Math.max(0, Math.round((s.endAt - Date.now()) / 1000))
      if (remaining <= 0) {
        queueMicrotask(() => completeFocus())
        return { ...s, remainingSec: 0, running: false }
      }
      return { ...s, remainingSec: remaining }
    })
  }, [completeFocus])

  const startFocus = useCallback(
    ({ minutes = 25, taskId = null, quadrant = 'Q2' } = {}) => {
      testAct(() => {
        const endAt = Date.now() + minutes * 60_000
        stopTimer()
        const s = {
          taskId,
          quadrant,
          minutes,
          startedAt: Date.now(),
          endAt,
          remainingSec: minutes * 60,
          running: true,
        }
        setSession(s)
        timerRef.current = setInterval(tick, 1000)
      })
    },
    [stopTimer, tick]
  )

  const pauseFocus = useCallback(() => {
    setSession((s) => {
      if (!s || !s.running) return s
      stopTimer()
      const remaining = Math.max(0, Math.round((s.endAt - Date.now()) / 1000))
      return { ...s, remainingSec: remaining, running: false, endAt: Date.now() + remaining * 1000 }
    })
  }, [stopTimer])

  const resumeFocus = useCallback(() => {
    setSession((s) => {
      if (!s || s.running) return s
      const endAt = Date.now() + (s.remainingSec || 0) * 1000
      const next = { ...s, running: true, endAt }
      stopTimer()
      timerRef.current = setInterval(tick, 1000)
      return next
    })
  }, [stopTimer, tick])

  const cancelFocus = useCallback(() => {
    stopTimer()
    setSession(null)
  }, [stopTimer])

  const confetti = useCallback((count = 60) => {
    try {
      const container = document.createElement('div')
      Object.assign(container.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: '9999',
      })
      document.body.appendChild(container)
      const colors = ['#f0375d', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#14b8a6']
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div')
        const size = 6 + Math.random() * 6
        Object.assign(p.style, {
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: '-10px',
          width: `${size}px`,
          height: `${size}px`,
          background: colors[i % colors.length],
          opacity: '0.9',
          borderRadius: '1px',
        })
        container.appendChild(p)
        // Animate if supported; otherwise, graceful fallback
        const doAnim = () => {
          const rotate = 720 + Math.random() * 720
          const endY =
            typeof window !== 'undefined' && window.innerHeight ? window.innerHeight + 40 : 600
          if (typeof p.animate === 'function') {
            p.animate(
              [
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${endY}px) rotate(${rotate}deg)`, opacity: 0.9 },
              ],
              {
                duration: 1200 + Math.random() * 600,
                easing: 'cubic-bezier(.2,.6,.2,1)',
                delay: Math.random() * 200,
              }
            )
          } else {
            // CSS fallback without Web Animations API
            p.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out'
            // trigger in next tick
            setTimeout(() => {
              p.style.transform = `translateY(${endY}px) rotate(${rotate}deg)`
              p.style.opacity = '0.9'
            }, 10)
          }
        }
        doAnim()
      }
      setTimeout(() => container.remove(), 2000)
    } catch {
      /* ignore confetti errors (e.g., tests/jsdom) */
    }
  }, [])

  const completeFocus = useCallback(() => {
    stopTimer()
    setSession((s) => {
      if (!s) return null
      const mins = s.minutes
      const prev = stats.days[today] || { total: 0, byQuadrant: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } }
      const byQ = { ...prev.byQuadrant, [s.quadrant]: (prev.byQuadrant?.[s.quadrant] || 0) + mins }
      const nextDays = {
        ...stats.days,
        [today]: { total: (prev.total || 0) + mins, byQuadrant: byQ },
      }

      // Calidad semanal (porcentaje Q2 sobre total últimos 7 días)
      const last7 = []
      const d = new Date()
      for (let i = 0; i < 7; i++) {
        last7.push(
          nextDays[
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          ] || { total: 0, byQuadrant: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } }
        )
        d.setDate(d.getDate() - 1)
      }
      const sumTotal = last7.reduce((a, b) => a + (b.total || 0), 0)
      const sumQ2 = last7.reduce((a, b) => a + (b.byQuadrant?.Q2 || 0), 0)
      const qualityAfter =
        sumTotal > 0 ? Math.round((sumQ2 / sumTotal) * 100) : s.quadrant === 'Q2' ? 100 : 0

      const message = `+${mins} min en ${s.quadrant} → ${qualityAfter}% foco de calidad esta semana`
      setStats((prevStats) => {
        const merged = { ...prevStats, days: nextDays, lastMessage: message }
        saveStats(merged)
        return merged
      })
      confetti()
      return null
    })
  }, [today, stats.days, confetti, stopTimer])

  // API global para disparo desde tarjetas de tareas
  useEffect(() => {
    const handler = (e) => {
      const { minutes = 25, taskId = null, quadrant = 'Q2' } = e.detail || {}
      startFocus({ minutes, taskId, quadrant })
    }
    window.addEventListener('focus:start', handler)
    return () => window.removeEventListener('focus:start', handler)
  }, [startFocus])

  const setTarget = useCallback(
    (minutes) =>
      setStats((s) => ({ ...s, target: Math.max(15, Math.min(360, Number(minutes) || 120)) })),
    []
  )

  const value = useMemo(
    () => ({
      stats,
      today,
      todayTotal,
      streak,
      session,
      startFocus,
      pauseFocus,
      resumeFocus,
      cancelFocus,
      completeFocus,
      setTarget,
    }),
    [
      stats,
      today,
      todayTotal,
      streak,
      session,
      startFocus,
      pauseFocus,
      resumeFocus,
      cancelFocus,
      completeFocus,
      setTarget,
    ]
  )

  return <FocusLoopContext.Provider value={value}>{children}</FocusLoopContext.Provider>
}

export function useFocusLoop() {
  const ctx = useContext(FocusLoopContext)
  if (!ctx) throw new Error('useFocusLoop must be used within FocusLoopProvider')
  return ctx
}
