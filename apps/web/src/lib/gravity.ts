// gravity.ts – TypeScript utilities for gravity matrix
// Implements normalization of priority (1..10) and time (minutes), weight computation and radius/scale mapping.

export interface GravityConfig {
  alpha: number // weight of priority
  beta: number // weight of time
  Tmax: number // normalization cap for time (minutes)
  rMin: number
  rMax: number
  gamma: number // exponent for scale curve
  sMin: number
  sMax: number
}

export const GRAVITY_TS_CONFIG: GravityConfig = {
  alpha: 0.7,
  beta: 0.3,
  Tmax: 480,
  rMin: 40,
  rMax: 360,
  gamma: 0.6,
  sMin: 0.85,
  sMax: 1.45,
}

export function normalizePriority(p: number): number {
  const clamped = Math.min(Math.max(p ?? 5, 1), 10)
  return clamped / 10
}

export function normalizeTime(t: number, Tmax = GRAVITY_TS_CONFIG.Tmax): number {
  const safe = Math.max(0, t || 0)
  return Math.log(1 + safe) / Math.log(1 + Tmax)
}

export function computeWeight(
  priority: number,
  timeMinutes: number,
  cfg: GravityConfig = GRAVITY_TS_CONFIG
): number {
  const pHat = normalizePriority(priority)
  const tHat = normalizeTime(timeMinutes, cfg.Tmax)
  const w = cfg.alpha * pHat + cfg.beta * tHat
  return Math.min(Math.max(w, 0), 1)
}

export function computeRadius(w: number, cfg: GravityConfig = GRAVITY_TS_CONFIG): number {
  return cfg.rMin + (1 - w) * (cfg.rMax - cfg.rMin)
}

export function computeBoxScale(w: number, cfg: GravityConfig = GRAVITY_TS_CONFIG): number {
  return cfg.sMin + Math.pow(w, cfg.gamma) * (cfg.sMax - cfg.sMin)
}

export interface AngleTask {
  id: string
  weight: number
  quadrant: 1 | 2 | 3 | 4
}

interface Range {
  start: number
  span: number
}
const QUADRANT_RANGES: Record<1 | 2 | 3 | 4, Range> = {
  1: { start: -45, span: 90 }, // maps to [-45,45)
  2: { start: 45, span: 90 }, // [45,135)
  3: { start: 135, span: 90 }, // [135,225)
  4: { start: 225, span: 90 }, // [225,315)
}

// assignAnglesSorted: tasks grouped by quadrant, sorted by weight desc, equispaced.
export function assignAnglesSorted(tasks: AngleTask[]): Map<string, number> {
  const byQ: Record<1 | 2 | 3 | 4, AngleTask[]> = { 1: [], 2: [], 3: [], 4: [] }
  for (const t of tasks) byQ[t.quadrant].push(t)
  const res = new Map<string, number>()
  for (const q of [1, 2, 3, 4] as const) {
    const arr = byQ[q].sort((a, b) => b.weight - a.weight)
    const { start, span } = QUADRANT_RANGES[q]
    const n = arr.length
    if (!n) continue
    arr.forEach((t, i) => {
      let deg = start + ((i + 0.5) / n) * span
      if (deg < 0) deg += 360
      res.set(t.id, deg)
    })
  }
  return res
}
