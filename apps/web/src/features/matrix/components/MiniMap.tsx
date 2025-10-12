import React, { useCallback, useRef } from 'react'

type Props = {
  viewport: { x: number; y: number; w: number; h: number } // 0..1
  onNavigate: (x: number, y: number) => void // center in 0..1 coords
}

export default function MiniMap({ viewport, onNavigate }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      onNavigate(x, y)
    },
    [onNavigate]
  )
  return (
    <div
      ref={ref}
      className="glass-1 w-48 h-32 rounded-2xl relative border border-white/10"
      onClick={onClick}
      role="button"
      aria-label="Navegar por el treemap"
    >
      <div
        style={{
          position: 'absolute',
          left: `${viewport.x * 100}%`,
          top: `${viewport.y * 100}%`,
          width: `${viewport.w * 100}%`,
          height: `${viewport.h * 100}%`,
          transform: 'translate(-50%, -50%)',
          outline: '2px solid rgba(255,255,255,.9)',
          outlineOffset: 0,
          boxShadow: '0 0 0 2px rgba(99,102,241,.4) inset',
        }}
      />
    </div>
  )
}
