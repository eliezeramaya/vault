// Radial Matrix Layout – Phase 1
// Fase 1: implementación base sin blending ni relajación final.
// Roadmap siguiente: blending multiplicativo, relax force-directed, animaciones y KPIs extendidos.

/** @typedef {Object} TaskNode
 * @property {string} id
 * @property {number} p  Prioridad 1..10
 * @property {number} t  Tiempo estimado en minutos >=0
 * @property {number} [importance]  (Opcional) si ya existía modelo original
 * @property {number} [urgency]
 */

export const RADIAL_CONFIG = {
  alpha: 0.7, // peso prioridad
  beta: 0.3, // peso tiempo
  Tmax: 480, // techo normalización log
  eps: 1e-3,
  rMin: 40,
  rMax: 360,
  gamma: 0.6, // expo escala visual
  sMin: 0.85,
  sMax: 1.45,
  spiral: { dr: 8, dTheta: 0.12 },
  maxIter: 30,
}

/** Normaliza prioridad y tiempo y calcula peso aditivo.
 * @param {number} p
 * @param {number} t
 * @param {typeof RADIAL_CONFIG} cfg
 */
export function computeWeight(p, t, cfg = RADIAL_CONFIG) {
  const pc = Math.min(Math.max(p, 1), 10)
  const pHat = pc / 10
  const tHat = Math.log(1 + Math.max(0, t)) / Math.log(1 + cfg.Tmax)
  const w = cfg.alpha * pHat + cfg.beta * tHat
  return Math.min(Math.max(w, 0), 1)
}

/** Escala visual (font/area) */
export function computeScale(w, cfg = RADIAL_CONFIG) {
  return cfg.sMin + Math.pow(w, cfg.gamma) * (cfg.sMax - cfg.sMin)
}

/** Asigna intervalo angular por cuadrante a partir de importancia/urgencia derivadas de prioridad.
 * Para Fase 1 asumimos que p alto sugiere Importante.
 * Podemos usar heurística: importance = p>=6, urgency = p>=6 para prototipo.
 */
function quadrantFor(p) {
  const important = p >= 6
  const urgent = p >= 6 // placeholder (luego separar atributo real)
  if (important && urgent) return 1
  if (important && !urgent) return 2
  if (!important && !urgent) return 3
  return 4
}

// Rangos en grados (continuos, Q1 cruzando 0° se maneja como [-45,45))
const QUADRANT_RANGES = {
  1: { start: -45, span: 90 }, // [-45,45)
  2: { start: 45, span: 90 }, // [45,135)
  3: { start: 135, span: 90 }, // [135,225)
  4: { start: 225, span: 90 }, // [225,315)
}

function deg2rad(d) {
  return (d * Math.PI) / 180
}

/**
 * Asigna ángulos base dentro del intervalo de cada cuadrante ordenando nodos por peso.
 * @param {Array<{id:string,p:number,t:number,w:number}>} nodes
 */
export function assignAngles(nodes) {
  const groups = { 1: [], 2: [], 3: [], 4: [] }
  for (const n of nodes) groups[quadrantFor(n.p)].push(n)
  for (const q of [1, 2, 3, 4]) {
    const arr = groups[q]
    arr.sort((a, b) => b.w - a.w) // pesos altos centrados
    const { start, span } = QUADRANT_RANGES[q]
    const n = arr.length
    arr.forEach((node, i) => {
      if (!n) return
      const thetaDeg = start + ((i + 0.5) / n) * span
      node.theta = thetaDeg < 0 ? deg2rad(thetaDeg + 360) : deg2rad(thetaDeg)
    })
  }
  return nodes
}

/**
 * Coloca nodos en plano usando espiral anti-colisión simple.
 * @param {Array<{id:string,p:number,t:number}>} rawNodes
 * @param {typeof RADIAL_CONFIG} cfg
 * @returns {{nodes: Array, metrics: {overlapPairs:number, overflowCount:number, avgIterations:number}}}
 */
export function layoutRadial(rawNodes, cfg = RADIAL_CONFIG) {
  const nodes = rawNodes.map((n) => ({ ...n }))
  for (const n of nodes) {
    n.w = computeWeight(n.p, n.t, cfg)
    n.scale = computeScale(n.w, cfg)
    n.rBase = cfg.rMin + (1 - n.w) * (cfg.rMax - cfg.rMin)
  }
  assignAngles(nodes)
  // Orden global por peso desc para colocar primero los grandes
  const ordered = nodes.slice().sort((a, b) => b.w - a.w || a.theta - b.theta)
  const placed = []
  let totalIter = 0

  function collides(x, y, radius, nodeList) {
    for (const o of nodeList) {
      const dx = x - o.x
      const dy = y - o.y
      const dist2 = dx * dx + dy * dy
      const rr = radius + o.radius
      if (dist2 < rr * rr) return true
    }
    return false
  }

  for (const n of ordered) {
    const radiusApprox = 20 * n.scale // heurística inicial
    n.radius = radiusApprox
    let r = n.rBase
    let theta = n.theta
    let iter = 0
    while (iter < cfg.maxIter) {
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      if (!collides(x, y, radiusApprox, placed)) {
        n.x = x
        n.y = y
        break
      }
      iter++
      r += cfg.spiral.dr
      theta += cfg.spiral.dTheta
    }
    if (iter === cfg.maxIter) n.layoutOverflow = true
    totalIter += iter
    placed.push(n)
  }

  // Métricas simples de overlap residual (debería ser 0 post-estrategia tentativa)
  let overlapPairs = 0
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i],
        b = placed[j]
      const dx = a.x - b.x,
        dy = a.y - b.y
      const dist2 = dx * dx + dy * dy
      const rr = a.radius + b.radius
      if (dist2 < rr * rr) overlapPairs++
    }
  }

  return {
    nodes: placed,
    metrics: {
      overlapPairs,
      overflowCount: placed.filter((n) => n.layoutOverflow).length,
      avgIterations: placed.length ? totalIter / placed.length : 0,
    },
  }
}

/** Hook React básico (sin animación) */
import { useMemo } from 'react'
export function useRadialMatrixLayout(tasks, configOverrides = {}) {
  return useMemo(() => {
    const cfg = { ...RADIAL_CONFIG, ...configOverrides }
    return layoutRadial(tasks, cfg)
  }, [tasks, configOverrides])
}
