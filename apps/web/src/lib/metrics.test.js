/* global describe, it, expect */
import { fqi } from './metrics'

describe('fqi()', () => {
  it('returns 0 when no minutes', () => {
    expect(fqi({ minQ1:0, minQ2:0, minQ3:0, minQ4:0 })).toBe(0)
  })
  it('rewards Q1/Q2 and penalizes Q3/Q4, clamped 0..1', () => {
    const a = fqi({ minQ1:60, minQ2:30, minQ3:0, minQ4:0 })
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThanOrEqual(1)
    const b = fqi({ minQ1:0, minQ2:0, minQ3:60, minQ4:60 })
    expect(b).toBeGreaterThanOrEqual(0)
    expect(b).toBeLessThan(0.5)
  })
})
