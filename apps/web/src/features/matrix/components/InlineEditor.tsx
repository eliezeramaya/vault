import React, { useEffect, useRef } from 'react'

type Props = {
  value: { title: string; priority: number; minutes: number }
  onChange: (v: Props['value']) => void
  onSubmit: () => void
  onCancel: () => void
}

export default function InlineEditor({ value, onChange, onSubmit, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <div
      role="dialog"
      aria-label="Editar tarea"
      className="glass-1 p-3 rounded-2xl grid gap-2 w-72"
    >
      <label className="grid gap-1">
        <span className="text-xs opacity-80">Título</span>
        <input
          ref={inputRef}
          className="px-2 py-1 rounded-lg bg-transparent border border-white/10"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-xs opacity-80">Prioridad (1-10)</span>
          <input
            type="number"
            min={1}
            max={10}
            className="px-2 py-1 rounded-lg bg-transparent border border-white/10"
            value={value.priority}
            onChange={(e) =>
              onChange({
                ...value,
                priority: Math.max(1, Math.min(10, Number(e.target.value) || 5)),
              })
            }
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs opacity-80">Minutos</span>
          <input
            type="number"
            min={1}
            max={600}
            className="px-2 py-1 rounded-lg bg-transparent border border-white/10"
            value={value.minutes}
            onChange={(e) =>
              onChange({
                ...value,
                minutes: Math.max(1, Math.min(600, Number(e.target.value) || 25)),
              })
            }
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button className="px-3 py-1 rounded-lg border border-white/10" onClick={onCancel}>
          Cancelar
        </button>
        <button className="px-3 py-1 rounded-lg bg-q2/40 border border-white/10" onClick={onSubmit}>
          Guardar
        </button>
      </div>
    </div>
  )
}
