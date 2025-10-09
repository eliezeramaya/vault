import React, { useMemo } from 'react'
import { layoutRadial } from '../lib/radialMatrix'

/**
 * Experimental Radial Matrix View (Fase 2 - integración básica)
 * Props:
 *  notes: [{id, text, priority}]
 *  width,height: canvas area in px
 *  onSelect(id)
 */
export function RadialMatrixView({ notes, width = 800, height = 800, onSelect }) {
  // Map existing notes to weight inputs: p = priority, t = derivado (placeholder: longitud texto / 4)
  const tasks = useMemo(
    () =>
      notes.map((n) => ({
        id: n.id,
        p: n.priority ?? 5,
        t: Math.min(480, Math.round((n.text || '').length / 4)),
      })),
    [notes]
  )
  const { nodes, metrics } = useMemo(() => layoutRadial(tasks), [tasks])
  const cx = width / 2
  const cy = height / 2
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        border: '1px solid var(--surface-border)',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), transparent 70%)',
      }}
      aria-label="Vista radial experimental"
    >
      {/* Debug overlay */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 8,
          fontSize: 11,
          lineHeight: 1.3,
          background: 'rgba(0,0,0,0.35)',
          padding: '6px 8px',
          borderRadius: 8,
          backdropFilter: 'blur(4px)',
          color: 'var(--text)',
        }}
      >
        <strong>Radial layout</strong>
        <br />
        overlapPairs: {metrics.overlapPairs} | overflow: {metrics.overflowCount}
        <br />
        avgIter: {metrics.avgIterations.toFixed(1)}
      </div>
      {nodes.map((n) => {
        const x = cx + n.x
        const y = cy + n.y
        const scale = n.scale
        return (
          <button
            key={n.id}
            onClick={() => onSelect?.(n.id)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              transformOrigin: 'center center',
              background: 'var(--surface)',
              color: 'var(--surface-text)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 12,
              fontSize: 12 + (scale - 1) * 6,
              minWidth: 80,
              maxWidth: 180,
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,.25)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              whiteSpace: 'normal',
            }}
            title={n.id}
            aria-label={`Nota radial peso ${(n.w * 100).toFixed(0)}%`}
          >
            <span style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>{n.p}</span>
            <span style={{ display: 'block', fontSize: 11, opacity: 0.85 }}>
              {(notes.find((x) => x.id === n.id)?.text || '').slice(0, 80)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default RadialMatrixView
