import React, { useEffect, useRef } from 'react'

type Props = {
  x: number
  y: number
  visible: boolean
  onClose: () => void
  onAction: (action: string) => void
}

export default function ContextMenu({ x, y, visible, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [onClose])
  if (!visible) return null
  return (
    <div
      ref={ref}
      className="glass-1 p-2 rounded-2xl border border-white/10 text-sm"
      style={{ position: 'fixed', left: x, top: y, zIndex: 50 }}
      role="menu"
    >
      {['move:Q1', 'move:Q2', 'move:Q3', 'move:Q4', 'prio:+', 'prio:-', 'split', 'archive'].map(
        (k) => (
          <button
            key={k}
            onClick={() => onAction(k)}
            className="block w-full text-left px-3 py-1 rounded-lg hover:bg-fg/10"
          >
            {label(k)}
          </button>
        )
      )}
    </div>
  )
}

function label(k: string) {
  if (k.startsWith('move:')) return `Mover a ${k.split(':')[1]}`
  if (k === 'prio:+') return '+ prioridad'
  if (k === 'prio:-') return '- prioridad'
  if (k === 'split') return 'Dividir tarea'
  if (k === 'archive') return 'Archivar'
  return k
}
