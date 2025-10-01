import React, { useEffect, useMemo, useRef, useState } from 'react'

// Eisenhower Matrix with liquid-glass panel and a 72×72 = 5184 cell grid
export default function EisenhowerPanel(){
  // Canvas and chip sizing
  const CHIP_PX = 120 // fixed chip size in CSS pixels (pre-scale)
  const CANVAS_PX = 2400 // virtual canvas side length in CSS pixels (pre-scale)
  const COLS = 96
  const ROWS = 96
  const MIDC = COLS/2
  const MIDR = ROWS/2
  const MAX_TEXT = 140
  const [zoom, setZoom] = useState(1)
  const ZMIN = 0.10 // 10%
  const ZMAX = 2.00 // 200%
  const ZSTEP = 0.10 // 10% steps

  // No per-cell DOM for performance at 720×720; grid is drawn via CSS backgrounds

  // Notes state and persistence
  const LS_KEY = 'eh_notes_v1'
  const [notes, setNotes] = useState([]) // {id, col, row, text, priority}
  const [dragId, setDragId] = useState(null)
  const [composer, setComposer] = useState(null) // {id?, col, row, text}
  const [quickInput, setQuickInput] = useState('') // Bottom panel input
  const [pingIds, setPingIds] = useState(new Set())
  const [weightFor, setWeightFor] = useState(null) // note id or null
  const [lastWeightTrigger, setLastWeightTrigger] = useState(null) // HTMLElement to restore focus
  const gridRef = useRef(null)
  const stageWrapRef = useRef(null)
  const panRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef(null) // { x, y, startX, startY }
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const pointersRef = useRef(new Map()) // pointerId -> {x,y}
  const pinchRef = useRef(null) // { startDist, startZoom }

  useEffect(()=>{
    try{
      const raw = localStorage.getItem(LS_KEY)
      if (raw){
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          // Back-compat: ensure priority exists (default 5)
          setNotes(arr.map(n => ({ ...n, priority: (typeof n.priority === 'number' ? n.priority : 5) })))
        }
      }
    }catch{}
  },[])

  useEffect(()=>{
    try{ localStorage.setItem(LS_KEY, JSON.stringify(notes)) }catch{}
  },[notes])

  // Helper to trigger a brief visual ping on a note
  const triggerPing = (id)=>{
    setPingIds((prev)=>{
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setTimeout(()=>{
      setPingIds((prev)=>{
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 520)
  }

  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v))
  const clientToCell = (clientX, clientY)=>{
    const wrap = stageWrapRef.current
    if (!wrap) return { col:0, row:0 }
    const rect = wrap.getBoundingClientRect()
    // screen position relative to wrapper
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    // invert pan and zoom to get canvas coordinates (0..CANVAS_PX)
    const cx = (sx - pan.x) / (zoom || 1)
    const cy = (sy - pan.y) / (zoom || 1)
    const nx = clamp(cx / CANVAS_PX, 0, 0.999999)
    const ny = clamp(cy / CANVAS_PX, 0, 0.999999)
    const col = Math.floor(nx * COLS)
    const row = Math.floor(ny * ROWS)
    return { col, row }
  }

  const cellCenterPx = (col,row)=> ({
    left: ((col + 0.5) / COLS) * CANVAS_PX,
    top:  ((row + 0.5) / ROWS) * CANVAS_PX
  })

  const addNote = (col,row,text,idOverride)=>{
    const id = idOverride || Math.random().toString(36).slice(2,9)
    const t = (text||'Nota').slice(0, MAX_TEXT)
    // Enforce non-colliding placement
    let target = { col, row }
    if (collidesAt(col, row, id)){
      const near = nearestNonCollidingInQuadrant(col, row, id)
      if (near) target = near
      else {
        const q = getQuadrant(col,row)
        const slot = nextSlotForQuadrant(q)
        target = slot
      }
    }
    setNotes((arr)=> [...arr, { id, col: target.col, row: target.row, text: t, priority: 5 }])
  }

  const getQuadrant = (col,row)=>{
    const left = col < MIDC
    const top = row < MIDR
    if (top && left) return 'TL'
    if (top && !left) return 'TR'
    if (!top && left) return 'BL'
    return 'BR'
  }

  const isInQuadrant = (col,row,q)=>{
    if (q==='TL') return col>=0 && col<MIDC && row>=0 && row<MIDR
    if (q==='TR') return col>=MIDC && col<COLS && row>=0 && row<MIDR
    if (q==='BL') return col>=0 && col<MIDC && row>=MIDR && row<ROWS
    return col>=MIDC && col<COLS && row>=MIDR && row<ROWS // BR
  }

  const quadrantCenter = (q)=>{
    // Seed points adjacent to the central axes
    if (q==='TL') return { col: Math.floor(MIDC)-1, row: Math.floor(MIDR)-1 }
    if (q==='TR') return { col: Math.floor(MIDC),   row: Math.floor(MIDR)-1 }
    if (q==='BL') return { col: Math.floor(MIDC)-1, row: Math.floor(MIDR) }
    return { col: Math.floor(MIDC),   row: Math.floor(MIDR) } // BR
  }

  // Compute chip integer span in cell units (independent of zoom); no extra gap between chips (they can touch)
  const GAP_CELLS = 0 // empty grid cells between chip edges (0 = allow contact, no overlap)
  const chipSpanCells = ()=>{
    // Map fixed chip px to whole-cell span using virtual canvas size
    const w = Math.ceil((CHIP_PX / CANVAS_PX) * COLS)
    const h = Math.ceil((CHIP_PX / CANVAS_PX) * ROWS)
    return { w, h }
  }

  // Ensure a chip centered at (col,row) stays fully within its quadrant and does not overlap central axes
  const withinAxisBuffer = (col, row)=>{
    const { w, h } = chipSpanCells()
    const hw = Math.floor(w/2)
    const hh = Math.floor(h/2)
    // Global bounds
    if (col - hw < 0 || col + hw > COLS-1) return false
    if (row - hh < 0 || row + hh > ROWS-1) return false
    const q = getQuadrant(col, row)
    if (q === 'TL'){
      return (col + hw) <= (Math.floor(MIDC) - 1) && (row + hh) <= (Math.floor(MIDR) - 1)
    } else if (q === 'TR'){
      return (col - hw) >= Math.floor(MIDC) && (row + hh) <= (Math.floor(MIDR) - 1)
    } else if (q === 'BL'){
      return (col + hw) <= (Math.floor(MIDC) - 1) && (row - hh) >= Math.floor(MIDR)
    }
    // BR
    return (col - hw) >= Math.floor(MIDC) && (row - hh) >= Math.floor(MIDR)
  }

  // Does a chip placed at (col,row) collide visually with any other note's chip?
  const collidesAt = (col,row, excludeId)=>{
    // Keep-out around central axes
    if (!withinAxisBuffer(col, row)) return true
    const { w, h } = chipSpanCells()
    // With 1-cell gap: treat as collision if centers are within (span + gap - 1) cells on both axes
    const dxLimit = w + GAP_CELLS - 1
    const dyLimit = h + GAP_CELLS - 1
    for (const n of notes){
      if (excludeId && n.id === excludeId) continue
      if (Math.abs(col - n.col) <= dxLimit && Math.abs(row - n.row) <= dyLimit) return true
    }
    return false
  }

  // Find next non-colliding slot scanning from quadrant center outward
  const nextSlotForQuadrant = (q)=>{
    const { col: c0, row: r0 } = quadrantCenter(q)
    const maxR = Math.max(COLS, ROWS)
    for (let r=0; r<=maxR; r++){
      for (let dc=-r; dc<=r; dc++){
        const candidates = [
          { col: c0 + dc, row: r0 - r },
          { col: c0 + dc, row: r0 + r },
        ]
        for (const p of candidates){
          if (!isInQuadrant(p.col,p.row,q)) continue
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!withinAxisBuffer(p.col, p.row)) continue
          if (!collidesAt(p.col, p.row)) return p
        }
      }
      for (let dr=-r+1; dr<=r-1; dr++){
        const candidates = [
          { col: c0 - r, row: r0 + dr },
          { col: c0 + r, row: r0 + dr },
        ]
        for (const p of candidates){
          if (!isInQuadrant(p.col,p.row,q)) continue
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!withinAxisBuffer(p.col, p.row)) continue
          if (!collidesAt(p.col, p.row)) return p
        }
      }
    }
    return quadrantCenter(q)
  }

  // Find nearest non-colliding slot around an arbitrary target within the same quadrant
  const nearestNonCollidingInQuadrant = (targetCol, targetRow, excludeId)=>{
    const q = getQuadrant(targetCol, targetRow)
    const maxR = Math.max(COLS, ROWS)
    for (let r=0; r<=maxR; r++){
      for (let dc=-r; dc<=r; dc++){
        const candidates = [
          { col: targetCol + dc, row: targetRow - r },
          { col: targetCol + dc, row: targetRow + r },
        ]
        for (const p of candidates){
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!isInQuadrant(p.col, p.row, q)) continue
          if (!withinAxisBuffer(p.col, p.row)) continue
          if (!collidesAt(p.col, p.row, excludeId)) return p
        }
      }
      for (let dr=-r+1; dr<=r-1; dr++){
        const candidates = [
          { col: targetCol - r, row: targetRow + dr },
          { col: targetCol + r, row: targetRow + dr },
        ]
        for (const p of candidates){
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!isInQuadrant(p.col, p.row, q)) continue
          if (!withinAxisBuffer(p.col, p.row)) continue
          if (!collidesAt(p.col, p.row, excludeId)) return p
        }
      }
    }
    return null
  }

  // Array-aware variant for use inside setNotes callback to avoid stale reads
  const nearestNonCollidingInQuadrantIn = (arr, targetCol, targetRow, excludeId)=>{
    const q = getQuadrant(targetCol, targetRow)
    const maxR = Math.max(COLS, ROWS)
    const { w, h } = chipSpanCells()
    const dxLimit = w + GAP_CELLS - 1
    const dyLimit = h + GAP_CELLS - 1
    const collidesIn = (c,r)=>{
      if (!withinAxisBuffer(c, r)) return true
      return arr.some(n=> (!excludeId || n.id!==excludeId) && Math.abs(c - n.col) <= dxLimit && Math.abs(r - n.row) <= dyLimit)
    }
    for (let r=0; r<=maxR; r++){
      for (let dc=-r; dc<=r; dc++){
        const candidates = [
          { col: targetCol + dc, row: targetRow - r },
          { col: targetCol + dc, row: targetRow + r },
        ]
        for (const p of candidates){
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!isInQuadrant(p.col, p.row, q)) continue
          if (!collidesIn(p.col, p.row)) return p
        }
      }
      for (let dr=-r+1; dr<=r-1; dr++){
        const candidates = [
          { col: targetCol - r, row: targetRow + dr },
          { col: targetCol + r, row: targetRow + dr },
        ]
        for (const p of candidates){
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!isInQuadrant(p.col, p.row, q)) continue
          if (!collidesIn(p.col, p.row)) return p
        }
      }
    }
    return null
  }

  // Find the nearest free cell around a target position within the same quadrant
  const nearestFreeInQuadrant = (targetCol, targetRow, excludeId)=>{
    const q = getQuadrant(targetCol, targetRow)
    const occ = new Set()
    for (const n of notes){
      if (excludeId && n.id === excludeId) continue
      occ.add(`${n.col},${n.row}`)
    }
    const maxR = Math.max(COLS, ROWS)
    for (let r=0; r<=maxR; r++){
      for (let dc=-r; dc<=r; dc++){
        const candidates = [
          { col: targetCol + dc, row: targetRow - r },
          { col: targetCol + dc, row: targetRow + r },
        ]
        for (const p of candidates){
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!isInQuadrant(p.col, p.row, q)) continue
          const key = `${p.col},${p.row}`
          if (!occ.has(key)) return p
        }
      }
      for (let dr=-r+1; dr<=r-1; dr++){
        const candidates = [
          { col: targetCol - r, row: targetRow + dr },
          { col: targetCol + r, row: targetRow + dr },
        ]
        for (const p of candidates){
          if (p.col<0 || p.col>=COLS || p.row<0 || p.row>=ROWS) continue
          if (!isInQuadrant(p.col, p.row, q)) continue
          const key = `${p.col},${p.row}`
          if (!occ.has(key)) return p
        }
      }
    }
    return null
  }

  const startComposerAt = (clickedCol,clickedRow)=>{
    // If already editing, ignore new starts to prevent losing text
    if (composer) return
    const q = getQuadrant(clickedCol,clickedRow)
    // Prefer nearest to click that doesn't collide
    const near = nearestNonCollidingInQuadrant(clickedCol, clickedRow)
    const slot = near || nextSlotForQuadrant(q)
    setComposer({ col: slot.col, row: slot.row, text:'' })
  }
  const cancelComposer = ()=> setComposer(null)
  const submitComposer = (e)=>{
    e?.preventDefault?.()
    if (!composer) return
    const t = (composer.text||'').trim().slice(0, MAX_TEXT)
    if (!t){ setComposer(null); return }
    if (composer.id){
      setNotes(arr=> arr.map(n=> n.id===composer.id ? { ...n, text:t, col: composer.col, row: composer.row } : n))
    } else {
      addNote(composer.col, composer.row, t)
    }
    setComposer(null)
  }

  // Quick input handler for bottom panel
  const submitQuickInput = (e)=>{
    e?.preventDefault?.()
    const t = quickInput.trim()
    if (!t) return
    
  // Find the quadrant with least notes and place at nearest non-colliding slot
    const counts = { TL:0, TR:0, BL:0, BR:0 }
    for (const n of notes){
      const q = getQuadrant(n.col, n.row)
      counts[q]++
    }
    
    // Pick quadrant with minimum count
    const minQuad = Object.keys(counts).reduce((a,b)=> counts[a] <= counts[b] ? a : b)
    const center = quadrantCenter(minQuad)
    const near = nearestNonCollidingInQuadrant(center.col, center.row)
    const slot = near || nextSlotForQuadrant(minQuad)
    addNote(slot.col, slot.row, t)
    setQuickInput('')
  }

  // Drag handling
  useEffect(()=>{
    const move = (ev)=>{
      if (!dragId) return
      const { clientX, clientY } = ev.touches?.[0] || ev
      const { col, row } = clientToCell(clientX, clientY)
      setNotes((arr)=>{
        // If target placement would collide visually, re-route to nearest non-colliding within same quadrant
        const wouldCollide = collidesAt(col, row, dragId)
        if (wouldCollide){
          const p = nearestNonCollidingInQuadrantIn(arr, col, row, dragId)
          if (!p) return arr
          setTimeout(()=> triggerPing(dragId), 0)
          return arr.map(n=> n.id===dragId ? { ...n, col: p.col, row: p.row } : n)
        }
        return arr.map(n=> n.id===dragId ? { ...n, col, row } : n)
      })
    }
    const up = ()=> setDragId(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('touchmove', move, { passive:false })
    window.addEventListener('touchend', up)
    return ()=>{
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  },[dragId])

  const onGridClick = (e)=>{
    // Single-click no longer creates notes to avoid accidentes
    return
  }

  const onGridDoubleClick = (e)=>{
    if (composer) return
    if (e.target.closest('.eh-note') || e.target.closest('.eh-composer')) return
    const { col, row } = clientToCell(e.clientX, e.clientY)
    // Determine target slot honoring non-collision rule
    let target = { col, row }
    if (collidesAt(col, row)){
      const near = nearestNonCollidingInQuadrant(col, row)
      if (near) target = near
      else {
        const q = getQuadrant(col,row)
        target = nextSlotForQuadrant(q)
      }
    }
    const newId = Math.random().toString(36).slice(2,9)
    addNote(target.col, target.row, '', newId)
    setComposer({ id:newId, col: target.col, row: target.row, text: '' })
  }

  // Wheel/pinch zoom handlers
  // Normalize wheel delta across browsers/devices (pixels)
  const wheelDeltaPx = (e)=>{
    let dy = e.deltaY
    if (dy === undefined && typeof e.wheelDelta === 'number') dy = -e.wheelDelta
    if (typeof dy !== 'number') dy = 0
    // Convert line/page scroll units to pixels
    if (e.deltaMode === 1) dy *= 16 // lines -> px
    else if (e.deltaMode === 2) dy *= 100 // pages -> approx px
    // Clamp extremes to avoid wild jumps
    if (dy > 200) dy = 200
    if (dy < -200) dy = -200
    return dy
  }

  // Attach a native non-passive wheel listener so preventDefault works reliably
  useEffect(()=>{
    const el = stageWrapRef.current
    if (!el) return
    const onWheelNative = (e)=>{
      e.preventDefault()
      e.stopPropagation()
      const dy = wheelDeltaPx(e)
      const sensitivity = 0.0015 // tune for trackpad vs mouse
      // dy > 0 (scroll down) => zoom out; dy < 0 => zoom in
      const dz = Math.exp(-dy * sensitivity)
      setZoom((z)=> clamp(+(z * dz).toFixed(3), ZMIN, ZMAX))
    }
    el.addEventListener('wheel', onWheelNative, { passive:false })
    return ()=> el.removeEventListener('wheel', onWheelNative)
  }, [ZMIN, ZMAX])

  const updatePointer = (e)=>{
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const removePointer = (e)=>{
    pointersRef.current.delete(e.pointerId)
  }
  const dist2 = (a,b)=> Math.hypot(a.x - b.x, a.y - b.y)
  const onPointerDown = (e)=>{
    if (dragId) return // don't start pinch while dragging a note
    if (e.pointerType !== 'touch') return
    updatePointer(e)
    if (pointersRef.current.size === 2){
      const pts = Array.from(pointersRef.current.values())
      pinchRef.current = { startDist: dist2(pts[0], pts[1]), startZoom: zoom }
    }
  }
  const onPointerMove = (e)=>{
    if (dragId) return
    if (e.pointerType !== 'touch') return
    updatePointer(e)
    if (pointersRef.current.size === 2 && pinchRef.current){
      const pts = Array.from(pointersRef.current.values())
      const d = dist2(pts[0], pts[1])
      const ratio = d && pinchRef.current.startDist ? (d / pinchRef.current.startDist) : 1
      const target = pinchRef.current.startZoom * ratio
      setZoom(()=> clamp(+target.toFixed(3), ZMIN, ZMAX))
    }
  }
  const onPointerUp = (e)=>{
    if (e.pointerType !== 'touch') return
    removePointer(e)
    if (pointersRef.current.size < 2){
      pinchRef.current = null
    }
  }

  // Zoom to fit content
  const zoomToFit = ()=>{
    if (notes.length === 0) {
      setZoom(1)
      return
    }
    
    // Calculate bounding box of all notes
    let minCol = Infinity, maxCol = -Infinity
    let minRow = Infinity, maxRow = -Infinity
    
    for (const note of notes) {
      minCol = Math.min(minCol, note.col)
      maxCol = Math.max(maxCol, note.col)
      minRow = Math.min(minRow, note.row)
      maxRow = Math.max(maxRow, note.row)
    }
    
    // Add padding around content
    const padding = 20
    minCol = Math.max(0, minCol - padding)
    maxCol = Math.min(COLS - 1, maxCol + padding)
    minRow = Math.max(0, minRow - padding)
    maxRow = Math.min(ROWS - 1, maxRow + padding)
    
    // Calculate required zoom to fit content
    const contentWidth = (maxCol - minCol + 1) / COLS
    const contentHeight = (maxRow - minRow + 1) / ROWS
    const maxContentDimension = Math.max(contentWidth, contentHeight)
    
    // Target zoom to fit content in ~80% of visible area
    const targetZoom = 0.8 / maxContentDimension
    const finalZoom = clamp(targetZoom, ZMIN, ZMAX)
    
    setZoom(finalZoom)
  }

  // Group notes per cell to slightly offset overlapping chips
  const groupIndex = (col,row,id)=>{
    let idx = 0
    for (const n of notes){
      if (n.col===col && n.row===row){
        if (n.id===id) return idx
        idx++
      }
    }
    return 0
  }

  const wrap = {
    position:'absolute', inset:0, zIndex:10,
    display:'grid', placeItems:'center',
    background:'var(--bg-wrap)',
    color:'var(--text)',
    fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, \'Liberation Mono\', monospace'
  }

  const panel = {
    position:'relative',
    width:'min(90vh, 92vw)',
    aspectRatio:'1 / 1',
    borderRadius:20,
    padding:16,
    background:'var(--panel-bg)',
    border:'1px solid var(--panel-border)',
    boxShadow:'0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
    backdropFilter:'blur(18px) saturate(1.15)',
    WebkitBackdropFilter:'blur(18px) saturate(1.15)'
  }

  const grid = {
    position:'absolute', left:0, top:0, width:'100%', height:'100%',
    // Base subtle background to enhance glass feel
    background:'linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))'
  }

  const notesLayer = { position:'absolute', inset:0, pointerEvents:'none' }

  // Dynamic axis gradients (from center to edges), intensity adjusts with notes distribution
  const counts = useMemo(()=>{
    let left=0,right=0,top=0,bottom=0
    for (const n of notes){
      if (n.col < COLS/2) left++; else right++
      if (n.row < ROWS/2) top++; else bottom++
    }
    return { left, right, top, bottom }
  }, [notes])

  const baseAlpha = 0.10
  const gain = 0.25
  const totalH = counts.left + counts.right
  const totalV = counts.top + counts.bottom
  const aLeft = baseAlpha + gain * (totalH ? (counts.left/totalH) : 0)
  const aRight = baseAlpha + gain * (totalH ? (counts.right/totalH) : 0)
  const aTop = baseAlpha + gain * (totalV ? (counts.top/totalV) : 0)
  const aBottom = baseAlpha + gain * (totalV ? (counts.bottom/totalV) : 0)

  const axisLayer = { position:'absolute', inset:0, pointerEvents:'none' }
  const axisXLeft = {
    position:'absolute', left:0, width:'50%', top:'50%', height:12, transform:'translateY(-50%)',
    // Strongest at center (right edge of left half) -> fades to left
    background: `linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,${aLeft}) 100%)`
  }
  const axisXRight = {
    position:'absolute', right:0, width:'50%', top:'50%', height:12, transform:'translateY(-50%)',
    // Strongest at center (left edge of right half) -> fades to right
    background: `linear-gradient(to right, rgba(255,255,255,${aRight}) 0%, rgba(255,255,255,0) 100%)`
  }
  const axisYTop = {
    position:'absolute', top:0, height:'50%', left:'50%', width:12, transform:'translateX(-50%)',
    // Strongest at center (bottom edge of top half) -> fades to top
    background: `linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,${aTop}) 100%)`
  }
  const axisYBottom = {
    position:'absolute', bottom:0, height:'50%', left:'50%', width:12, transform:'translateX(-50%)',
    // Strongest at center (top edge of bottom half) -> fades to bottom
    background: `linear-gradient(to top, rgba(255,255,255,0) 0%, rgba(255,255,255,${aBottom}) 100%)`
  }

  // Quadrant heat overlays (subtle radial glows from the center cross)
  const quadCounts = useMemo(()=>{
    let tl=0,tr=0,bl=0,br=0
    for (const n of notes){
      const q = (n.row < MIDR ? (n.col < MIDC ? 'TL' : 'TR') : (n.col < MIDC ? 'BL' : 'BR'))
      if (q==='TL') tl++
      else if (q==='TR') tr++
      else if (q==='BL') bl++
      else br++
    }
    const max = Math.max(1, tl, tr, bl, br)
    return { tl, tr, bl, br, max }
  }, [notes, MIDC, MIDR])

  const baseQ = 0.05
  const gainQ = 0.25
  const aTL = baseQ + gainQ * (quadCounts.tl / quadCounts.max)
  const aTR = baseQ + gainQ * (quadCounts.tr / quadCounts.max)
  const aBL = baseQ + gainQ * (quadCounts.bl / quadCounts.max)
  const aBR = baseQ + gainQ * (quadCounts.br / quadCounts.max)

  const quadLayer = { position:'absolute', inset:0, pointerEvents:'none' }
  const qTL = { position:'absolute', left:0,   top:0,   width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 100% 100%, rgba(255,255,255,${aTL}), rgba(255,255,255,0) 65%)` }
  const qTR = { position:'absolute', left:'50%', top:0,   width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 0% 100%, rgba(255,255,255,${aTR}), rgba(255,255,255,0) 65%)` }
  const qBL = { position:'absolute', left:0,   top:'50%', width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 100% 0%, rgba(255,255,255,${aBL}), rgba(255,255,255,0) 65%)` }
  const qBR = { position:'absolute', left:'50%', top:'50%', width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 0% 0%, rgba(255,255,255,${aBR}), rgba(255,255,255,0) 65%)` }

  // Visual keep-out band around the central axes based on chip span (centers cannot enter this band)
  const keepOut = useMemo(()=>{
    const { w, h } = chipSpanCells()
    const hw = Math.floor(w/2)
    const hh = Math.floor(h/2)
    const wPct = Math.max(0, (2*hw) / COLS * 100)
    const hPct = Math.max(0, (2*hh) / ROWS * 100)
    return { wPct, hPct }
  }, [COLS, ROWS])
  const keepOutLayer = { position:'absolute', inset:0, pointerEvents:'none' }
  const keepOutColor = 'rgba(240,55,93,.08)'

  // Capacity estimate based on chip span in cell units
  const capacity = useMemo(()=>{
    const { w, h } = chipSpanCells()
    const stepX = w + GAP_CELLS // center-to-center spacing that guarantees ≥1 empty cell between edges
    const stepY = h + GAP_CELLS
    const colsFit = Math.floor(COLS / stepX)
    const rowsFit = Math.floor(ROWS / stepY)
    return Math.max(1, colsFit * rowsFit)
  }, [COLS, ROWS, zoom])

  // Dense repack (simple lattice sweep) within quadrants, preserves per-quadrant order
  const repackDense = ()=>{
    const { w, h } = chipSpanCells()
    const stepX = w + GAP_CELLS
    const stepY = h + GAP_CELLS
    const lanes = {
      TL: { c0:0,    c1:Math.floor(MIDC)-1, r0:0,    r1:Math.floor(MIDR)-1 },
      TR: { c0:Math.floor(MIDC), c1:COLS-1, r0:0,    r1:Math.floor(MIDR)-1 },
      BL: { c0:0,    c1:Math.floor(MIDC)-1, r0:Math.floor(MIDR), r1:ROWS-1 },
      BR: { c0:Math.floor(MIDC), c1:COLS-1, r0:Math.floor(MIDR), r1:ROWS-1 }
    }
    setNotes((arr)=>{
      const byQ = { TL:[], TR:[], BL:[], BR:[] }
      for (const n of arr){ byQ[getQuadrant(n.col,n.row)].push(n) }
      const next = []
      for (const q of ['TL','TR','BL','BR']){
        let i = 0
        const { c0,c1,r0,r1 } = lanes[q]
        for (let r=r0; r<=r1 && i<byQ[q].length; r+=stepY){
          for (let c=c0; c<=c1 && i<byQ[q].length; c+=stepX){
            if (!withinAxisBuffer(c, r)) continue
            const src = byQ[q][i++]
            next.push({ ...src, col:c, row:r })
          }
        }
        // If overflow, place remaining at nearest non-colliding slots
        for (; i<byQ[q].length; i++){
          const src = byQ[q][i]
          const near = nearestNonCollidingInQuadrantIn(next, src.col, src.row, src.id) || nextSlotForQuadrant(q)
          next.push({ ...src, col:near.col, row:near.row })
        }
      }
      return next
    })
  }

  const noteStyle = (n)=>{
    const { left, top } = cellCenterPx(n.col, n.row)
    // No offset for overlapping - each cell should have only one note
    return {
      position:'absolute', left, top, transform:'translate(-50%, -50%)',
      background:'var(--note-bg)', color:'var(--text)', border:'1px solid var(--note-border)',
  boxSizing:'border-box', width:120, height:120, padding:8, borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.28)',
      fontSize:11, fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', pointerEvents:'auto', userSelect:'text',
      lineHeight:1.3, whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere', overflow:'hidden',
      touchAction:'none', cursor:'text',
      backdropFilter:'url(#distorsion)', WebkitBackdropFilter:'url(#distorsion)'
    }
  }

  const noteTextStyle = {
    display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:8,
    overflow:'hidden', textOverflow:'ellipsis', width:'100%', height:'calc(100% - 26px)',
    fontSize:11, lineHeight:1.3, fontFamily:'inherit'
  }

  const noteToolbarStyle = {
    position:'absolute', right:4, bottom:4, display:'flex', gap:4,
  }

  const weightBadgeStyle = {
    position:'absolute', left:6, bottom:6,
    padding:'2px 6px', borderRadius:6, fontSize:10,
    background:'rgba(10,12,24,.65)', color:'#EAEAEA',
    border:'1px solid rgba(255,255,255,.24)',
    pointerEvents:'none'
  }

  const weightPickerStyle = {
    position:'absolute', right:4, bottom:28, display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4,
    background:'rgba(10,12,24,.85)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.25)',
    padding:6, borderRadius:8, boxShadow:'0 8px 20px rgba(0,0,0,.35)', zIndex:2
  }
  const weightBtnStyle = {
    minWidth:28, minHeight:28, borderRadius:6, border:'1px solid rgba(255,255,255,.22)', background:'transparent', color:'#EAEAEA', cursor:'pointer', fontWeight:700
  }

  const handleWeightKeyDown = (e, note) => {
    // Keyboard nav for the weight picker: arrows move focus, Enter/Space select, Esc closes
    const container = e.currentTarget
    const buttons = Array.from(container.querySelectorAll('button[data-wv]'))
    if (!buttons.length) return
    const cols = 5
    let idx = Math.max(0, buttons.findIndex(b => b === document.activeElement))
    if (idx === -1) {
      // Focus current value if none focused yet
      const current = (note.priority ?? 5)
      const btn = buttons.find(b => Number(b.dataset.wv) === current)
      if (btn) btn.focus()
      idx = Math.max(0, buttons.findIndex(b => b === document.activeElement))
    }
    const key = e.key
    const clamp = (x,min,max)=> Math.max(min, Math.min(max, x))
    let handled = false
    if (key === 'ArrowRight') { idx = clamp(idx+1, 0, buttons.length-1); buttons[idx].focus(); handled = true }
    else if (key === 'ArrowLeft') { idx = clamp(idx-1, 0, buttons.length-1); buttons[idx].focus(); handled = true }
    else if (key === 'ArrowDown') { idx = clamp(idx+cols, 0, buttons.length-1); buttons[idx].focus(); handled = true }
    else if (key === 'ArrowUp') { idx = clamp(idx-cols, 0, buttons.length-1); buttons[idx].focus(); handled = true }
    else if (key === 'Enter' || key === ' ') {
      const el = document.activeElement
      if (el && el.dataset && el.dataset.wv) {
        const v = Number(el.dataset.wv)
        setNotes(arr=> arr.map(x=> x.id===note.id ? { ...x, priority: v } : x))
        setWeightFor(null)
        if (lastWeightTrigger && typeof lastWeightTrigger.focus === 'function') {
          // restore focus to trigger after selecting
          setTimeout(()=> lastWeightTrigger.focus(), 0)
        }
        handled = true
      }
    } else if (key === 'Escape') {
      setWeightFor(null)
      if (lastWeightTrigger && typeof lastWeightTrigger.focus === 'function') {
        setTimeout(()=> lastWeightTrigger.focus(), 0)
      }
      handled = true
    }
    if (handled) { e.preventDefault(); e.stopPropagation() }
  }

  const composerStyle = (c)=>{
    if (!c) return { display:'none' }
    const { left, top } = cellCenterPx(c.col, c.row)
    return {
      position:'absolute', left, top, transform:'translate(-50%, -50%)',
      background:'var(--composer-bg)', color:'var(--composer-text)', border:'1px solid var(--note-border)',
  boxSizing:'border-box', width:120, height:120, padding:8, borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.28)',
      fontSize:11, fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', pointerEvents:'auto',
      backdropFilter:'url(#distorsion)', WebkitBackdropFilter:'url(#distorsion)'
    }
  }

  const labels = {
    position:'absolute', inset:0, pointerEvents:'none',
    color:'rgba(234,234,234,.9)',
    textTransform:'uppercase',
    letterSpacing:.5,
    fontSize:12,
    display:'grid',
    gridTemplateRows:'auto 1fr auto',
    gridTemplateColumns:'auto 1fr auto',
  }

  const labelBase = {
    padding:'6px 10px',
    background:'rgba(10,12,24,.55)',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:8,
    backdropFilter:'blur(8px)',
    WebkitBackdropFilter:'blur(8px)',
    boxShadow:'0 6px 18px rgba(0,0,0,.25)',
  }

  // Palette for grid lines (grayscale)
  const minor = 'var(--grid-minor)'
  const medium = 'var(--grid-medium)'
  const major = 'var(--grid-major)'

  // Removed per-cell style because we no longer render per-cell nodes at 720×720

  return (
    <div style={wrap} role="region" aria-label="Matriz de Eisenhower">
      {/* Local styles for grid lines overlays and quadrant axes */}
      <style>{`
        .eh-grid::before, .eh-grid::after { content:''; position:absolute; pointer-events:none; }
        /* Vertical repeating lines (fine) */
        .eh-grid::before { inset:0; background:
          repeating-linear-gradient(to right,
            ${minor} 0, ${minor} 1px, transparent 1px, transparent calc(100%/${COLS})
          ),
          repeating-linear-gradient(to bottom,
            ${minor} 0, ${minor} 1px, transparent 1px, transparent calc(100%/${ROWS})
          );
          opacity:.6;
        }
        /* Central axes to emphasize quadrants */
        .eh-grid::after { left:0; right:0; top:0; bottom:0; background:
          linear-gradient(to right, transparent calc(50% - .5px), ${major} calc(50% - .5px), ${major} calc(50% + .5px), transparent calc(50% + .5px)),
          linear-gradient(to bottom, transparent calc(50% - .5px), ${major} calc(50% - .5px), ${major} calc(50% + .5px), transparent calc(50% + .5px));
          opacity:.8;
        }

        /* Ping visual when a note is re-routed */
        @keyframes eh-ping-ring { from { transform: translate(-50%, -50%) scale(0.8); opacity: .6; } to { transform: translate(-50%, -50%) scale(1.35); opacity: 0; } }
        @keyframes eh-ping-glow { from { box-shadow: 0 0 0 rgba(240,55,93,.6); } 50% { box-shadow: 0 0 18px rgba(240,55,93,.55); } to { box-shadow: 0 0 0 rgba(240,55,93,0); } }
  .eh-note.ping::after { content:''; position:absolute; left:50%; top:50%; width:120px; height:120px; border-radius:10px; border:2px solid rgba(240,55,93,.75); transform: translate(-50%, -50%); animation: eh-ping-ring 480ms ease-out forwards; pointer-events:none; }
        .eh-note.ping { animation: eh-ping-glow 480ms ease-out; }
      `}</style>

      <div style={panel} aria-label="Panel liquid glass">
        {/* Zoom/Pan stage wrapper (viewport) */}
        <div
          ref={stageWrapRef}
          onPointerDown={(e)=>{
            onPointerDown(e)
            // start panning with middle-click or Alt+left-click on empty space
            if (dragId) return
            const isMouse = e.pointerType === 'mouse'
            const wantPan = isMouse && (e.button === 1 || (e.button === 0 && (e.altKey || e.shiftKey)))
            if (!wantPan) return
            const rect = stageWrapRef.current.getBoundingClientRect()
            panStartRef.current = { x: pan.x, y: pan.y, startX: e.clientX, startY: e.clientY }
            e.preventDefault()
          }}
          onPointerMove={(e)=>{
            onPointerMove(e)
            if (panStartRef.current && e.buttons){
              const { x, y, startX, startY } = panStartRef.current
              const nx = x + (e.clientX - startX)
              const ny = y + (e.clientY - startY)
              panRef.current = { x: nx, y: ny }
              setPan(panRef.current)
              e.preventDefault()
            }
          }}
          onPointerUp={(e)=>{ onPointerUp(e); panStartRef.current = null }}
          onPointerCancel={(e)=>{ onPointerUp(e); panStartRef.current = null }}
          style={{position:'absolute', inset:16, borderRadius:14, overflow:'hidden', touchAction:'none', overscrollBehavior:'contain'}}
        >
          {/* Canvas content */}
          <div style={{position:'absolute', left:0, top:0, width:CANVAS_PX, height:CANVAS_PX, transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin:'top left'}}>
            {/* Grid layer: click to add note */}
            <div ref={gridRef} className="eh-grid" style={{...grid, width: '100%', height: '100%'}} role="grid" aria-rowcount={ROWS} aria-colcount={COLS} onClick={onGridClick} onDoubleClick={onGridDoubleClick} />

              {/* Keep-out band (beneath axis lines) */}
              <div style={{...keepOutLayer, width:'100%', height:'100%'}} aria-hidden>
                {/* Vertical band centered on Y axis */}
                <div style={{ position:'absolute', top:0, bottom:0, left:`calc(50% - ${keepOut.wPct/2}%)`, width:`${keepOut.wPct}%`, background: 'var(--keepout)' }} />
                {/* Horizontal band centered on X axis */}
                <div style={{ position:'absolute', left:0, right:0, top:`calc(50% - ${keepOut.hPct/2}%)`, height:`${keepOut.hPct}%`, background: 'var(--keepout)' }} />
              </div>

            {/* Axis gradient overlays (beneath notes) */}
            <div style={{...axisLayer, width: '100%', height: '100%'}} aria-hidden>
              <div style={axisXLeft} />
              <div style={axisXRight} />
              <div style={axisYTop} />
              <div style={axisYBottom} />
            </div>

            {/* Quadrant heat overlays (beneath notes) */}
            <div style={{...quadLayer, width: '100%', height: '100%'}} aria-hidden>
              <div style={qTL} />
              <div style={qTR} />
              <div style={qBL} />
              <div style={qBR} />
            </div>

            {/* Notes layer with inline editor */}
            <div style={{...notesLayer, width: '100%', height: '100%'}} aria-live="polite">
              {notes.map(n=> {
                const isEditing = composer && composer.id === n.id
                return (
                  <React.Fragment key={n.id}>
                    {!isEditing && (
                      <div
                        className={`eh-note${pingIds.has(n.id) ? ' ping' : ''}`}
                        style={noteStyle(n)}
                        title={n.text}
                        onPointerDown={(e)=>{
                          if (composer) return
                          // Don't start drag if clicking on toolbar/actions
                          const inToolbar = e.target && e.target.closest && e.target.closest('.eh-toolbar')
                          if (inToolbar) return
                          e.currentTarget.setPointerCapture?.(e.pointerId)
                          setDragId(n.id)
                        }}
                        onKeyDown={(e)=>{
                          if (composer) return
                          let dcol = 0, drow = 0
                          if (e.key==='ArrowLeft') dcol=-1
                          else if (e.key==='ArrowRight') dcol=1
                          else if (e.key==='ArrowUp') drow=-1
                          else if (e.key==='ArrowDown') drow=1
                          else if (e.key==='Delete' || e.key==='Backspace'){
                            setNotes(arr=> arr.filter(x=> x.id!==n.id))
                            return
                          } else return
                          e.preventDefault()
                          setNotes(arr=>{
                            const nextCol = clamp(n.col + dcol,0,COLS-1)
                            const nextRow = clamp(n.row + drow,0,ROWS-1)
                            const wouldCollide = collidesAt(nextCol, nextRow, n.id)
                            if (wouldCollide){
                              const p = nearestNonCollidingInQuadrantIn(arr, nextCol, nextRow, n.id)
                              if (!p) return arr
                              setTimeout(()=> triggerPing(n.id), 0)
                              return arr.map(x=> x.id===n.id ? { ...x, col: p.col, row: p.row } : x)
                            }
                            return arr.map(x=> x.id===n.id ? { ...x, col: nextCol, row: nextRow } : x)
                          })
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Nota: ${n.text}. Columna ${n.col+1} de ${COLS}, fila ${n.row+1} de ${ROWS}`}
                      >
                        <span style={noteTextStyle}>{n.text}</span>
                        {/* Weight badge */}
                        <span aria-label={`Importancia ${n.priority ?? 5} de 10`} style={weightBadgeStyle}>{n.priority ?? 5}</span>
                        <span className="eh-toolbar" style={noteToolbarStyle}>
                          <button
                            type="button"
                            aria-label="Editar nota"
                            title="Editar"
                            onPointerDown={(e)=>{ e.stopPropagation(); /* avoid parent drag */ }}
                            onClick={(e)=>{ e.stopPropagation(); setComposer({ id:n.id, col:n.col, row:n.row, text:n.text }) }}
                            style={{
                              background:'rgba(10,12,24,.7)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.3)',
                              borderRadius:4, padding:'2px 6px', fontSize:10, cursor:'pointer', userSelect:'none'
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            aria-label="Asignar importancia"
                            title="Importancia (1–10)"
                            onPointerDown={(e)=>{ e.stopPropagation() }}
                            onClick={(e)=>{ e.stopPropagation(); setLastWeightTrigger(e.currentTarget); setWeightFor(prev => prev===n.id ? null : n.id) }}
                            style={{
                              background:'rgba(10,12,24,.7)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.3)',
                              borderRadius:4, padding:'2px 6px', fontSize:10, cursor:'pointer', userSelect:'none'
                            }}
                          >
                            ⚖️
                          </button>
                          {weightFor === n.id && (
                            <div
                              role="dialog"
                              aria-label="Elegir importancia"
                              style={weightPickerStyle}
                              tabIndex={-1}
                              onClick={(e)=> e.stopPropagation()}
                              onPointerDown={(e)=> e.stopPropagation()}
                              onKeyDown={(e)=> handleWeightKeyDown(e, n)}
                              ref={(el)=>{
                                if (el) {
                                  // Focus the current value when opening
                                  const current = (n.priority ?? 5)
                                  const btn = el.querySelector(`button[data-wv="${current}"]`)
                                  if (btn) setTimeout(()=> btn.focus(), 0)
                                }
                              }}
                            >
                              {Array.from({length:10}, (_,i)=> i+1).map(v=> (
                                <button key={v}
                                  type="button"
                                  aria-label={`Fijar ${v}`}
                                  title={`${v}`}
                                  data-wv={v}
                                  style={{...weightBtnStyle, border: v===(n.priority??5) ? '2px solid #F0375D' : weightBtnStyle.border}}
                                  onClick={()=>{
                                    setNotes(arr=> arr.map(x=> x.id===n.id ? { ...x, priority: v } : x))
                                    setWeightFor(null)
                                    if (lastWeightTrigger && typeof lastWeightTrigger.focus === 'function') {
                                      setTimeout(()=> lastWeightTrigger.focus(), 0)
                                    }
                                  }}
                                >{v}</button>
                              ))}
                            </div>
                          )}
                        </span>
                      </div>
                    )}
                    {isEditing && (
                      <form className="eh-composer" style={composerStyle(composer)} onSubmit={submitComposer} onKeyDown={(e)=>{ if(e.key==='Escape'){ e.preventDefault(); cancelComposer() } }}>
                        <textarea
                          autoFocus
                          value={composer?.text || ''}
                          onChange={(e)=> setComposer(c=> c ? { ...c, text:e.target.value.slice(0, MAX_TEXT) } : c)}
                          onKeyDown={(e)=>{
                            if (e.key === 'Enter'){
                              if (e.shiftKey){
                                // allow newline within limit
                                return
                              }
                              e.preventDefault()
                              submitComposer()
                            } else if (e.key === 'Escape'){
                              e.preventDefault()
                              cancelComposer()
                            }
                          }}
                          placeholder="Editar nota"
                          maxLength={MAX_TEXT}
                          style={{
                            width:'100%', height:'calc(100% - 28px)', resize:'none',
                            padding:'6px 8px', borderRadius:6, border:'1px solid rgba(0,0,0,.15)',
                            background:'rgba(255,255,255,.9)', color:'#0a0a15', outline:'none',
                            fontSize:11, lineHeight:1.3, fontFamily:'inherit', boxSizing:'border-box'
                          }}
                        />
                        <div style={{position:'absolute', right:6, bottom:6, display:'flex', gap:6}}>
                          <button type="submit" aria-label="Guardar" title="Guardar" style={{ background:'#F0375D', color:'#0a0a15', border:'none', padding:'4px 8px', borderRadius:6, fontWeight:700 }}>💾</button>
                          <button type="button" onClick={cancelComposer} aria-label="Cancelar" title="Cancelar" style={{ background:'transparent', color:'#0a0a15', border:'1px solid rgba(0,0,0,.2)', padding:'4px 8px', borderRadius:6 }}>✕</button>
                        </div>
                        <div style={{position:'absolute', left:8, bottom:8, fontSize:10, opacity:.6}}>{(composer.text||'').length}/{MAX_TEXT}</div>
                      </form>
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Removed floating composer in favor of inline chip editor */}
          </div>
        </div>

        {/* Zoom controls and capacity */}
        <div style={{position:'absolute', top:8, right:8, display:'flex', gap:8, alignItems:'center', zIndex:5}}>
          <span aria-live="polite" style={{fontSize:11, opacity:.8}}>Notas: {notes.length} / ~{capacity}</span>
          <button aria-label="Reordenar denso" title="Reordenar denso" onClick={repackDense}
            style={{background:'rgba(10,12,24,.6)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.15)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>↻</button>
          <button aria-label="Zoom out" title="Zoom -" onClick={()=> setZoom(z=> Math.max(ZMIN, +(z - ZSTEP).toFixed(2)))}
            style={{background:'rgba(10,12,24,.6)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.15)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>−</button>
          <button aria-label="Reset zoom" title="Reset" onClick={()=> setZoom(1)}
            style={{background:'rgba(10,12,24,.6)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.15)', padding:'8px 10px', minWidth:56, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>{Math.round(zoom*100)}%</button>
          <button aria-label="Zoom to fit content" title="Ajustar al contenido" onClick={zoomToFit}
            style={{background:'rgba(10,12,24,.6)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.15)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>⌂</button>
          <button aria-label="Zoom in" title="Zoom +" onClick={()=> setZoom(z=> Math.min(ZMAX, +(z + ZSTEP).toFixed(2)))}
            style={{background:'#F0375D', color:'#0a0a15', border:'none', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:900, cursor:'pointer'}}>+</button>
        </div>

        {/* Quick input panel - bottom center */}
        <div style={{position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', zIndex:5}}>
          <form onSubmit={submitQuickInput} style={{display:'flex', gap:8, alignItems:'center'}}>
            <input
              value={quickInput}
              onChange={(e)=> setQuickInput(e.target.value.slice(0, MAX_TEXT))}
              placeholder="Añadir tarea rápida..."
              maxLength={MAX_TEXT}
              style={{
                width:280, padding:'10px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,.2)',
                background:'rgba(10,12,24,.75)', color:'#EAEAEA', outline:'none',
                backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
                boxShadow:'0 8px 24px rgba(0,0,0,.3)'
              }}
            />
            <button type="submit" disabled={!quickInput.trim()}
              style={{
                background: quickInput.trim() ? '#F0375D' : 'rgba(240,55,93,.3)', 
                color: quickInput.trim() ? '#0a0a15' : 'rgba(10,10,21,.6)', 
                border:'none', padding:'10px 16px', borderRadius:12, fontWeight:700, cursor: quickInput.trim() ? 'pointer' : 'not-allowed',
                backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
                boxShadow: quickInput.trim() ? '0 8px 24px rgba(0,0,0,.3)' : 'none'
              }}>
              Añadir
            </button>
          </form>
        </div>

        {/* Axis labels */}
        <div style={labels} aria-hidden>
          {/* top center labels */}
          <div style={{gridRow:'1', gridColumn:'2', display:'flex', gap:8, justifyContent:'center', marginTop:2}}>
            <span style={labelBase}>Urgente</span>
            <span style={{opacity:.6, alignSelf:'center'}}>·</span>
            <span style={labelBase}>No urgente</span>
          </div>
          {/* middle left labels */}
          <div style={{gridRow:'2', gridColumn:'1', writingMode:'vertical-rl', transform:'rotate(180deg)', display:'flex', gap:8, justifyContent:'center'}}>
            <span style={labelBase}>Importante</span>
            <span style={{opacity:.6, alignSelf:'center'}}>·</span>
            <span style={labelBase}>No importante</span>
          </div>
        </div>
      </div>
    </div>
  )
}
