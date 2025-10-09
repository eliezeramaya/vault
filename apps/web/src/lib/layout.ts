// layout.ts – collision resolution for radial/gravity layout
// resolveCollisions adjusts (r, θ) along a gentle spiral while keeping θ within quadrant range.

export interface PolarNode {
  id: string
  weight: number
  quadrant: 1 | 2 | 3 | 4
  r: number
  theta: number // degrees (0..360)
  boxScale: number
  width: number // base box width (before scale)
  height: number // base box height (before scale)
}

export interface CollisionConfig {
  maxIter: number
  dr: number // radial increment per attempt
  dTheta: number // angular perturbation per attempt (deg)
  quadrantRanges: Record<1 | 2 | 3 | 4, { start: number; span: number }>
}

export const DEFAULT_COLLISION_CFG: CollisionConfig = {
  maxIter: 30,
  dr: 8,
  dTheta: 6,
  quadrantRanges: {
    1: { start: -45, span: 90 },
    2: { start: 45, span: 90 },
    3: { start: 135, span: 90 },
    4: { start: 225, span: 90 },
  },
}

function inRange(theta: number, q: 1 | 2 | 3 | 4, ranges: CollisionConfig['quadrantRanges']) {
  // theta in 0..360, Q1 spans [-45,45) -> treat as [315,360) ∪ [0,45)
  const { start, span } = ranges[q]
  if (q === 1) {
    const norm = (theta + 360) % 360
    return (norm >= 315 && norm < 360) || (norm >= 0 && norm < 45)
  }
  let s = start
  if (s < 0) s += 360
  const e = s + span
  const norm = (theta + 360) % 360
  return norm >= s && norm < e
}

function clampToQuadrant(
  theta: number,
  q: 1 | 2 | 3 | 4,
  ranges: CollisionConfig['quadrantRanges']
): number {
  if (inRange(theta, q, ranges)) return (theta + 360) % 360
  if (q === 1) {
    // choose closer boundary among 315 or 45
    const norm = (theta + 360) % 360
    const dist315 = Math.min(Math.abs(norm - 315), Math.abs(norm + 360 - 315))
    const dist45 = Math.abs(norm - 45)
    return dist315 < dist45 ? 315 : 45 - 0.001
  }
  let { start, span } = ranges[q]
  if (start < 0) start += 360
  const end = start + span - 0.001
  let norm = (theta + 360) % 360
  if (norm < start) norm = start
  else if (norm > end) norm = end
  return norm
}

function collides(a: PolarNode, b: PolarNode): boolean {
  const ax = a.r * Math.cos((a.theta * Math.PI) / 180)
  const ay = a.r * Math.sin((a.theta * Math.PI) / 180)
  const bx = b.r * Math.cos((b.theta * Math.PI) / 180)
  const by = b.r * Math.sin((b.theta * Math.PI) / 180)
  const dx = ax - bx
  const dy = ay - by
  const dist2 = dx * dx + dy * dy
  const ar = (Math.max(a.width, a.height) * a.boxScale) / 2
  const br = (Math.max(b.width, b.height) * b.boxScale) / 2
  const rr = ar + br
  return dist2 < rr * rr
}

export interface ResolveResult {
  nodes: PolarNode[]
  overflow: string[]
}

export function resolveCollisions(
  nodes: PolarNode[],
  cfg: CollisionConfig = DEFAULT_COLLISION_CFG
): ResolveResult {
  const result: PolarNode[] = []
  const overflow: string[] = []
  for (const n of nodes) {
    let iter = 0
    while (iter < cfg.maxIter) {
      // test against already placed
      let has = false
      for (const p of result) {
        if (collides(n, p)) {
          has = true
          break
        }
      }
      if (!has) {
        result.push(n)
        break
      }
      // adjust
      n.r += cfg.dr
      n.theta = clampToQuadrant(n.theta + cfg.dTheta, n.quadrant, cfg.quadrantRanges)
      iter++
    }
    if (iter === cfg.maxIter) overflow.push(n.id)
  }
  return { nodes: result, overflow }
}
