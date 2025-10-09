import React, { useMemo, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  computeWeight,
  computeRadius,
  computeBoxScale,
  assignAnglesSorted,
} from '../../lib/gravity'

/**
 * GravityMatrix – experimental addictive micro-interactions version.
 * Props:
 *  tasks: Array<{id,title,text,priority,timeMinutes}>
 *  onUpdate(taskId, patch)
 *  targetDailyWeight: number (for Action Index)
 */
export function GravityMatrix({ tasks, onUpdate, targetDailyWeight = 10 }) {
  const [focusId, setFocusId] = useState(null)
  const [editorId, setEditorId] = useState(null)
  const liveRef = useRef(null)

  const enriched = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        weight: computeWeight(t.priority ?? 5, t.timeMinutes ?? 0),
      })),
    [tasks]
  )

  const thetaMap = useMemo(() => assignAnglesSorted(enriched), [enriched])

  const nodes = useMemo(
    () =>
      enriched.map((t) => {
        const w = t.weight
        const r = computeRadius(w)
        const theta = thetaMap.get(t.id) ?? 0
        const scale = computeBoxScale(w)
        const rad = (theta * Math.PI) / 180
        const x = r * Math.cos(rad)
        const y = r * Math.sin(rad)
        return { ...t, r, theta, x, y, boxScale: scale }
      }),
    [enriched, thetaMap]
  )

  // Action Index (sum of weights, naive)
  const actionSum = useMemo(() => nodes.reduce((a, n) => a + n.weight, 0), [nodes])
  const actionPct = targetDailyWeight ? Math.min(1, actionSum / targetDailyWeight) : 0

  const announce = useCallback((msg) => {
    if (liveRef.current) {
      liveRef.current.textContent = msg
    }
  }, [])

  const quickTimes = [15, 25, 50, 90, 120]

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

      {/* Action Index */}
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
        }}
      >
        <strong>Índice Acción</strong>
        <br />
        {actionSum.toFixed(2)} / {targetDailyWeight} ({(actionPct * 100).toFixed(0)}%)
      </div>

      {nodes.map((n) => {
        const editing = editorId === n.id
        return (
          <motion.div
            key={n.id}
            className={`g-node${focusId === n.id ? ' focus' : ''}`}
            aria-label={`Tarea ${n.title || n.text || n.id}, peso ${n.weight.toFixed(2)}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${n.x}px)`,
              top: `calc(50% + ${n.y}px)`,
              transformOrigin: 'center',
              background: 'var(--surface)',
              color: 'var(--surface-text)',
              border: '1px solid var(--surface-border)',
              padding: '10px 12px',
              borderRadius: 16,
              width: 180,
              maxWidth: 200,
              boxShadow: '0 6px 18px rgba(0,0,0,.35)',
              cursor: 'pointer',
            }}
            initial={false}
            animate={{ scale: n.boxScale, x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
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
                  {n.title || n.text || 'Sin título'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{n.weight.toFixed(2)}</div>
              </div>
            )}
            {!editing && (
              <div style={{ marginTop: 4, fontSize: 11, opacity: 0.75 }}>
                p{n.priority} · {n.timeMinutes || 0}m
              </div>
            )}
            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600 }}>Prioridad: {n.priority}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={n.priority}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    onUpdate(n.id, { priority: v })
                    announce(`Prioridad ${v}`)
                  }}
                />
                <label style={{ fontSize: 11, fontWeight: 600 }}>
                  Tiempo (min): {n.timeMinutes || 0}
                </label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {quickTimes.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        onUpdate(n.id, { timeMinutes: q })
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
                  value={n.timeMinutes || 0}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value) || 0)
                    onUpdate(n.id, { timeMinutes: v })
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
                  onClick={() => setEditorId(n.id)}
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
                    onUpdate(n.id, { priority: Math.min(10, (n.priority || 5) + 1) })
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
                    onUpdate(n.id, { priority: Math.max(1, (n.priority || 5) - 1) })
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
    </div>
  )
}

export default GravityMatrix
