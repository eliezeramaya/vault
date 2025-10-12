import React from 'react'
import clsx from 'clsx'

type Props = { pct: (q: 'Q1' | 'Q2' | 'Q3' | 'Q4') => number }

export default function QuadrantLegend({ pct }: Props) {
  const items: Array<{ q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; cls: string; label: string }> = [
    { q: 'Q1', cls: 'bg-q1/30', label: 'Urgente + Importante' },
    { q: 'Q2', cls: 'bg-q2/30', label: 'No urgente + Importante' },
    { q: 'Q3', cls: 'bg-q3/30', label: 'Urgente + No importante' },
    { q: 'Q4', cls: 'bg-q4/30', label: 'No urgente + No importante' },
  ]
  return (
    <div className="glass-1 p-2 rounded-2xl grid grid-cols-2 gap-2 text-sm">
      {items.map((it) => (
        <div
          key={it.q}
          className={clsx(
            'flex items-center justify-between gap-2 rounded-xl px-2 py-1 border border-white/10',
            it.cls
          )}
        >
          <span className="font-semibold">{it.q}</span>
          <span className="opacity-80">{pct(it.q)}%</span>
        </div>
      ))}
    </div>
  )
}
