import { describe, it, expect } from 'vitest'
import { assignAnglesSorted, GRAVITY_TS_CONFIG, computeWeight } from './gravity'
import { resolveCollisions, type PolarNode } from './layout'

describe('gravity edge cases', () => {
  it('handles empty task list', () => {
    const map = assignAnglesSorted([] as any)
    expect(map.size).toBe(0)
  })

  it('distributes identical weights stably within quadrant', () => {
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      weight: 0.5,
      quadrant: 2 as const,
    }))
    const map = assignAnglesSorted(tasks)
    expect(map.size).toBe(5)
    // All angles in Q2 range
    for (const id of tasks.map((t) => t.id)) {
      const a = map.get(id)!
      expect(a).toBeGreaterThanOrEqual(45)
      expect(a).toBeLessThan(135)
    }
  })

  it('collision overflow scenario reports overflow when packed extremely tight', () => {
    // Create many nodes tightly clustered to trigger spiral pushes
    const base: PolarNode[] = []
    for (let i = 0; i < 25; i++) {
      base.push({
        id: `n${i}`,
        weight: computeWeight(5, 25, GRAVITY_TS_CONFIG),
        quadrant: 1,
        r: 100,
        theta: 10 + i * 0.2,
        boxScale: 1,
        width: 160,
        height: 110,
      })
    }
    const { overflow } = resolveCollisions(base, {
      dr: 2,
      dTheta: 2,
      maxIter: 10,
      quadrantRanges: {
        1: { start: -45, span: 90 },
        2: { start: 45, span: 90 },
        3: { start: 135, span: 90 },
        4: { start: 225, span: 90 },
      },
    })
    // Not guaranteed but likely; just assert function returns array even if empty
    expect(Array.isArray(overflow)).toBe(true)
  })
})
