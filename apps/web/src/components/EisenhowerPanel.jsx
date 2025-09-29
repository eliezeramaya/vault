import React, { useEffect, useMemo, useRef, useState } from 'react'

// Eisenhower Matrix with liquid-glass panel and a 72×72 = 5184 cell grid
export default function EisenhowerPanel(){
  const COLS = 72
  const ROWS = 72
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
  const [notes, setNotes] = useState([]) // {id, col, row, text}
  const [dragId, setDragId] = useState(null)
  const [composer, setComposer] = useState(null) // {id?, col, row, text}
  const [quickInput, setQuickInput] = useState('') // Bottom panel input
  const gridRef = useRef(null)
  const stageWrapRef = useRef(null)
  const pointersRef = useRef(new Map()) // pointerId -> {x,y}
  const pinchRef = useRef(null) // { startDist, startZoom }

  useEffect(()=>{
    try{
      const raw = localStorage.getItem(LS_KEY)
      if (raw){
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setNotes(arr)
      }
    }catch{}
  },[])

  useEffect(()=>{
    try{ localStorage.setItem(LS_KEY, JSON.stringify(notes)) }catch{}
  },[notes])

  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v))
  const clientToCell = (clientX, clientY)=>{
    const el = gridRef.current
    if (!el) return { col:0, row:0 }
    const rect = el.getBoundingClientRect()
    const x = clamp((clientX - rect.left) / rect.width, 0, 0.999999)
    const y = clamp((clientY - rect.top) / rect.height, 0, 0.999999)
    const col = Math.floor(x * COLS)
    const row = Math.floor(y * ROWS)
    return { col, row }
  }

  const cellCenterPct = (col,row)=> ({
    left: `${((col + 0.5) / COLS) * 100}%`,
    top: `${((row + 0.5) / ROWS) * 100}%`
  })

  const addNote = (col,row,text,idOverride)=>{
    const id = idOverride || Math.random().toString(36).slice(2,9)
    const t = (text||'Nota').slice(0, MAX_TEXT)
    
    // Check if cell is already occupied and find next free slot in same cell if needed
    const existingInCell = notes.filter(n => n.col === col && n.row === row)
    if (existingInCell.length > 0) {
      // If cell is occupied, find nearest free cell in same quadrant
      const q = getQuadrant(col, row)
      const slot = nextSlotForQuadrant(q)
      setNotes((arr)=> [...arr, { id, col: slot.col, row: slot.row, text: t }])
    } else {
      setNotes((arr)=> [...arr, { id, col, row, text: t }])
    }
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
    if (q==='TL') return { col: MIDC-1, row: MIDR-1 }
    if (q==='TR') return { col: MIDC,   row: MIDR-1 }
    if (q==='BL') return { col: MIDC-1, row: MIDR }
    return { col: MIDC,   row: MIDR } // BR
  }

  const nextSlotForQuadrant = (q)=>{
    // Build occupancy set per cell
    const occ = new Set()
    for (const n of notes){ occ.add(`${n.col},${n.row}`) }
    const { col: c0, row: r0 } = quadrantCenter(q)
    const maxR = Math.max(COLS, ROWS)
    // r = 0..max, search ring by ring from center outwards
    for (let r=0; r<=maxR; r++){
      // Traverse square ring perimeter at distance r
      for (let dc=-r; dc<=r; dc++){
        const candidates = [
          { col: c0 + dc, row: r0 - r }, // top edge
          { col: c0 + dc, row: r0 + r }, // bottom edge
        ]
        for (const p of candidates){
          if (!isInQuadrant(p.col,p.row,q)) continue
          const key = `${p.col},${p.row}`
          if (!occ.has(key)) return p
        }
      }
      for (let dr=-r+1; dr<=r-1; dr++){
        const candidates = [
          { col: c0 - r, row: r0 + dr }, // left edge
          { col: c0 + r, row: r0 + dr }, // right edge
        ]
        for (const p of candidates){
          if (!isInQuadrant(p.col,p.row,q)) continue
          const key = `${p.col},${p.row}`
          if (!occ.has(key)) return p
        }
      }
    }
    // Fallback to quadrant center if somehow filled
    return quadrantCenter(q)
  }

  const startComposerAt = (clickedCol,clickedRow)=>{
    // If already editing, ignore new starts to prevent losing text
    if (composer) return
    const q = getQuadrant(clickedCol,clickedRow)
    const slot = nextSlotForQuadrant(q)
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
    
    // Find the quadrant with least notes and place there
    const counts = { TL:0, TR:0, BL:0, BR:0 }
    for (const n of notes){
      const q = getQuadrant(n.col, n.row)
      counts[q]++
    }
    
    // Pick quadrant with minimum count
    const minQuad = Object.keys(counts).reduce((a,b)=> counts[a] <= counts[b] ? a : b)
    const slot = nextSlotForQuadrant(minQuad)
    
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
        // If target cell is occupied by another note, block move
        const occupied = arr.some(n => n.id !== dragId && n.col === col && n.row === row)
        if (occupied) return arr
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
    // Determine target slot honoring one-note-per-cell rule
    let target = { col, row }
    const occupied = notes.some(n => n.col===col && n.row===row)
    if (occupied){
      const q = getQuadrant(col,row)
      target = nextSlotForQuadrant(q)
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
    background:'radial-gradient(1200px 800px at 70% 20%, rgba(240,55,93,.05), transparent 60%), linear-gradient(180deg,#0a0a15 0%, #0a0f1f 100%)',
    color:'#EAEAEA',
    fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, \'Liberation Mono\', monospace'
  }

  const panel = {
    position:'relative',
    width:'min(90vh, 92vw)',
    aspectRatio:'1 / 1',
    borderRadius:20,
    padding:16,
    background:'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
    border:'1px solid rgba(255,255,255,.12)',
    boxShadow:'0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
    backdropFilter:'blur(18px) saturate(1.15)',
    WebkitBackdropFilter:'blur(18px) saturate(1.15)'
  }

  const grid = {
    position:'absolute', inset:0,
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

  const noteStyle = (n)=>{
    const { left, top } = cellCenterPct(n.col, n.row)
    // No offset for overlapping - each cell should have only one note
    return {
      position:'absolute', left, top, transform:'translate(-50%, -50%)',
      background:'transparent', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.4)',
      boxSizing:'border-box', width:240, height:240, padding:8, borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.28)',
      fontSize:11, fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', pointerEvents:'auto', userSelect:'text',
      lineHeight:1.3, whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere', overflow:'hidden',
      touchAction:'none', cursor:'text',
      backdropFilter:'url(#distorsion)', WebkitBackdropFilter:'url(#distorsion)'
    }
  }

  const noteTextStyle = {
    display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:16,
    overflow:'hidden', textOverflow:'ellipsis', width:'100%', height:'calc(100% - 26px)',
    fontSize:11, lineHeight:1.3, fontFamily:'inherit'
  }

  const noteToolbarStyle = {
    position:'absolute', right:4, bottom:4, display:'flex', gap:4,
  }

  const composerStyle = (c)=>{
    if (!c) return { display:'none' }
    const { left, top } = cellCenterPct(c.col, c.row)
    return {
      position:'absolute', left, top, transform:'translate(-50%, -50%)',
      background:'rgba(10,12,24,0.75)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,0.4)',
      boxSizing:'border-box', width:240, height:240, padding:8, borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.28)',
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
  const minor = 'rgba(255,255,255,.06)'
  const medium = 'rgba(255,255,255,.13)'
  const major = 'rgba(255,255,255,.22)'

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
      `}</style>

      <div style={panel} aria-label="Panel liquid glass">
        {/* Zoom stage wrapper */}
  <div ref={stageWrapRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{position:'absolute', inset:16, borderRadius:14, overflow:'hidden', touchAction:'none', overscrollBehavior:'contain'}}>
          <div style={{position:'absolute', inset:0, transform:`scale(${zoom})`, transformOrigin:'center center'}}>
            {/* Grid layer: click to add note */}
            <div ref={gridRef} className="eh-grid" style={grid} role="grid" aria-rowcount={ROWS} aria-colcount={COLS} onClick={onGridClick} onDoubleClick={onGridDoubleClick} />

            {/* Axis gradient overlays (beneath notes) */}
            <div style={axisLayer} aria-hidden>
              <div style={axisXLeft} />
              <div style={axisXRight} />
              <div style={axisYTop} />
              <div style={axisYBottom} />
            </div>

            {/* Quadrant heat overlays (beneath notes) */}
            <div style={quadLayer} aria-hidden>
              <div style={qTL} />
              <div style={qTR} />
              <div style={qBL} />
              <div style={qBR} />
            </div>

            {/* Notes layer with inline editor */}
            <div style={notesLayer} aria-live="polite">
              {notes.map(n=> {
                const isEditing = composer && composer.id === n.id
                return (
                  <React.Fragment key={n.id}>
                    {!isEditing && (
                      <div
                        className="eh-note"
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
                            const occupied = arr.some(x => x.id !== n.id && x.col === nextCol && x.row === nextRow)
                            if (occupied) return arr
                            return arr.map(x=> x.id===n.id ? { ...x, col: nextCol, row: nextRow } : x)
                          })
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Nota: ${n.text}. Columna ${n.col+1} de ${COLS}, fila ${n.row+1} de ${ROWS}`}
                      >
                        <span style={noteTextStyle}>{n.text}</span>
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
                          <button type="submit" style={{ background:'#F0375D', color:'#0a0a15', border:'none', padding:'4px 8px', borderRadius:6, fontWeight:700 }}>Guardar</button>
                          <button type="button" onClick={cancelComposer} style={{ background:'transparent', color:'#0a0a15', border:'1px solid rgba(0,0,0,.2)', padding:'4px 8px', borderRadius:6 }}>Cancelar</button>
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

        {/* Zoom controls */}
        <div style={{position:'absolute', top:8, right:8, display:'flex', gap:8, zIndex:5}}>
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
