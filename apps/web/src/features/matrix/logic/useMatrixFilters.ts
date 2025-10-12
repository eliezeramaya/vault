import { useMemo, useState } from 'react'

export type Filter = {
  query: string
  quadrant?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'all'
  minPriority?: number
}

export function useMatrixFilters(initial?: Partial<Filter>) {
  const [filter, setFilter] = useState<Filter>({
    query: '',
    quadrant: 'all',
    minPriority: 1,
    ...initial,
  })
  const normalize = (s: string) => s.trim().toLowerCase()
  const apply = useMemo(
    () => ({
      test(note: { text?: string; priority?: number; quadrant?: string }) {
        const q = normalize(filter.query)
        if (q && !(note.text || '').toLowerCase().includes(q)) return false
        if (filter.quadrant && filter.quadrant !== 'all' && note.quadrant !== filter.quadrant)
          return false
        const minP = filter.minPriority ?? 1
        if ((note.priority ?? 1) < minP) return false
        return true
      },
    }),
    [filter]
  )
  return { filter, setFilter, apply }
}
