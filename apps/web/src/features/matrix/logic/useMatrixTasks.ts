import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export type MatrixTask = {
  id: string
  title: string
  priority: number // 1..10
  minutes: number // planned minutes
  quadrant: Quadrant
  createdAt?: number
}

const LS_KEY = 'matrix_tasks_v1'

export function weight(t: Pick<MatrixTask, 'priority' | 'minutes' | 'quadrant'>): number {
  const urgBoost = t.quadrant === 'Q1' || t.quadrant === 'Q3' ? 0.15 : 0
  const p = Math.max(1, Math.min(10, t.priority || 5))
  const m = Math.max(1, Math.min(600, t.minutes || 25))
  return Math.pow(p, 1.2) * Math.pow(m, 0.8) * (1 + urgBoost)
}

export function useMatrixTasks() {
  const [tasks, setTasks] = useState<MatrixTask[]>([])
  const tasksRef = useRef(tasks)
  useEffect(() => void (tasksRef.current = tasks), [tasks])

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) setTasks(arr)
    } catch {}
  }, [])

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(tasks))
    } catch {}
  }, [tasks])

  const createTask = useCallback((partial?: Partial<MatrixTask>): MatrixTask => {
    const t: MatrixTask = {
      id: partial?.id || `t_${Math.random().toString(36).slice(2, 9)}`,
      title: (partial?.title || 'Nueva tarea').slice(0, 140),
      priority: Math.max(1, Math.min(10, partial?.priority ?? 5)),
      minutes: Math.max(1, Math.min(600, partial?.minutes ?? 25)),
      quadrant: (partial?.quadrant as Quadrant) || 'Q2',
      createdAt: Date.now(),
    }
    setTasks((arr) => [...arr, t])
    return t
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<MatrixTask>) => {
    setTasks((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks((arr) => arr.filter((x) => x.id !== id))
  }, [])

  const moveToQuadrant = useCallback(
    (id: string, q: Quadrant) => updateTask(id, { quadrant: q }),
    [updateTask]
  )

  // selectors
  const areaByQuadrant = useMemo(() => {
    const acc: Record<Quadrant, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    for (const t of tasks) acc[t.quadrant] += weight(t)
    const total = Object.values(acc).reduce((a, b) => a + b, 0) || 1
    return { acc, pct: (q: Quadrant) => +(100 * (acc[q] / total)).toFixed(1) }
  }, [tasks])

  const topByQuadrant = useCallback(
    (q: Quadrant, n = 5) => {
      return tasks
        .filter((t) => t.quadrant === q)
        .map((t) => ({ t, w: weight(t) }))
        .sort((a, b) => b.w - a.w)
        .slice(0, n)
        .map((x) => x.t)
    },
    [tasks]
  )

  return {
    tasks,
    setTasks,
    createTask,
    updateTask,
    deleteTask,
    moveToQuadrant,
    areaByQuadrant,
    topByQuadrant,
  }
}

// Feature-scoped keyboard shortcuts (cancellable when input is focused)
export function useKeyboardShortcuts(map: Record<string, () => boolean | void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag)) return
      const key = e.key
      const fn = map[key]
      if (fn) {
        const handled = fn()
        if (handled) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [map])
}
