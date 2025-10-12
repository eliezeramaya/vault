import React from 'react'
import { Sun, Moon, Plus, Search } from 'lucide-react'
import clsx from 'clsx'

type Props = {
  onCreate: () => void
  onSearch: (q: string) => void
  onToggleTheme: () => void
  density: 'compact' | 'comfortable'
  setDensity: (d: 'compact' | 'comfortable') => void
  filters: { Q1: boolean; Q2: boolean; Q3: boolean; Q4: boolean }
  setFilters: (f: Props['filters']) => void
}

export default function Toolbar({
  onCreate,
  onSearch,
  onToggleTheme,
  density,
  setDensity,
  filters,
  setFilters,
}: Props) {
  return (
    <div className={clsx('glass-1', 'p-3 flex items-center gap-2 rounded-2xl')}>
      <button
        className="px-3 py-2 rounded-xl bg-q2/20 text-fg border border-white/10"
        onClick={onCreate}
        aria-label="Crear tarea"
      >
        <Plus size={16} />
      </button>
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg/40 border border-white/10 flex-1">
        <Search size={16} />
        <input
          className="bg-transparent outline-none w-full text-fg placeholder-fg/60"
          placeholder="Buscar…"
          onChange={(e) => onSearch(e.target.value)}
        />
      </label>
      <div className="hidden sm:flex items-center gap-1">
        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
          <button
            key={q}
            onClick={() => setFilters({ ...filters, [q]: !filters[q] })}
            className={clsx(
              'px-2 py-1 rounded-lg border',
              filters[q] ? 'bg-fg/10 border-white/20' : 'bg-transparent border-white/10'
            )}
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleTheme}
          aria-label="Cambiar tema"
          className="px-2 py-1 rounded-lg border border-white/10"
        >
          <Sun className="hidden dark:block" size={16} />
          <Moon className="block dark:hidden" size={16} />
        </button>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as any)}
          className="px-2 py-1 rounded-lg bg-transparent border border-white/10"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </select>
      </div>
    </div>
  )
}
