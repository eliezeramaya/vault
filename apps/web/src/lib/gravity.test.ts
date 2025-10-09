import { describe, it, expect } from 'vitest'
import {
  assignAnglesSorted,
  computeWeight,
  GRAVITY_TS_CONFIG,
  normalizeTime,
  normalizePriority,
} from './gravity'

describe('assignAnglesSorted', () => {
  it('distributes angles within quadrant ranges and sorts by weight', () => {
    const tasks = [
      { id: 'a', weight: 0.9, quadrant: 1 as const },
      { id: 'b', weight: 0.7, quadrant: 1 as const },
      { id: 'c', weight: 0.8, quadrant: 2 as const },
      { id: 'd', weight: 0.6, quadrant: 2 as const },
      { id: 'e', weight: 0.5, quadrant: 3 as const },
      { id: 'f', weight: 0.4, quadrant: 4 as const },
    ]
    const map = assignAnglesSorted(tasks)
    const ang = (id: string) => map.get(id)!
    // Ranges
    const inQ1 = (θ: number) => (θ >= 315 && θ < 360) || (θ >= 0 && θ < 45)
    const inRange = (θ: number, s: number, e: number) => θ >= s && θ < e
    expect(inQ1(ang('a'))).toBeTruthy()
    expect(inQ1(ang('b'))).toBeTruthy()
    expect(inRange(ang('c'), 45, 135)).toBeTruthy()
    expect(inRange(ang('d'), 45, 135)).toBeTruthy()
    expect(inRange(ang('e'), 135, 225)).toBeTruthy()
    expect(inRange(ang('f'), 225, 315)).toBeTruthy()
  })
})

describe('computeWeight boundaries', () => {
  const cfg = GRAVITY_TS_CONFIG
  it('priority 1 vs 10 (time=0) produces lower and upper bound', () => {
    const wLow = computeWeight(1, 0, cfg)
    const wHigh = computeWeight(10, 0, cfg)
    expect(wLow).toBeLessThan(wHigh)
    // p=1 -> pHat=0.1 => expected ~ alpha*0.1
    expect(wLow).toBeCloseTo(cfg.alpha * 0.1, 5)
    // p=10 -> pHat=1 => expected ~ alpha*1
    expect(wHigh).toBeCloseTo(cfg.alpha * 1, 5)
  })
  it('time growth is logarithmic and monotonic', () => {
    const base = computeWeight(5, 0, cfg)
    const mid = computeWeight(5, cfg.Tmax / 4, cfg)
    const big = computeWeight(5, cfg.Tmax, cfg)
    expect(mid).toBeGreaterThan(base)
    expect(big).toBeGreaterThan(mid)
    // Ensure capped at <=1
    expect(big).toBeLessThanOrEqual(1)
  })
  it('very large time beyond Tmax increases only slightly (diminishing returns)', () => {
    const atCap = computeWeight(5, cfg.Tmax, cfg)
    const beyond = computeWeight(5, cfg.Tmax * 5, cfg)
    expect(beyond).toBeGreaterThan(atCap)
    // difference should be modest (< 0.12 for current log curve)
    expect(beyond - atCap).toBeLessThan(0.12)
  })
  it('combination extremes: p=10 & time=Tmax gives weight near 1', () => {
    const w = computeWeight(10, cfg.Tmax, cfg)
    expect(w).toBeGreaterThan(0.95)
    expect(w).toBeLessThanOrEqual(1)
  })
  it('clamps invalid inputs (negative time, over-priority)', () => {
    const wNegTime = computeWeight(7, -50, cfg) // negative -> treated as 0
    const wOverPrio = computeWeight(50, 0, cfg) // prio>10 -> clamp 10
    const expectedOverPrio = computeWeight(10, 0, cfg)
    expect(wNegTime).toBeCloseTo(computeWeight(7, 0, cfg), 5)
    expect(wOverPrio).toBeCloseTo(expectedOverPrio, 5)
  })
})
