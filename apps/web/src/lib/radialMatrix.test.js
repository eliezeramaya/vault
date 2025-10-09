import { describe, it, expect } from 'vitest'
import { computeWeight, layoutRadial, RADIAL_CONFIG } from './radialMatrix'

describe('radial matrix weight + layout', () => {
  it('higher priority => higher weight => smaller radius', () => {
    const a = computeWeight(9, 30, RADIAL_CONFIG)
    const b = computeWeight(3, 30, RADIAL_CONFIG)
    expect(a).toBeGreaterThan(b)
  })

  it('layout orders heavier nodes closer to center', () => {
    const tasks = [
      { id: 'A', p: 9, t: 60 },
      { id: 'B', p: 5, t: 120 },
      { id: 'C', p: 2, t: 15 },
      { id: 'D', p: 8, t: 10 },
    ]
    const { nodes } = layoutRadial(tasks, RADIAL_CONFIG)
    // Build map id->r
    const rMap = Object.fromEntries(nodes.map((n) => [n.id, Math.sqrt(n.x * n.x + n.y * n.y)]))
    expect(rMap.A).toBeLessThan(rMap.C)
    expect(rMap.D).toBeLessThan(rMap.B)
  })
})
