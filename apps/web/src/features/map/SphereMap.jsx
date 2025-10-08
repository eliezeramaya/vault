import React, { useEffect, useRef, useState } from 'react'
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  Color,
  Vector3,
  Vector2,
  Raycaster,
  CanvasTexture,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
  WireframeGeometry,
  SphereGeometry,
  LineBasicMaterial,
  LineSegments,
  AdditiveBlending,
  NormalBlending,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

// SphereMap optimized: shared geometries/materials, event-driven render, simple LOD, throttled picking

function useCssVar(name, fallback) {
  const [v, setV] = useState(fallback)
  useEffect(() => {
    const read = () => {
      try {
        const css = getComputedStyle(document.documentElement)
        const s = (css.getPropertyValue(name) || '').trim()
        setV(s || fallback)
      } catch {
        setV(fallback)
      }
    }
    read()
    const obs = new MutationObserver(() => read())
    try {
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    } catch {}
    return () => {
      try {
        obs.disconnect()
      } catch {}
    }
  }, [name, fallback])
  return v
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStringToSeed(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h << 5) + h + str.charCodeAt(i)
  return h >>> 0
}
function randomPointOnSphere(r, rnd) {
  const u = rnd(),
    v = rnd()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const s = Math.sin(phi)
  return new Vector3(r * s * Math.cos(theta), r * s * Math.sin(theta), r * Math.cos(phi))
}
const hexToInt = hex => parseInt(hex.replace('#', ''), 16)

