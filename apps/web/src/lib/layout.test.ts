import { describe, it, expect } from 'vitest'
import { resolveCollisions, DEFAULT_COLLISION_CFG, type PolarNode } from './layout'

function makeNode(id: string, r: number, theta: number): PolarNode {
  return { id, weight: 0.5, quadrant: 1, r, theta, boxScale: 1, width: 100, height: 60 }
}

describe('resolveCollisions', () => {
  it('separates overlapping nodes', () => {
    const nodes: PolarNode[] = [
      makeNode('a', 80, 10),
      makeNode('b', 82, 12), // intentionally close
      makeNode('c', 78, 8),
    ]
    const { nodes: placed } = resolveCollisions(nodes, { ...DEFAULT_COLLISION_CFG, maxIter: 50 })
    // Check pairwise not overlapping heuristically
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i],
          B = placed[j]
        const ax = A.r * Math.cos((A.theta * Math.PI) / 180)
        const ay = A.r * Math.sin((A.theta * Math.PI) / 180)
        const bx = B.r * Math.cos((B.theta * Math.PI) / 180)
        const by = B.r * Math.sin((B.theta * Math.PI) / 180)
        const dx = ax - bx,
          dy = ay - by
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ar = (Math.max(A.width, A.height) * A.boxScale) / 2
        const br = (Math.max(B.width, B.height) * B.boxScale) / 2
        expect(dist).toBeGreaterThanOrEqual(ar + br - 0.5) // allow tiny tolerance
      }
    }
  })
})
