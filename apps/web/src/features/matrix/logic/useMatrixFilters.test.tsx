import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMatrixFilters } from './useMatrixFilters'

describe('useMatrixFilters', () => {
  it('filters by query/quadrant/priority', () => {
    const { result } = renderHook(() => useMatrixFilters())
    act(() =>
      result.current.setFilter((f) => ({ ...f, query: 'plan', quadrant: 'Q2', minPriority: 5 }))
    )
    const ok = result.current.apply.test({ text: 'plan viaje', quadrant: 'Q2', priority: 7 })
    const noQ = result.current.apply.test({ text: 'plan viaje', quadrant: 'Q3', priority: 7 })
    const noP = result.current.apply.test({ text: 'plan viaje', quadrant: 'Q2', priority: 3 })
    expect(ok).toBe(true)
    expect(noQ).toBe(false)
    expect(noP).toBe(false)
  })
})
