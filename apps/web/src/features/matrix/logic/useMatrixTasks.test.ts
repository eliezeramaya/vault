import { describe, it, expect } from 'vitest'
import { weight } from './useMatrixTasks'

describe('weight()', () => {
  it('computes weight with urgency boost for Q1/Q3', () => {
    const w1 = weight({ priority: 5, minutes: 25, quadrant: 'Q2' })
    const w2 = weight({ priority: 5, minutes: 25, quadrant: 'Q1' })
    expect(w2).toBeGreaterThan(w1)
  })
  it('respects ranges and exponents', () => {
    const a = weight({ priority: 10, minutes: 60, quadrant: 'Q2' })
    const b = weight({ priority: 5, minutes: 30, quadrant: 'Q2' })
    expect(a).toBeGreaterThan(b)
  })
})