export default function SphereMap({ showPanel = true }) {
  const mountRef = useRef(null)
  const tooltipRef = useRef(null)
  const pingRef = useRef(null)

  const bgCol = useCssVar('--map-bg', '#0a0a15')
  const gridCol = useCssVar('--grid-medium', '#2a3a7a')

  const [ui, setUI] = useState({
    seed: '',
    r1: 1.0,
    n1: 200,
    r2: 1.6,
    n2: 350,
    r3: 2.3,
    n3: 500,
    k: 3,
    p: 0.05,
    aa: true,
    prec: 3,
    size1: 1.6,
    size2: 1.4,
    size3: 1.2,
    brightness: 0.9,
    additive: false,
    color1: '#ffffff',
    color2: '#bfdcff',
    color3: '#d7f7ff',
    edgeWidth: 1.5,
    edgeColor: '#6ea2ff',
  })

  const stateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    pointsLayers: [],
    wireframes: [],
    edgesObj: null,
    nodes: [],
    edges: [],
    starTex: null,
    raycaster: new Raycaster(),
    mouse: new Vector2(),
    seed: null,
  })

  function getStarTexture() {
    const s = stateRef.current
    if (s.starTex) return s.starTex
    const size = 96
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new CanvasTexture(c)
    tex.anisotropy = 8
    tex.needsUpdate = true
    s.starTex = tex
    return tex
  }

  function generateNodes(seedStr) {
    const s = stateRef.current
    const seedNum = seedStr ? hashStringToSeed(seedStr) : (Math.random() * 1e9) | 0
    const rnd = mulberry32(seedNum)
    s.nodes = []
    const per = [
      [1, ui.r1, ui.n1],
      [2, ui.r2, ui.n2],
      [3, ui.r3, ui.n3],
    ]
    for (const [layer, R, N] of per) {
      for (let i = 0; i < N; i++) {
        const pos = randomPointOnSphere(R, rnd)
        const id = `L${layer}-${String(i + 1).padStart(4, '0')}`
        s.nodes.push({ id, layer, position: [pos.x, pos.y, pos.z] })
      }
    }
    s.seed = seedNum
    return seedNum
  }

  const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  function buildEdges() {
    const s = stateRef.current
    s.edges = []
    const edgeSet = new Set()
    const k = Math.max(0, parseInt(ui.k))
    const p = Math.max(0, Math.min(1, Number(ui.p)))
    const rnd = mulberry32(((s.seed >>> 0) + 0x9e3779b9) >>> 0)
    const layerMap = { 1: [], 2: [], 3: [] }
    for (const n of s.nodes) layerMap[n.layer].push(n)
    for (const layer of [1, 2, 3]) {
      const arr = layerMap[layer]
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i]
        const dists = []
        for (let j = 0; j < arr.length; j++)
          if (j !== i) {
            const b = arr[j]
            const dx = a.position[0] - b.position[0],
              dy = a.position[1] - b.position[1],
              dz = a.position[2] - b.position[2]
            dists.push([j, dx * dx + dy * dy + dz * dz])
          }
        dists.sort((u, v) => u[1] - v[1])
        for (let m = 0; m < Math.min(k, dists.length); m++) {
          const j = dists[m][0]
          const b = arr[j]
          const key = edgeKey(a.id, b.id)
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            s.edges.push({ source: a.id, target: b.id })
          }
        }
      }
    }
    function maybeConnectBetween(a, bArr) {
      if (rnd() < p && bArr.length) {
        let best = null,
          bestDot = -Infinity
        const va = new Vector3(...a.position).normalize()
        for (const b of bArr) {
          const vb = new Vector3(...b.position).normalize()
          const dot = va.dot(vb)
          if (dot > bestDot) {
            bestDot = dot
            best = b
          }
        }
        if (best) {
          const key = edgeKey(a.id, best.id)
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            s.edges.push({ source: a.id, target: best.id })
          }
        }
      }
    }
    for (const a of layerMap[1]) maybeConnectBetween(a, layerMap[2])
    for (const a of layerMap[2]) {
      maybeConnectBetween(a, layerMap[1])
      maybeConnectBetween(a, layerMap[3])
    }
    for (const a of layerMap[3]) maybeConnectBetween(a, layerMap[2])
  }

  function clearScene() {
    const s = stateRef.current
    for (const p of s.pointsLayers) {
      s.scene.remove(p)
      p.geometry?.dispose?.()
      p.material?.dispose?.()
    }
    s.pointsLayers = []
    if (s.edgesObj) {
      s.edgesObj.geometry?.dispose?.()
      s.edgesObj.material?.dispose?.()
      s.scene.remove(s.edgesObj)
      s.edgesObj = null
    }
    for (const w of s.wireframes) {
      s.scene.remove(w)
      w.geometry?.dispose?.()
      w.material?.dispose?.()
    }
    s.wireframes = []
  }

  function buildGeometries() {
    const s = stateRef.current
    clearScene()
    const tex = getStarTexture()
    const sizes = [ui.size1, ui.size2, ui.size3]
    for (const layer of [1, 2, 3]) {
      const arr = s.nodes.filter(n => n.layer === layer)
      const geo = new BufferGeometry()
      const positions = new Float32Array(arr.length * 3)
      for (let i = 0; i < arr.length; i++) positions.set(arr[i].position, i * 3)
      geo.setAttribute('position', new BufferAttribute(positions, 3))
      try {
        geo.setDrawRange(0, arr.length)
      } catch {}
      const opacity = Math.min(1, Math.max(0.05, ui.brightness))
      const mat = new PointsMaterial({
        size: sizes[layer - 1],
        sizeAttenuation: true,
        map: tex,
        alphaMap: tex,
        color: hexToInt([ui.color1, ui.color2, ui.color3][layer - 1]),
        transparent: true,
        opacity,
        depthTest: true,
        depthWrite: false,
        blending: ui.additive ? AdditiveBlending : NormalBlending,
      })
      const pts = new Points(geo, mat)
      pts.userData = { layer }
      s.scene.add(pts)
      s.pointsLayers.push(pts)
    }
    for (const R of [ui.r1, ui.r2, ui.r3]) {
      const g = new WireframeGeometry(new SphereGeometry(R, 24, 16))
      const w = new LineSegments(
        g,
        new LineBasicMaterial({ color: new Color(gridCol), opacity: 0.22, transparent: true }),
      )
      s.scene.add(w)
      s.wireframes.push(w)
    }
    if (stateRef.current.edges.length) {
      const pos = new Float32Array(stateRef.current.edges.length * 2 * 3)
      let ii = 0
      const byId = new Map(stateRef.current.nodes.map(n => [n.id, n]))
      for (const e of stateRef.current.edges) {
        const a = byId.get(e.source),
          b = byId.get(e.target)
        if (!a || !b) continue
        pos[ii++] = a.position[0]
        pos[ii++] = a.position[1]
        pos[ii++] = a.position[2]
        pos[ii++] = b.position[0]
        pos[ii++] = b.position[1]
        pos[ii++] = b.position[2]
      }
      const geom = new LineSegmentsGeometry()
      geom.setPositions(pos.subarray(0, ii))
      const mat = new LineMaterial({
        color: hexToInt(ui.edgeColor),
        linewidth: ui.edgeWidth / Math.max(1, window.devicePixelRatio),
        transparent: true,
        opacity: 0.28,
      })
      const { renderer } = stateRef.current
      try {
        mat.resolution.set(
          renderer.domElement.width / (renderer.getPixelRatio?.() || 1),
          renderer.domElement.height / (renderer.getPixelRatio?.() || 1),
        )
      } catch {}
      const lines = new LineSegments2(geom, mat)
      stateRef.current.scene.add(lines)
      stateRef.current.edgesObj = lines
    }
  }

  function showTooltip(ev, node) {
    const el = tooltipRef.current
    if (!el) return
    const prec = Math.max(0, parseInt(ui.prec))
    const fmt = v => Number(v).toFixed(prec)
    el.innerHTML = `<div class="id" style="font-weight:700;color:#9ccaff">${node.id}</div><div>layer: ${node.layer}</div><div>pos: [${node.position.map(v => fmt(v)).join(', ')}]</div>`
    el.style.left = `${ev.clientX}px`
    el.style.top = `${ev.clientY}px`
    el.style.display = 'block'
  }
  function hideTooltip() {
    const el = tooltipRef.current
    if (el) el.style.display = 'none'
  }
  function pingAt(x, y) {
    const el = pingRef.current
    if (!el) return
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    el.style.opacity = '1'
    el.animate(
      [
        { transform: 'translate(-8px,-8px) scale(0.4)', opacity: 1 },
        { transform: 'translate(-8px,-8px) scale(1.8)', opacity: 0 },
      ],
      { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
    setTimeout(() => (el.style.opacity = '0'), 620)
  }

  function attachScene(width, height) {
    const mount = mountRef.current
    const s = stateRef.current
    if (s.renderer?.domElement?.parentNode) {
      try {
        s.renderer.domElement.parentNode.removeChild(s.renderer.domElement)
      } catch {}
    }
    s.renderer = new WebGLRenderer({ antialias: ui.aa, powerPreference: 'high-performance' })
    s.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    s.renderer.setSize(width, height)
    mount.appendChild(s.renderer.domElement)
    s.scene = new Scene()
    try {
      s.scene.background = new Color(bgCol)
    } catch {
      s.scene.background = new Color('#0a0a15')
    }
    s.camera = new PerspectiveCamera(55, width / height, 0.01, 200)
    s.camera.position.set(0, 0, Math.max(ui.r3 * 3.2, 8))
    s.scene.add(new HemisphereLight(0x8899ff, 0x080b14, 0.18))
    const dir = new DirectionalLight(0xffffff, 0.6)
    dir.position.set(5, 6, 8)
    s.scene.add(dir)
    s.controls = new OrbitControls(s.camera, s.renderer.domElement)
    s.controls.enableDamping = true
    s.controls.dampingFactor = 0.06
    s.controls.minDistance = ui.r1 * 0.6
    s.controls.maxDistance = ui.r3 * 6.0
  }

  function intersectNodes(ev) {
    const s = stateRef.current
    const rect = s.renderer.domElement.getBoundingClientRect()
    s.mouse.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    )
    s.raycaster.params.Points = { threshold: 0.12 }
    s.raycaster.setFromCamera(s.mouse, s.camera)
    let hit = null,
      hitDist = Infinity,
      hitInfo = null
    for (const pts of s.pointsLayers) {
      const isects = s.raycaster.intersectObject(pts, false)
      if (isects.length) {
        const it = isects[0]
        if (it.distance < hitDist) {
          hit = pts
          hitDist = it.distance
          hitInfo = it
        }
      }
    }
    if (!hit) return null
    const layer = hit.userData.layer
    const arr = stateRef.current.nodes.filter(n => n.layer === layer)
    const index = hitInfo.index
    const node = arr[index]
    return { node }
  }

  function regenerate() {
    const s = stateRef.current
    const seedNum = generateNodes(ui.seed.trim())
    buildEdges()
    buildGeometries()
    s.controls.minDistance = ui.r1 * 0.6
    s.controls.maxDistance = ui.r3 * 6.0
    s.camera.position.set(0, 0, Math.max(ui.r3 * 3.2, 8))
    return seedNum
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const width = mount.clientWidth || mount.offsetWidth || 800
    const height = mount.clientHeight || mount.offsetHeight || 600
    attachScene(width, height)
    generateNodes(ui.seed.trim())
    buildEdges()
    buildGeometries()

    const s = stateRef.current
    let raf = 0
    let animating = false

    const applyLOD = () => {
      const dist = Math.hypot(s.camera.position.x, s.camera.position.y, s.camera.position.z)
      const nearT = ui.r2 * 1.4
      const midT = ui.r3 * 2.2
      for (const pts of s.pointsLayers) {
        const total = pts.geometry?.attributes?.position?.count || 0
        let keep = total
        if (dist >= midT) keep = Math.max(1, Math.floor(total * 0.25))
        else if (dist >= nearT) keep = Math.max(1, Math.floor(total * 0.5))
        try {
          pts.geometry.setDrawRange(0, keep)
        } catch {}
      }
    }
    const renderFrame = () => {
      applyLOD()
      try {
        s.renderer.render(s.scene, s.camera)
      } catch {}
    }
    const step = () => {
      s.controls?.update?.()
      renderFrame()
      if (animating) raf = requestAnimationFrame(step)
    }

    const onControlsStart = () => {
      if (!animating) {
        animating = true
        raf = requestAnimationFrame(step)
      }
    }
    const onControlsEnd = () => {
      animating = false
    }
    const onControlsChange = () => {
      renderFrame()
    }
    try {
      s.controls.addEventListener('start', onControlsStart)
      s.controls.addEventListener('end', onControlsEnd)
      s.controls.addEventListener('change', onControlsChange)
    } catch {}

    const onResize = () => {
      const w = mount.clientWidth,
        h = mount.clientHeight
      s.camera.aspect = w / h
      s.camera.updateProjectionMatrix()
      s.renderer.setSize(w, h)
      if (s.edgesObj?.material?.resolution) {
        try {
          s.edgesObj.material.resolution.set(
            s.renderer.domElement.width / (s.renderer.getPixelRatio?.() || 1),
            s.renderer.domElement.height / (s.renderer.getPixelRatio?.() || 1),
          )
        } catch {}
      }
      renderFrame()
    }
    window.addEventListener('resize', onResize)

    let lastPickTs = 0
    const onPointerMove = ev => {
      const now = performance.now()
      if (now - lastPickTs < 50) return
      lastPickTs = now
      const pick = intersectNodes(ev)
      if (pick) showTooltip(ev, pick.node)
      else hideTooltip()
    }
    const onClick = ev => {
      const pick = intersectNodes(ev)
      if (!pick) return
      pingAt(ev.clientX, ev.clientY)
    }
    s.renderer.domElement.addEventListener('pointermove', onPointerMove)
    s.renderer.domElement.addEventListener('click', onClick)

    const onKey = e => {
      const key = (e?.key || '').toString()
      if (!key) return
      if (['1', '2', '3'].includes(key)) {
        const idx = Number(key) - 1
        const obj = s.pointsLayers[idx]
        if (obj) obj.visible = !obj.visible
      } else if (key.toLowerCase() === 'g') {
        if (s.edgesObj) s.edgesObj.visible = !s.edgesObj.visible
      } else if (key.toLowerCase() === 'r') {
        regenerate()
        renderFrame()
      }
    }
    window.addEventListener('keydown', onKey)

    // initial render
    renderFrame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      try {
        s.controls.removeEventListener('start', onControlsStart)
        s.controls.removeEventListener('end', onControlsEnd)
        s.controls.removeEventListener('change', onControlsChange)
      } catch {}
      try {
        s.renderer.domElement.removeEventListener('pointermove', onPointerMove)
        s.renderer.domElement.removeEventListener('click', onClick)
      } catch {}
      clearScene()
      s.pointsLayers = []
      s.edges = []
      s.nodes = []
      try {
        s.renderer.dispose()
      } catch {}
      if (s.scene) {
        s.scene.traverse(obj => {
          obj.geometry?.dispose?.()
          obj.material?.dispose?.()
        })
      }
      if (mount && mount.firstChild) mount.removeChild(mount.firstChild)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stateRef.current.scene) {
      buildGeometries()
    }
  }, [
    ui.size1,
    ui.size2,
    ui.size3,
    ui.brightness,
    ui.additive,
    ui.color1,
    ui.color2,
    ui.color3,
    ui.edgeWidth,
    ui.edgeColor,
    gridCol,
  ])

  const panelStyle = {
    position: 'absolute',
    top: 'max(12px, env(safe-area-inset-top))',
    right: 'max(12px, env(safe-area-inset-right))',
    width: 360,
    maxHeight: 'calc(100% - 24px)',
    overflow: 'auto',
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: 14,
    padding: '12px 12px 10px',
    color: 'var(--text)',
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 6,
  }
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 140px',
    gap: 8,
    alignItems: 'center',
    margin: '6px 0',
  }
  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    background: 'var(--input-bg, #0d1320)',
    color: 'var(--text)',
    border: '1px solid var(--surface-border)',
    borderRadius: 8,
  }
  const btnStyle = {
    marginTop: 8,
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-bg, linear-gradient(180deg,#182543,#101a33))',
    color: 'var(--text)',
    cursor: 'pointer',
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      {showPanel && (
        <div style={panelStyle}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, letterSpacing: 0.3 }}>
            Esfera 3D · Estrellas + Wire + Líneas
          </h2>
          <div style={rowStyle}>
            <label htmlFor="sm-seed">Seed</label>
            <input
              id="sm-seed"
              style={inputStyle}
              value={ui.seed}
              onChange={e => setUI(v => ({ ...v, seed: e.target.value }))}
              placeholder="auto"
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-r1">R1 / N1</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                id="sm-r1"
                style={inputStyle}
                type="number"
                step="0.1"
                value={ui.r1}
                onChange={e => setUI(v => ({ ...v, r1: Number(e.target.value) }))}
              />
              <input
                id="sm-n1"
                style={inputStyle}
                type="number"
                value={ui.n1}
                onChange={e => setUI(v => ({ ...v, n1: parseInt(e.target.value || '0') }))}
              />
            </div>
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-r2">R2 / N2</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                id="sm-r2"
                style={inputStyle}
                type="number"
                step="0.1"
                value={ui.r2}
                onChange={e => setUI(v => ({ ...v, r2: Number(e.target.value) }))}
              />
              <input
                id="sm-n2"
                style={inputStyle}
                type="number"
                value={ui.n2}
                onChange={e => setUI(v => ({ ...v, n2: parseInt(e.target.value || '0') }))}
              />
            </div>
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-r3">R3 / N3</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                id="sm-r3"
                style={inputStyle}
                type="number"
                step="0.1"
                value={ui.r3}
                onChange={e => setUI(v => ({ ...v, r3: Number(e.target.value) }))}
              />
              <input
                id="sm-n3"
                style={inputStyle}
                type="number"
                value={ui.n3}
                onChange={e => setUI(v => ({ ...v, n3: parseInt(e.target.value || '0') }))}
              />
            </div>
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-k">k vecinos</label>
            <input
              id="sm-k"
              style={inputStyle}
              type="number"
              value={ui.k}
              onChange={e => setUI(v => ({ ...v, k: parseInt(e.target.value || '0') }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-p">p inter-capa</label>
            <input
              id="sm-p"
              style={inputStyle}
              type="number"
              step="0.01"
              value={ui.p}
              onChange={e => setUI(v => ({ ...v, p: Number(e.target.value) }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-aa">Antialias</label>
            <input
              id="sm-aa"
              type="checkbox"
              checked={ui.aa}
              onChange={e => setUI(v => ({ ...v, aa: !!e.target.checked }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-prec">Precisión</label>
            <input
              id="sm-prec"
              style={inputStyle}
              type="number"
              step="1"
              min="0"
              value={ui.prec}
              onChange={e => setUI(v => ({ ...v, prec: parseInt(e.target.value || '0') }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-size1">Tamaño L1</label>
            <input
              id="sm-size1"
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={ui.size1}
              onChange={e => setUI(v => ({ ...v, size1: Number(e.target.value) }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-size2">Tamaño L2</label>
            <input
              id="sm-size2"
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={ui.size2}
              onChange={e => setUI(v => ({ ...v, size2: Number(e.target.value) }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-size3">Tamaño L3</label>
            <input
              id="sm-size3"
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={ui.size3}
              onChange={e => setUI(v => ({ ...v, size3: Number(e.target.value) }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-brightness">Brillo global</label>
            <input
              id="sm-brightness"
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={ui.brightness}
              onChange={e => setUI(v => ({ ...v, brightness: Number(e.target.value) }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-additive">Modo aditivo</label>
            <input
              id="sm-additive"
              type="checkbox"
              checked={ui.additive}
              onChange={e => setUI(v => ({ ...v, additive: !!e.target.checked }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-color1">Color L1</label>
            <input
              id="sm-color1"
              type="color"
              value={ui.color1}
              onChange={e => setUI(v => ({ ...v, color1: e.target.value }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-color2">Color L2</label>
            <input
              id="sm-color2"
              type="color"
              value={ui.color2}
              onChange={e => setUI(v => ({ ...v, color2: e.target.value }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-color3">Color L3</label>
            <input
              id="sm-color3"
              type="color"
              value={ui.color3}
              onChange={e => setUI(v => ({ ...v, color3: e.target.value }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-edgewidth">Grosor líneas</label>
            <input
              id="sm-edgewidth"
              type="range"
              min="0.5"
              max="6"
              step="0.1"
              value={ui.edgeWidth}
              onChange={e => setUI(v => ({ ...v, edgeWidth: Number(e.target.value) }))}
            />
          </div>
          <div style={rowStyle}>
            <label htmlFor="sm-edgecolor">Color aristas</label>
            <input
              id="sm-edgecolor"
              type="color"
              value={ui.edgeColor}
              onChange={e => setUI(v => ({ ...v, edgeColor: e.target.value }))}
            />
          </div>
          <button
            style={btnStyle}
            onClick={() => {
              regenerate()
            }}
          >
            Regenerar (R)
          </button>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>
            Teclas: 1/2/3 capas, G líneas, R resembrar.
          </div>
        </div>
      )}

      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          transform: 'translate(12px,12px)',
          minWidth: 140,
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 12,
          color: 'var(--text)',
          display: 'none',
          zIndex: 8,
        }}
      />
      <div
        ref={pingRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '2px solid #8dd3ff',
          opacity: 0,
          transform: 'translate(-8px,-8px)',
          boxShadow: '0 0 12px rgba(141,211,255,.8)',
          zIndex: 7,
        }}
      />
    </div>
  )
}
