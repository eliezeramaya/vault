import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  computeWeight,
  computeRadius,
  computeBoxScale,
  assignAnglesSorted,
  GRAVITY_TS_CONFIG,
} from '../../lib/gravity'
import { safeStringGet, safeStringSet } from '../../lib/safeStorage'
import { resolveCollisions, DEFAULT_COLLISION_CFG, type PolarNode } from '../../lib/layout'

export interface GravityTask {
  id: string
  title?: string
  text?: string
  priority: number
  timeMinutes: number
  quadrant?: 1 | 2 | 3 | 4
}

interface Props {
  tasks: GravityTask[]
  onUpdate: (id: string, patch: Partial<GravityTask>) => void
  targetDailyWeight?: number
  baseBox?: { width: number; height: number }
  onCreateTask?: () => void
  onCenterView?: () => void
  onZoomFit?: () => void
}

const BASE_BOX = { width: 180, height: 120 }

function deriveQuadrant(t: GravityTask): 1 | 2 | 3 | 4 {
  // Placeholder: map by priority threshold (can be replaced with real importance/urgency flags)
  const high = (t.priority ?? 5) >= 6
  return high ? 1 : 3
}

export const GravityMatrix: React.FC<Props> = ({
  tasks,
  onUpdate,
  targetDailyWeight = 10,
  baseBox = BASE_BOX,
  onCreateTask,
  onCenterView,
  onZoomFit,
}) => {
  const [focusId, setFocusId] = useState<string | null>(null)
  const [editorId, setEditorId] = useState<string | null>(null)
  const liveRef = useRef<HTMLDivElement | null>(null)
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    const saved = safeStringGet('gravity_target_daily')
    return saved ? Math.max(1, Number(saved) || 10) : targetDailyWeight
  })
  useEffect(() => {
    safeStringSet('gravity_target_daily', String(dailyTarget))
  }, [dailyTarget])

  const enriched = useMemo(
    () =>
      tasks.map((t) => {
        const weight = computeWeight(t.priority, t.timeMinutes, GRAVITY_TS_CONFIG)
        const quadrant = t.quadrant ?? deriveQuadrant(t)
        return { ...t, weight, quadrant }
      }),
    [tasks]
  )

  // Angles by quadrant & weight ordering
  const thetaMap = useMemo(
    () =>
      assignAnglesSorted(
        enriched.map((e) => ({ id: e.id, weight: e.weight, quadrant: e.quadrant }) as any)
      ),
    [enriched]
  )

  // Build polar nodes before collision resolution
  const polarNodes: PolarNode[] = useMemo(
    () =>
      enriched.map((e) => {
        const theta = thetaMap.get(e.id) ?? 0
        const r = computeRadius(e.weight, GRAVITY_TS_CONFIG)
        const boxScale = computeBoxScale(e.weight, GRAVITY_TS_CONFIG)
        return {
          id: e.id,
          weight: e.weight,
          quadrant: e.quadrant,
          theta,
          r,
          boxScale,
          width: baseBox.width,
          height: baseBox.height,
        }
      }),
    [enriched, thetaMap, baseBox.width, baseBox.height]
  )

  const { nodes } = useMemo(
    () =>
      resolveCollisions(
        [...polarNodes].sort((a, b) => b.weight - a.weight),
        DEFAULT_COLLISION_CFG
      ),
    [polarNodes]
  )

  const actionSum = useMemo(() => nodes.reduce((a, n) => a + n.weight, 0), [nodes])
  const actionPct = Math.min(1, actionSum / dailyTarget)

  const announce = useCallback((msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg
  }, [])

  const quickTimes = [15, 25, 50, 90, 120]

  // Provide internal fallback center/zoom (no real pan/zoom yet, placeholder for future implementation)
  const internalCenter = useCallback(() => {
    // could integrate with a pan/zoom context later; for now just announce
    announce('Vista centrada')
  }, [announce])
  const internalZoomFit = useCallback(() => {
    announce('Zoom ajustado')
  }, [announce])

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.key) return
      const key = e.key.toLowerCase()
      if (key === 'n') {
        if (onCreateTask) {
          onCreateTask()
          announce('Tarea creada')
        } else {
          announce('Crear tarea (callback no provisto)')
        }
      } else if (key === 'p' && focusId) {
        onUpdate(focusId, {
          priority: Math.min(10, (tasks.find((t) => t.id === focusId)?.priority || 5) + 1),
        })
        announce('Prioridad +1')
      } else if (key === 't' && focusId) {
        setEditorId(focusId)
        announce('Editar tiempo')
      } else if (key === 'g') {
        if (onCenterView) {
          onCenterView()
          announce('Vista centrada')
        } else {
          internalCenter()
        }
      } else if (key === 'z') {
        if (onZoomFit) {
          onZoomFit()
          announce('Zoom fit')
        } else {
          internalZoomFit()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    focusId,
    onUpdate,
    tasks,
    announce,
    onCreateTask,
    onCenterView,
    onZoomFit,
    internalCenter,
    internalZoomFit,
  ])

  return (
    <div className="gravity-matrix" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        aria-live="polite"
        ref={liveRef}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          background: 'rgba(0,0,0,.40)',
          padding: '6px 10px',
          fontSize: 12,
          borderRadius: 8,
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <strong>Índice Acción</strong>
        <span>
          {actionSum.toFixed(2)} / {dailyTarget} ({(actionPct * 100).toFixed(0)}%)
        </span>
        <label style={{ fontSize: 10, opacity: 0.75 }}>
          Objetivo:
          <input
            style={{ marginLeft: 4, width: 60, fontSize: 11 }}
            type="number"
            min={1}
            value={dailyTarget}
            onChange={(e) => setDailyTarget(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>
      {/* Axes & guides */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 2,
            background: 'rgba(255,255,255,.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            background: 'rgba(255,255,255,.08)',
          }}
        />
        {[120, 200, 280].map((r) => (
          <div
            key={r}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: r * 2,
              height: r * 2,
              marginLeft: -r,
              marginTop: -r,
              border: '1px dashed rgba(255,255,255,.06)',
              borderRadius: '50%',
            }}
          />
        ))}
      </div>
      {nodes.map((n) => {
        const editing = editorId === n.id
        const rad = (n.theta * Math.PI) / 180
        const x = n.r * Math.cos(rad)
        const y = n.r * Math.sin(rad)
        const task = enriched.find((e) => e.id === n.id)!
        return (
          <motion.div
            key={n.id}
            className={`g-node${focusId === n.id ? ' focus' : ''}`}
            aria-label={`Tarea ${task.title || task.text || task.id}, peso ${n.weight.toFixed(2)}`}
            initial={false}
            animate={{ scale: n.boxScale, x: x, y: y }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              translateX: '-50%',
              translateY: '-50%',
              background: 'var(--surface)',
              color: 'var(--surface-text)',
              border: '1px solid var(--surface-border)',
              padding: '10px 12px',
              borderRadius: 16,
              width: baseBox.width,
              maxWidth: baseBox.width + 40,
              boxShadow: '0 6px 18px rgba(0,0,0,.35)',
              cursor: 'pointer',
            }}
            onClick={() => setFocusId(n.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditorId(n.id)
                e.preventDefault()
              }
            }}
            tabIndex={0}
          >
            {!editing && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, flex: 1, lineHeight: 1.2 }}>
                  {task.title || task.text || 'Sin título'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{n.weight.toFixed(2)}</div>
              </div>
            )}
            {!editing && (
              <div style={{ marginTop: 4, fontSize: 11, opacity: 0.75 }}>
                p{task.priority} · {task.timeMinutes || 0}m
              </div>
            )}
            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600 }}>Prioridad: {task.priority}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={task.priority}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    onUpdate(task.id, { priority: v })
                    announce(`Prioridad ${v}`)
                  }}
                />
                <label style={{ fontSize: 11, fontWeight: 600 }}>
                  Tiempo (min): {task.timeMinutes || 0}
                </label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {quickTimes.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        onUpdate(task.id, { timeMinutes: q })
                        announce(`Tiempo ${q} minutos`)
                      }}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        background: 'var(--surface-alt)',
                        color: 'var(--surface-text)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 8,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  value={task.timeMinutes || 0}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value) || 0)
                    onUpdate(task.id, { timeMinutes: v })
                    announce(`Tiempo ${v} minutos`)
                  }}
                  style={{
                    padding: '4px 6px',
                    borderRadius: 6,
                    border: '1px solid var(--surface-border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--surface-text)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setEditorId(null)}
                  style={{
                    alignSelf: 'flex-end',
                    background: 'var(--primary)',
                    color: 'var(--on-primary)',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}
            {!editing && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setEditorId(task.id)}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: 'var(--surface-alt)',
                    color: 'var(--surface-text)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 8,
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(task.id, { priority: Math.min(10, (task.priority || 5) + 1) })
                    announce('Prioridad +1')
                  }}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: 'var(--surface-alt)',
                    color: 'var(--surface-text)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 8,
                  }}
                >
                  +P
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(task.id, { priority: Math.max(1, (task.priority || 5) - 1) })
                    announce('Prioridad -1')
                  }}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: 'var(--surface-alt)',
                    color: 'var(--surface-text)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 8,
                  }}
                >
                  -P
                </button>
              </div>
            )}
          </motion.div>
        )
      })}
      {/* TODO Shortcuts (mode gravity):
        - N: crear nueva tarea (requiere callback externo)
        - P: incrementar prioridad de la tarea enfocada
        - T: abrir editor (setEditorId)
        - G: centrar (futuro: pan/zoom state)
        - Z: zoom fit (cuando se implemente zoom)
      */}
    </div>
  )
}

export default GravityMatrix
