import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Pencil, Scale, Save, X, RefreshCcw, ZoomIn, ZoomOut, Home, Search, Crosshair } from 'lucide-react'
import { useSafeStorage } from '../hooks/useSafeOperations'
import { useGlobalKeyboardShortcuts } from '../hooks/useKeyboardNavigation'
import { useTouchGestures } from '../hooks/useTouchGestures'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

// Componente NoteItem memoizado para optimizar renderizado
const NoteItem = React.memo(({
  note,
  isEditing,
  isPinging,
  noteStyle,
  noteTextStyle,
  noteToolbarStyle,
  weightBadgeStyle,
  weightFor,
  weightPickerRef,
  onPointerDown,
  onClick,
  onFocus,
  onKeyDown,
  onEdit,
  onWeight,
  onWeightKeyDown,
  onSetWeight,
  renderTextWithHighlight,
  onStartFocus
}) => {
  if (isEditing) return null
  
  return (
    <div
      className={`eh-note${isPinging ? ' ping' : ''}`}
      data-id={note.id}
      style={noteStyle(note)}
      title={note.text}
      
      // Make the entire note focusable via the first toolbar button to avoid non-interactive handlers
  role="group"
  aria-label={`Nota: ${note.text}. Columna ${note.col+1}, fila ${note.row+1}`}
    >
      <span style={noteTextStyle}>{renderTextWithHighlight(note.text)}</span>
      <span aria-label={`Importancia ${note.priority ?? 5} de 10`} title={`Importancia ${note.priority ?? 5}/10`} style={weightBadgeStyle}>{note.priority ?? 5}</span>
      <span className="eh-toolbar" style={noteToolbarStyle}>
        <button
          type="button"
          aria-label="Editar nota"
          title="Editar"
          onPointerDown={(e)=>{ e.stopPropagation() }}
          onClick={onEdit}
          style={{
            background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)',
            borderRadius:4, padding:'2px 6px', fontSize:10, cursor:'pointer', userSelect:'none'
          }}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        {/* Hidden button to transfer focus/selection and capture pointer for drag */}
        <button
          type="button"
          aria-label="Seleccionar nota"
          title="Seleccionar"
          onClick={onClick}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          style={{ position:'absolute', inset:0, opacity:0.01, background:'transparent', border:'none', cursor:'pointer' }}
          tabIndex={0}
        />
        <button
          type="button"
          aria-label="Asignar importancia"
          title="Importancia (1–10)"
          onPointerDown={(e)=>{ e.stopPropagation() }}
          onClick={onWeight}
          style={{
            background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)',
            borderRadius:4, padding:'2px 6px', fontSize:10, cursor:'pointer', userSelect:'none'
          }}
        >
          <Scale size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Empezar foco (25m)"
          title="Foco 25m en Q importante/urgente"
          onPointerDown={(e)=>{ e.stopPropagation() }}
          onClick={()=> onStartFocus?.(note)}
          style={{
            background:'var(--primary)', color:'var(--on-primary)', border:'none',
            borderRadius:4, padding:'2px 8px', fontSize:10, cursor:'pointer', fontWeight:800
          }}
        >
          Foco
        </button>
        {weightFor === note.id && (
          <div
            role="dialog"
            aria-label="Elegir importancia"
            style={{
              position:'absolute', right:4, bottom:28, display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4,
              background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)',
              padding:6, borderRadius:8, boxShadow:'0 8px 20px rgba(0,0,0,.35)', zIndex:2
            }}
            ref={(el)=>{
              if (el) {
                weightPickerRef.current = el
                const current = (note.priority ?? 5)
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
                style={{
                  minWidth:28, minHeight:28, borderRadius:6, border: v===(note.priority??5) ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                  background:'transparent', color:'var(--surface-text)', cursor:'pointer', fontWeight:700
                }}
                onClick={()=> onSetWeight(v)}
                onKeyDown={(e)=> onWeightKeyDown(e, note)}
              >{v}</button>
            ))}
          </div>
        )}
      </span>
    </div>
  )
})

NoteItem.displayName = 'NoteItem'

// Eisenhower Matrix with liquid-glass panel and a 72×72 = 5184 cell grid
const EisenhowerPanel = React.memo(() => {
  const { safeGetItem, safeSetItem } = useSafeStorage()
  
  // Canvas and chip sizing
  const CHIP_PX = 120 // fixed chip size in CSS pixels (pre-scale)
  const CANVAS_PX = 2400 // virtual canvas side length in CSS pixels (pre-scale)
  const COLS = 96
  const ROWS = 96
  const CELL_PX = CANVAS_PX / COLS
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
  const weightPickerRef = useRef(null)
  const gridRef = useRef(null)
  const stageWrapRef = useRef(null)
  const panRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef(null) // { x, y, startX, startY }
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const pointersRef = useRef(new Map()) // pointerId -> {x,y}
  const pinchRef = useRef(null) // { startDist, startZoom }
  const [selectedId, setSelectedId] = useState(null)
  const [showCheats, setShowCheats] = useState(false)
  const [srMsg, setSrMsg] = useState('')
  const notesRef = useRef(notes)
  useEffect(()=>{ notesRef.current = notes }, [notes])

  // Filters state and persistence
  const LS_FILT = 'eh_filters_v1'
  const [searchText, setSearchText] = useState('')
  const [prioMin, setPrioMin] = useState(1)
  const [prioMax, setPrioMax] = useState(10)
  const [quad, setQuad] = useState({ TL:true, TR:true, BL:true, BR:true })
  const [gridContrast, setGridContrast] = useState(1.0) // 0.5..2.0

  useEffect(()=>{
    const savedNotes = safeGetItem(LS_KEY, [])
    if (Array.isArray(savedNotes)) {
      // Back-compat: ensure priority exists (default 5)
      setNotes(savedNotes.map(n => ({ ...n, priority: (typeof n.priority === 'number' ? n.priority : 5) })))
    }
  }, [safeGetItem])

  // Load filters
  useEffect(()=>{
    const savedFilters = safeGetItem(LS_FILT, {})
    if (savedFilters && typeof savedFilters === 'object'){
      if (typeof savedFilters.search === 'string') setSearchText(savedFilters.search)
      if (Array.isArray(savedFilters.prio) && savedFilters.prio.length===2){
        const a = Math.max(1, Math.min(10, +savedFilters.prio[0] || 1))
        const b = Math.max(1, Math.min(10, +savedFilters.prio[1] || 10))
        setPrioMin(Math.min(a,b))
        setPrioMax(Math.max(a,b))
      }
      if (savedFilters.quad && typeof savedFilters.quad==='object'){
        setQuad(q=> ({ ...q,
          TL: !!savedFilters.quad.TL, TR: !!savedFilters.quad.TR, BL: !!savedFilters.quad.BL, BR: !!savedFilters.quad.BR
        }))
      }
      if (typeof savedFilters.gridC === 'number') {
        const val = Number(savedFilters.gridC)
        setGridContrast(Math.max(0.5, Math.min(2, isNaN(val) ? 1.0 : val)))
      }
    }
  }, [safeGetItem])

  useEffect(()=>{
    safeSetItem(LS_KEY, notes)
  }, [notes, safeSetItem])

  // Persist filters
  useEffect(()=>{
    const data = { search: searchText, prio:[prioMin, prioMax], quad, gridC: gridContrast }
    safeSetItem(LS_FILT, data)
  }, [searchText, prioMin, prioMax, quad, gridContrast, safeSetItem])

  const getQuadrant = useCallback((col,row)=>{
    const left = col < MIDC
    const top = row < MIDR
    if (top && left) return 'TL'
    if (top && !left) return 'TR'
    if (!top && left) return 'BL'
    return 'BR'
  }, [MIDC, MIDR])

  const matchesFilters = useCallback((n)=>{
    // quadrant
    const q = getQuadrant(n.col, n.row)
    if (!quad[q]) return false
    // priority
    const p = typeof n.priority === 'number' ? n.priority : 5
    if (p < prioMin || p > prioMax) return false
    // text search
    const s = searchText.trim().toLowerCase()
    if (!s) return true
    return (n.text||'').toLowerCase().includes(s)
  }, [getQuadrant, quad, prioMin, prioMax, searchText])

  const renderTextWithHighlight = useCallback((text)=>{
    const t = String(text||'')
    const query = searchText.trim()
    if (!query) return t
    const lower = t.toLowerCase()
    const ql = query.toLowerCase()
    const parts = []
    let i = 0
    while (i < t.length){
      const idx = lower.indexOf(ql, i)
      if (idx === -1){
        parts.push(t.slice(i))
        break
      }
      if (idx > i) parts.push(t.slice(i, idx))
      parts.push(
        <mark key={idx} style={{ background:'rgba(240,55,93,.35)', color:'inherit', padding:'0 2px', borderRadius:4 }}>{t.slice(idx, idx+ql.length)}</mark>
      )
      i = idx + ql.length
    }
    return parts
  }, [searchText])

  // Memorizar notas filtradas para evitar recálculo costoso
  const filteredNotes = useMemo(()=>{
    return notes.filter(matchesFilters)
  }, [notes, matchesFilters])

  // Virtualización básica: solo renderizar notas visibles en el viewport actual
  const visibleNotes = useMemo(()=>{
    // Si hay pocas notas, renderizar todas para evitar overhead de virtualización
    if (filteredNotes.length <= 50) return filteredNotes
    
    // Calcular viewport visible basado en pan y zoom
    const viewportCols = CANVAS_PX / zoom
    const viewportRows = CANVAS_PX / zoom
    const startCol = Math.max(0, Math.floor(-pan.x / zoom / CANVAS_PX * COLS))
    const endCol = Math.min(COLS, Math.ceil((viewportCols - pan.x) / zoom / CANVAS_PX * COLS))
    const startRow = Math.max(0, Math.floor(-pan.y / zoom / CANVAS_PX * ROWS))
    const endRow = Math.min(ROWS, Math.ceil((viewportRows - pan.y) / zoom / CANVAS_PX * ROWS))
    
    // Añadir buffer para suavizar el scroll
    const buffer = 10
    const bufferStartCol = Math.max(0, startCol - buffer)
    const bufferEndCol = Math.min(COLS, endCol + buffer)
    const bufferStartRow = Math.max(0, startRow - buffer)
    const bufferEndRow = Math.min(ROWS, endRow + buffer)
    
    return filteredNotes.filter(note => 
      note.col >= bufferStartCol && note.col <= bufferEndCol &&
      note.row >= bufferStartRow && note.row <= bufferEndRow
    )
  }, [filteredNotes, pan, zoom])

  // Helper to trigger a brief visual ping on a note
  const triggerPing = useCallback((id)=>{
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
  }, [])

  const clamp = useCallback((v,min,max)=> Math.max(min, Math.min(max, v)), [])
  
  const clientToCell = useCallback((clientX, clientY)=>{
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
  }, [pan.x, pan.y, zoom, clamp])

  const cellCenterPx = useCallback((col,row)=> ({
    left: ((col + 0.5) / COLS) * CANVAS_PX,
    top:  ((row + 0.5) / ROWS) * CANVAS_PX
  }), [COLS, ROWS, CANVAS_PX])

  // Compute chip integer span in cell units (independent of zoom)
  const GAP_CELLS = 0 // empty grid cells between chip edges (0 = allow contact, no overlap)
  const CHIP_W_CELLS = Math.ceil((CHIP_PX / CANVAS_PX) * COLS)
  const CHIP_H_CELLS = Math.ceil((CHIP_PX / CANVAS_PX) * ROWS)

  // Ensure a chip centered at (col,row) stays fully within its quadrant and does not overlap central axes
  const withinAxisBuffer = useCallback((col, row)=>{
    const hw = Math.floor(CHIP_W_CELLS/2)
    const hh = Math.floor(CHIP_H_CELLS/2)
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
  }, [getQuadrant, CHIP_W_CELLS, CHIP_H_CELLS, COLS, ROWS, MIDC, MIDR])

  // Lightweight inline collision test that doesn't capture addNote/other callbacks
  const canPlace = useCallback((c, r, excludeId = null) => {
    if (!withinAxisBuffer(c, r)) return false
    const dxLimit = CHIP_W_CELLS + GAP_CELLS - 1
    const dyLimit = CHIP_H_CELLS + GAP_CELLS - 1
    for (const n of notes) {
      if (excludeId && n.id === excludeId) continue
      if (Math.abs(c - n.col) <= dxLimit && Math.abs(r - n.row) <= dyLimit) return false
    }
    return true
  }, [notes, withinAxisBuffer, CHIP_W_CELLS, CHIP_H_CELLS, GAP_CELLS])

  // moved addNote below nearestNonCollidingInQuadrant to avoid TDZ in deps

  const isInQuadrant = useCallback((col,row,q)=>{
    if (q==='TL') return col>=0 && col<MIDC && row>=0 && row<MIDR
    if (q==='TR') return col>=MIDC && col<COLS && row>=0 && row<MIDR
    if (q==='BL') return col>=0 && col<MIDC && row>=MIDR && row<ROWS
    return col>=MIDC && col<COLS && row>=MIDR && row<ROWS // BR
  }, [MIDC, MIDR, COLS, ROWS])

  const quadrantCenter = useCallback((q)=>{
    // Seed points adjacent to the central axes
    if (q==='TL') return { col: Math.floor(MIDC)-1, row: Math.floor(MIDR)-1 }
    if (q==='TR') return { col: Math.floor(MIDC),   row: Math.floor(MIDR)-1 }
    if (q==='BL') return { col: Math.floor(MIDC)-1, row: Math.floor(MIDR) }
    return { col: Math.floor(MIDC),   row: Math.floor(MIDR) } // BR
  }, [MIDC, MIDR])


  // Does a chip placed at (col,row) collide visually with any other note's chip?
  const collidesAt = useCallback((col,row, excludeId)=>{
    // Keep-out around central axes
    if (!withinAxisBuffer(col, row)) return true
  // With 1-cell gap: treat as collision if centers are within (span + gap - 1) cells on both axes
  const dxLimit = CHIP_W_CELLS + GAP_CELLS - 1
  const dyLimit = CHIP_H_CELLS + GAP_CELLS - 1
    for (const n of notes){
      if (excludeId && n.id === excludeId) continue
      if (Math.abs(col - n.col) <= dxLimit && Math.abs(row - n.row) <= dyLimit) return true
    }
    return false
  }, [notes, withinAxisBuffer, CHIP_W_CELLS, CHIP_H_CELLS, GAP_CELLS])

  // Find next non-colliding slot scanning from quadrant center outward
  const nextSlotForQuadrant = useCallback((q)=>{
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
  }, [quadrantCenter, isInQuadrant, withinAxisBuffer, collidesAt])

  // Find nearest non-colliding slot around an arbitrary target within the same quadrant
  const nearestNonCollidingInQuadrant = useCallback((targetCol, targetRow, excludeId)=>{
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
  }, [getQuadrant, isInQuadrant, withinAxisBuffer, collidesAt])

  // Create note with non-colliding placement
  const addNote = useCallback((col,row,text,idOverride)=>{
    const id = idOverride || Math.random().toString(36).slice(2,9)
    const t = (text||'Nota').slice(0, MAX_TEXT)
    // Enforce non-colliding placement
    let target = { col, row }
    if (!canPlace(col, row, id)){
      const near = nearestNonCollidingInQuadrant(col, row, id)
      if (near) target = near
      else {
        const q = getQuadrant(col,row)
        const slot = nextSlotForQuadrant(q)
        target = slot
      }
    }
    setNotes((arr)=> [...arr, { id, col: target.col, row: target.row, text: t, priority: 5 }])
    return id
  }, [canPlace, getQuadrant, nearestNonCollidingInQuadrant, nextSlotForQuadrant])

  // Array-aware variant for use inside setNotes callback to avoid stale reads
  const nearestNonCollidingInQuadrantIn = useCallback((arr, targetCol, targetRow, excludeId)=>{
    const q = getQuadrant(targetCol, targetRow)
    const maxR = Math.max(COLS, ROWS)
  const dxLimit = CHIP_W_CELLS + GAP_CELLS - 1
  const dyLimit = CHIP_H_CELLS + GAP_CELLS - 1
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
  }, [getQuadrant, isInQuadrant, withinAxisBuffer, CHIP_W_CELLS, CHIP_H_CELLS, GAP_CELLS, COLS, ROWS])

  // Find the nearest free cell around a target position within the same quadrant
  // removed legacy nearestFreeInQuadrant helper (unused)

  // removed startComposerAt (unused)
  
  const cancelComposer = useCallback(()=> setComposer(null), [])
  
  const submitComposer = useCallback((e)=>{
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
  }, [composer, addNote])

  // Quick input handler for bottom panel
  const submitQuickInput = useCallback((e)=>{
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
    setSrMsg(`Nota creada en columna ${slot.col+1}, fila ${slot.row+1}`)
    setQuickInput('')
  }, [quickInput, notes, getQuadrant, quadrantCenter, nearestNonCollidingInQuadrant, nextSlotForQuadrant, addNote])

  // Create empty note in least-populated quadrant and open composer
  const createQuickNote = useCallback((targetCol = null, targetRow = null)=>{
    if (composer) return
    
    let slot
    if (targetCol !== null && targetRow !== null) {
      // Use specific position if provided
      if (!canPlace(targetCol, targetRow)) {
        const near = nearestNonCollidingInQuadrant(targetCol, targetRow)
        slot = near || nextSlotForQuadrant(getQuadrant(targetCol, targetRow))
      } else {
        slot = { col: targetCol, row: targetRow }
      }
    } else {
      // Default behavior - find least populated quadrant
      const counts = { TL:0, TR:0, BL:0, BR:0 }
      for (const n of notes){ counts[getQuadrant(n.col,n.row)]++ }
      const minQuad = Object.keys(counts).reduce((a,b)=> counts[a] <= counts[b] ? a : b)
      const center = quadrantCenter(minQuad)
      const near = nearestNonCollidingInQuadrant(center.col, center.row)
      slot = near || nextSlotForQuadrant(minQuad)
    }
    
    const newId = addNote(slot.col, slot.row, '')
    setComposer({ id:newId, col: slot.col, row: slot.row, text: '' })
    setSelectedId(newId)
  }, [composer, notes, getQuadrant, quadrantCenter, nearestNonCollidingInQuadrant, nextSlotForQuadrant, addNote, canPlace])

  // Touch gesture handlers for mobile optimization
  // legacy pinch handler (unused) removed

  // long press handled by useTouchGestures configuration below

  // double tap handled by useTouchGestures configuration below

  // swipe handling not used in matrix panel

  // Configure touch gestures for the grid (single instance)
  const haptic = useHapticFeedback()
  const gridTouchRef = useTouchGestures({
    onPinch: (scale) => {
      // Smooth pinch zoom
      setZoom(z => clamp(+(z * scale).toFixed(3), ZMIN, ZMAX))
    },
    onLongPress: ({ x, y }) => {
      const rect = stageWrapRef.current?.getBoundingClientRect()
      if (rect) {
        const relativeX = x - rect.left
        const relativeY = y - rect.top
        const cellPos = clientToCell(relativeX, relativeY)
        if (cellPos && canPlace(cellPos.col, cellPos.row)) {
          createQuickNote(cellPos.col, cellPos.row)
          setSrMsg(`Nota creada por toque largo en columna ${cellPos.col+1}, fila ${cellPos.row+1}`)
          try { haptic.success?.() } catch { /* ignore haptic */ }
        }
      }
    },
    onDoubleTap: () => {
      const currentZoom = zoom
      const targetZoom = currentZoom < 1 ? 1.5 : currentZoom > 1.5 ? 1 : 0.5
      setZoom(targetZoom)
      try { haptic.doubleTap?.() } catch { /* ignore haptic */ }
    },
    swipeThreshold: 50,
    longPressDelay: 600,
    enabled: !composer
  })

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
    const up = ()=>{
      if (dragId){
        const n = notesRef.current.find(x=> x.id===dragId)
        if (n) setSrMsg(`Nota movida a columna ${n.col+1}, fila ${n.row+1}`)
      }
      setDragId(null)
    }
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
  },[dragId, clientToCell, collidesAt, nearestNonCollidingInQuadrantIn, triggerPing, setSrMsg])

  const onGridClick = useCallback(()=>{
    // Single-click no longer creates notes to avoid accidentes
    return
  }, [])

  const onGridDoubleClick = useCallback((e)=>{
    if (composer) return
    if (e.target.closest('.eh-note') || e.target.closest('.eh-composer')) return
    const { col, row } = clientToCell(e.clientX, e.clientY)
    // Determine target slot honoring non-collision rule
    let target = { col, row }
    if (!canPlace(col, row)){
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
    setSelectedId(newId)
    setSrMsg(`Nota creada en columna ${target.col+1}, fila ${target.row+1}`)
  }, [composer, clientToCell, canPlace, nearestNonCollidingInQuadrant, getQuadrant, nextSlotForQuadrant, addNote])

  // Center view: reset pan to center of viewport, keep current zoom
  const centerView = useCallback(()=>{
    try {
      const wrap = stageWrapRef.current
      if (!wrap) return
      // Place canvas so its center aligns with viewport center
      const rect = wrap.getBoundingClientRect()
      const viewW = rect.width
      const viewH = rect.height
      const contentW = CANVAS_PX * zoom
      const contentH = CANVAS_PX * zoom
      const nx = (viewW - contentW) / 2
      const ny = (viewH - contentH) / 2
      const p = { x: nx, y: ny }
      panRef.current = p
      setPan(p)
      setSrMsg('Vista centrada')
    } catch {}
  }, [zoom])

  // Zoom to fit content (defined early to avoid TDZ when referenced in shortcuts)
  const zoomToFit = useCallback(()=>{
    if (notes.length === 0) {
      setZoom(1)
      return
    }
    let minCol = Infinity, maxCol = -Infinity
    let minRow = Infinity, maxRow = -Infinity
    for (const note of notes) {
      minCol = Math.min(minCol, note.col)
      maxCol = Math.max(maxCol, note.col)
      minRow = Math.min(minRow, note.row)
      maxRow = Math.max(maxRow, note.row)
    }
    const padding = 20
    minCol = Math.max(0, minCol - padding)
    maxCol = Math.min(COLS - 1, maxCol + padding)
    minRow = Math.max(0, minRow - padding)
    maxRow = Math.min(ROWS - 1, maxRow + padding)
    const contentWidth = (maxCol - minCol + 1) / COLS
    const contentHeight = (maxRow - minRow + 1) / ROWS
    const maxContentDimension = Math.max(contentWidth, contentHeight)
    const targetZoom = 0.8 / maxContentDimension
    const finalZoom = clamp(targetZoom, ZMIN, ZMAX)
    setZoom(finalZoom)
  }, [notes, clamp])

  const focusSearchInput = useCallback(() => {
    const searchInput = document.querySelector('.eh-search input')
    if (searchInput) {
      searchInput.focus()
      return true
    }
    return false
  }, [])

  // Enhanced keyboard navigation
  const keyboardShortcuts = useMemo(() => ({
    'h': () => { setShowCheats(v => !v); return true },
    'H': () => { setShowCheats(v => !v); return true },
    '?': () => { setShowCheats(v => !v); return true },
    'n': () => { if (!composer) { createQuickNote(); return true } return false },
    'N': () => { if (!composer) { createQuickNote(); return true } return false },
    '=': () => { setZoom(z => Math.min(ZMAX, +(z + ZSTEP).toFixed(2))); return true },
    '+': () => { setZoom(z => Math.min(ZMAX, +(z + ZSTEP).toFixed(2))); return true },
    '-': () => { setZoom(z => Math.max(ZMIN, +(z - ZSTEP).toFixed(2))); return true },
    '0': () => { zoomToFit(); return true },
    'f': () => { focusSearchInput(); return true },
    'F': () => { focusSearchInput(); return true },
    '/': () => { focusSearchInput(); return true }
  }), [composer, ZMAX, ZMIN, ZSTEP, createQuickNote, zoomToFit, focusSearchInput])


  const handleEnterKey = useCallback(() => {
    if (composer) return false
    
    const el = document.activeElement
    const activeNoteEl = el && el.classList && el.classList.contains('eh-note') ? el : null
    const currentId = activeNoteEl ? activeNoteEl.getAttribute('data-id') : selectedId
    
    if (currentId) {
      const n = notes.find(x => x.id === currentId)
      if (n) {
        setComposer({ id: n.id, col: n.col, row: n.row, text: n.text })
        return true
      }
    }
    return false
  }, [composer, selectedId, notes])

  // Escape key is handled within specific handlers/local keydowns

  const handleDeleteKey = useCallback(() => {
    if (composer) return false
    
    const el = document.activeElement
    const activeNoteEl = el && el.classList && el.classList.contains('eh-note') ? el : null
    const currentId = activeNoteEl ? activeNoteEl.getAttribute('data-id') : selectedId
    
    if (currentId) {
      setNotes(arr => arr.filter(x => x.id !== currentId))
      setSelectedId(null)
      setSrMsg('Nota eliminada')
      return true
    }
    return false
  }, [composer, selectedId, setSrMsg])

  

  // Extended shortcuts including delete
  const extendedShortcuts = useMemo(() => ({
    ...keyboardShortcuts,
    'Delete': handleDeleteKey,
    'Backspace': handleDeleteKey,
    'e': () => {
      if (!composer) {
        return handleEnterKey()
      }
      return false
    },
    'E': () => {
      if (!composer) {
        return handleEnterKey()
      }
      return false
    }
  }), [keyboardShortcuts, handleDeleteKey, handleEnterKey, composer])

  // Register matrix-level global shortcuts
  useGlobalKeyboardShortcuts(extendedShortcuts)

  // (Removed duplicate gesture hook block that previously caused runtime errors)

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
  }, [ZMIN, ZMAX, clamp])

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

  

  // Group notes per cell to slightly offset overlapping chips
  // removed groupIndex (unused)

  const wrap = {
    position:'relative', // changed from absolute to allow document flow sizing
    minHeight:'calc(100vh - 140px)', // fallback height; refined below with responsive panel
    display:'grid', placeItems:'center',
    background:'var(--bg-wrap)',
    color:'var(--text)',
    fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, \'Liberation Mono\', monospace',
    padding:'12px max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))'
  }

  const panel = {
    position:'relative',
    // Prefer square up to available viewport; on narrow screens, expand height to fit
    width:'min(92vw, 92vh)',
    maxWidth:'min(980px, 95vw)',
    // On small screens, let height breathe more than width
    height:'auto',
    aspectRatio:'1 / 1',
    borderRadius:20,
    padding:16,
    background:'var(--panel-bg)',
    border:'1px solid var(--panel-border)',
    boxShadow:'0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
    backdropFilter:'blur(18px) saturate(1.15)',
    WebkitBackdropFilter:'blur(18px) saturate(1.15)'
  }

  const minorA = Math.max(0, Math.min(0.6, 0.10 * gridContrast))
  const majorA = Math.max(0, Math.min(0.85, 0.18 * gridContrast))
  const grid = {
    position:'absolute', left:0, top:0, width:'100%', height:'100%',
    // Modern grayscale grid with adjustable contrast
    background: `
      repeating-linear-gradient(
        to right,
        rgba(128,128,128,${minorA}) 0px,
        rgba(128,128,128,${minorA}) 1px,
        transparent 1px,
        transparent ${CELL_PX}px
      ),
      repeating-linear-gradient(
        to bottom,
        rgba(128,128,128,${minorA}) 0px,
        rgba(128,128,128,${minorA}) 1px,
        transparent 1px,
        transparent ${CELL_PX}px
      ),
      repeating-linear-gradient(
        to right,
        transparent 0px,
        transparent ${CELL_PX * 6 - 2}px,
        rgba(128,128,128,${majorA}) ${CELL_PX * 6 - 2}px,
        rgba(128,128,128,${majorA}) ${CELL_PX * 6 - 1}px,
        transparent ${CELL_PX * 6 - 1}px,
        transparent ${CELL_PX * 6}px
      ),
      repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent ${CELL_PX * 6 - 2}px,
        rgba(128,128,128,${majorA}) ${CELL_PX * 6 - 2}px,
        rgba(128,128,128,${majorA}) ${CELL_PX * 6 - 1}px,
        transparent ${CELL_PX * 6 - 1}px,
        transparent ${CELL_PX * 6}px
      ),
      linear-gradient(180deg, rgba(255,255,255,.015), rgba(0,0,0,.015))
    `
  }

  const notesLayer = { position:'absolute', inset:0, pointerEvents:'auto' }

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
    position:'absolute', left:0, width:'50%', top:'50%', height:14, transform:'translateY(-50%)',
    // Grey gradient from center to left
    background: `linear-gradient(to right, rgba(128,128,128,0) 0%, rgba(128,128,128,${aLeft}) 100%)`
  }
  const axisXRight = {
    position:'absolute', right:0, width:'50%', top:'50%', height:14, transform:'translateY(-50%)',
    // Grey gradient from center to right
    background: `linear-gradient(to right, rgba(128,128,128,${aRight}) 0%, rgba(128,128,128,0) 100%)`
  }
  const axisYTop = {
    position:'absolute', top:0, height:'50%', left:'50%', width:14, transform:'translateX(-50%)',
    // Grey gradient from center to top
    background: `linear-gradient(to bottom, rgba(128,128,128,0) 0%, rgba(128,128,128,${aTop}) 100%)`
  }
  const axisYBottom = {
    position:'absolute', bottom:0, height:'50%', left:'50%', width:14, transform:'translateX(-50%)',
    // Grey gradient from center to bottom
    background: `linear-gradient(to top, rgba(128,128,128,0) 0%, rgba(128,128,128,${aBottom}) 100%)`
  }

  // Central axis lines (2px) with subtle shadow for clarity
  const axisCenterX = {
    position:'absolute', left:0, right:0, top:'50%', height:2, transform:'translateY(-50%)',
    background:'rgba(128,128,128,0.55)', boxShadow:'0 0 0 1px rgba(0,0,0,0.05)'
  }
  const axisCenterY = {
    position:'absolute', top:0, bottom:0, left:'50%', width:2, transform:'translateX(-50%)',
    background:'rgba(128,128,128,0.55)', boxShadow:'0 0 0 1px rgba(0,0,0,0.05)'
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

  const baseQ = 0.06
  const gainQ = 0.25
  const aTL = baseQ + gainQ * (quadCounts.tl / quadCounts.max)
  const aTR = baseQ + gainQ * (quadCounts.tr / quadCounts.max)
  const aBL = baseQ + gainQ * (quadCounts.bl / quadCounts.max)
  const aBR = baseQ + gainQ * (quadCounts.br / quadCounts.max)

  const quadLayer = { position:'absolute', inset:0, pointerEvents:'none' }
  const qTL = { position:'absolute', left:0,   top:0,   width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 100% 100%, rgba(128,128,128,${aTL}), rgba(128,128,128,0) 65%)` }
  const qTR = { position:'absolute', left:'50%', top:0,   width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 0% 100%, rgba(128,128,128,${aTR}), rgba(128,128,128,0) 65%)` }
  const qBL = { position:'absolute', left:0,   top:'50%', width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 100% 0%, rgba(128,128,128,${aBL}), rgba(128,128,128,0) 65%)` }
  const qBR = { position:'absolute', left:'50%', top:'50%', width:'50%', height:'50%',
    background:`radial-gradient(220px 160px at 0% 0%, rgba(128,128,128,${aBR}), rgba(128,128,128,0) 65%)` }

  // Visual keep-out band around the central axes based on chip span (centers cannot enter this band)
  // removed keepOut visual layer variables (unused)

  // Capacity estimate based on chip span in cell units
  const capacity = useMemo(()=>{
    const stepX = CHIP_W_CELLS + GAP_CELLS // center-to-center spacing that guarantees ≥1 empty cell between edges
    const stepY = CHIP_H_CELLS + GAP_CELLS
    const colsFit = Math.floor(COLS / stepX)
    const rowsFit = Math.floor(ROWS / stepY)
    return Math.max(1, colsFit * rowsFit)
  }, [COLS, ROWS, CHIP_H_CELLS, CHIP_W_CELLS])

  // Dense repack (simple lattice sweep) within quadrants, preserves per-quadrant order
  const repackDense = useCallback(()=>{
    const stepX = CHIP_W_CELLS + GAP_CELLS
    const stepY = CHIP_H_CELLS + GAP_CELLS
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
  }, [getQuadrant, withinAxisBuffer, nearestNonCollidingInQuadrantIn, nextSlotForQuadrant, CHIP_H_CELLS, CHIP_W_CELLS, MIDC, MIDR])

  const noteStyle = (n)=>{
    const { left, top } = cellCenterPx(n.col, n.row)
    // No offset for overlapping - each cell should have only one note
    return {
      position:'absolute', left, top, transform:'translate(-50%, -50%)',
      background:'var(--note-bg)', color:'var(--text)',
      // No border to allow perfectly touching chips with no visible separation
      // border:'1px solid var(--note-border)',
      boxSizing:'border-box', width:120, height:120, padding:8, borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.28)',
      fontSize:11, fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', pointerEvents:'auto', userSelect:'text',
      lineHeight:1.3, whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere', overflow:'hidden',
      touchAction:'none', cursor:'text',
      backdropFilter:'blur(8px) saturate(1.15)',
      WebkitBackdropFilter:'blur(8px) saturate(1.15)'
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
    background:'var(--surface)', color:'var(--surface-text)',
    border:'1px solid var(--surface-border)',
    cursor:'default'
  }

  // Close weight picker on click/touch outside
  useEffect(()=>{
    if (!weightFor) return
    const onDown = (e)=>{
      const picker = weightPickerRef.current
      if (picker && picker.contains(e.target)) return
      if (lastWeightTrigger && lastWeightTrigger.contains && lastWeightTrigger.contains(e.target)) return
      setWeightFor(null)
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('touchstart', onDown, { passive:true, capture:true })
    return ()=>{
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('touchstart', onDown, { capture:true })
    }
  }, [weightFor, lastWeightTrigger])

  const composerStyle = (c)=>{
    if (!c) return { display:'none' }
    const { left, top } = cellCenterPx(c.col, c.row)
    return {
      position:'absolute', left, top, transform:'translate(-50%, -50%)',
      background:'var(--composer-bg)', color:'var(--composer-text)',
      // Match note visuals: remove border so no separation appears while editing
      // border:'1px solid var(--note-border)',
      boxSizing:'border-box', width:120, height:120, padding:8, borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.28)',
      fontSize:11, fontFamily:'Proggy, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', pointerEvents:'auto',
      backdropFilter:'blur(8px) saturate(1.15)',
      WebkitBackdropFilter:'blur(8px) saturate(1.15)'
    }
  }

  const labels = {
    position:'absolute', inset:0, pointerEvents:'none',
  color:'var(--text)',
    textTransform:'uppercase',
    letterSpacing:.5,
    fontSize:12,
    display:'grid',
    gridTemplateRows:'auto 1fr auto',
    gridTemplateColumns:'auto 1fr auto',
  }

  const labelBase = {
    padding:'6px 10px',
  background:'var(--surface)',
  border:'1px solid var(--surface-border)',
    borderRadius:8,
    backdropFilter:'blur(8px)',
    WebkitBackdropFilter:'blur(8px)',
    boxShadow:'0 6px 18px rgba(0,0,0,.25)',
  }

  // Palette for grid lines (grayscale)
  // removed grid palette constants (unused)

  // Removed per-cell style because we no longer render per-cell nodes at 720×720

  return (
    <div style={wrap} role="region" aria-label="Matriz de Eisenhower">
      {/* Local styles */}
      <style>{`
        @media (max-width: 768px){
          /* On small screens, allow taller than wide and reduce radii/paddings a bit */
          .eh-panel{ width: min(96vw, 96vh); border-radius: 16px; padding: 12px; }
        }
      `}</style>

      <div className="eh-panel" style={panel} aria-label="Panel liquid glass">
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
            <div 
              ref={(el) => {
                gridRef.current = el
                gridTouchRef.current = el
              }} 
              className="eh-grid touch-feedback" 
              style={{...grid, width: '100%', height: '100%'}} 
              role="grid" 
              aria-rowcount={ROWS} 
              aria-colcount={COLS} 
              tabIndex={0}
              onKeyDown={(e)=>{
                // Provide a keyboard handler so grid role is truly interactive
                if (e.key === 'Enter') {
                  const rect = stageWrapRef.current?.getBoundingClientRect()
                  if (!rect) return
                  const cell = clientToCell(rect.left + rect.width/2, rect.top + rect.height/2)
                  if (cell && canPlace(cell.col, cell.row)) {
                    createQuickNote(cell.col, cell.row)
                    e.preventDefault()
                  }
                }
              }}
              onClick={onGridClick} 
              onDoubleClick={onGridDoubleClick} 
            />

              {/* Keep-out bands (visual) removed per request; logic still enforced via withinAxisBuffer */}

            {/* Axis gradient overlays (beneath notes) */}
            <div style={{...axisLayer, width: '100%', height: '100%'}} aria-hidden>
              <div style={axisXLeft} />
              <div style={axisXRight} />
              <div style={axisYTop} />
              <div style={axisYBottom} />
              {/* Central 2px axes */}
              <div style={axisCenterX} />
              <div style={axisCenterY} />
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
                const visible = (visibleNotes.includes(n) || isEditing)
                if (!visible) return null
                const q = getQuadrant(n.col, n.row)
                const quadrantMap = { TL:'Q1', TR:'Q2', BL:'Q3', BR:'Q4' }
                return (
                  <React.Fragment key={n.id}>
                    <NoteItem
                      note={n}
                      isEditing={isEditing}
                      isPinging={pingIds.has(n.id)}
                      noteStyle={noteStyle}
                      noteTextStyle={noteTextStyle}
                      noteToolbarStyle={noteToolbarStyle}
                      weightBadgeStyle={weightBadgeStyle}
                      weightFor={weightFor}
                      lastWeightTrigger={lastWeightTrigger}
                      weightPickerRef={weightPickerRef}
                      onPointerDown={(e)=>{
                        if (composer) return
                        const inToolbar = e.target && e.target.closest && e.target.closest('.eh-toolbar')
                        if (inToolbar) return
                        e.currentTarget.setPointerCapture?.(e.pointerId)
                        setDragId(n.id)
                      }}
                      onClick={()=> setSelectedId(n.id)}
                      onFocus={()=> setSelectedId(n.id)}
                      onKeyDown={(e)=>{
                        if (composer) return
                        let dcol = 0, drow = 0
                        if (e.key==='ArrowLeft') dcol=-1
                        else if (e.key==='ArrowRight') dcol=1
                        else if (e.key==='ArrowUp') drow=-1
                        else if (e.key==='ArrowDown') drow=1
                        else if (e.key==='Delete' || e.key==='Backspace'){
                          setNotes(arr=> arr.filter(x=> x.id!==n.id))
                          setSrMsg('Nota eliminada')
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
                            setTimeout(()=> setSrMsg(`Nota movida a columna ${p.col+1}, fila ${p.row+1}`), 0)
                            return arr.map(x=> x.id===n.id ? { ...x, col: p.col, row: p.row } : x)
                          }
                          setTimeout(()=> setSrMsg(`Nota movida a columna ${nextCol+1}, fila ${nextRow+1}`), 0)
                          return arr.map(x=> x.id===n.id ? { ...x, col: nextCol, row: nextRow } : x)
                        })
                      }}
                      onEdit={(e)=>{ e.stopPropagation(); setComposer({ id:n.id, col:n.col, row:n.row, text:n.text }) }}
                      onWeight={(e)=>{ e.stopPropagation(); setLastWeightTrigger(e.currentTarget); setWeightFor(prev => prev===n.id ? null : n.id) }}
                      onWeightKeyDown={(e, note) => {
                        const container = e.currentTarget
                        const buttons = Array.from(container.querySelectorAll('button[data-wv]'))
                        if (!buttons.length) return
                        const cols = 5
                        let idx = Math.max(0, buttons.findIndex(b => b === document.activeElement))
                        if (idx === -1) {
                          const current = (note.priority ?? 5)
                          const btn = buttons.find(b => Number(b.dataset.wv) === current)
                          if (btn) btn.focus()
                          idx = Math.max(0, buttons.findIndex(b => b === document.activeElement))
                        }
                        const key = e.key
                        const clampLocal = (x,min,max)=> Math.max(min, Math.min(max, x))
                        let handled = false
                        if (key === 'ArrowRight') { idx = clampLocal(idx+1, 0, buttons.length-1); buttons[idx].focus(); handled = true }
                        else if (key === 'ArrowLeft') { idx = clampLocal(idx-1, 0, buttons.length-1); buttons[idx].focus(); handled = true }
                        else if (key === 'ArrowDown') { idx = clampLocal(idx+cols, 0, buttons.length-1); buttons[idx].focus(); handled = true }
                        else if (key === 'ArrowUp') { idx = clampLocal(idx-cols, 0, buttons.length-1); buttons[idx].focus(); handled = true }
                        else if (key === 'Enter' || key === ' ') {
                          const el = document.activeElement
                          if (el && el.dataset && el.dataset.wv) {
                            const v = Number(el.dataset.wv)
                            setNotes(arr=> arr.map(x=> x.id===note.id ? { ...x, priority: v } : x))
                            setWeightFor(null)
                            if (lastWeightTrigger && typeof lastWeightTrigger.focus === 'function') {
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
                      }}
                      onSetWeight={(v)=>{
                        setNotes(arr=> arr.map(x=> x.id===n.id ? { ...x, priority: v } : x))
                        setWeightFor(null)
                        if (lastWeightTrigger && typeof lastWeightTrigger.focus === 'function') {
                          setTimeout(()=> lastWeightTrigger.focus(), 0)
                        }
                        setSrMsg(`Importancia cambiada a ${v}`)
                      }}
                      renderTextWithHighlight={renderTextWithHighlight}
                      onStartFocus={(note)=>{
                        try {
                          const ev = new CustomEvent('focus:start', { detail: { minutes:25, taskId: note.id, quadrant: quadrantMap[q] || 'Q2' } })
                          window.dispatchEvent(ev)
                        } catch {}
                      }}
                      setNotes={setNotes}
                      setSrMsg={setSrMsg}
                      setSelectedId={setSelectedId}
                    />
                    {isEditing && (
                      <form className="eh-composer" style={composerStyle(composer)} onSubmit={submitComposer}>
                        <textarea
                          ref={(el)=>{
                            if (el) {
                              // focus after mount without autoFocus prop for better a11y
                              setTimeout(()=>{ try { el.focus() } catch { /* ignore focus errors */ } }, 0)
                            }
                          }}
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
                            background:'rgba(255,255,255,.9)', color:'var(--on-primary)', outline:'none',
                            fontSize:11, lineHeight:1.3, fontFamily:'inherit', boxSizing:'border-box'
                          }}
                        />
                        <div style={{position:'absolute', right:6, bottom:6, display:'flex', gap:6}}>
                          <button type="submit" aria-label="Guardar" title="Guardar" style={{ background:'var(--primary)', color:'var(--on-primary)', border:'none', padding:'4px 8px', borderRadius:6, fontWeight:700 }}>
                            <Save size={16} aria-hidden="true" />
                          </button>
                          <button type="button" onClick={cancelComposer} aria-label="Cancelar" title="Cancelar" style={{ background:'transparent', color:'var(--text)', border:'1px solid rgba(0,0,0,.2)', padding:'4px 8px', borderRadius:6 }}>
                            <X size={16} aria-hidden="true" />
                          </button>
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

        {/* Filters + Zoom controls */}
        <div style={{position:'absolute', top:8, right:8, display:'flex', gap:12, alignItems:'stretch', zIndex:6}}>
          {/* Filter bar */}
          <form aria-label="Filtros" onSubmit={(e)=> e.preventDefault()} style={{display:'flex', gap:8, alignItems:'center', background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px', borderRadius:12, backdropFilter:'blur(8px)'}}>
            <div style={{position:'relative'}}>
              <Search size={16} aria-hidden="true" style={{position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', opacity:.8}} />
              <input
                value={searchText}
                onChange={(e)=> setSearchText(e.target.value.slice(0, 64))}
                placeholder="Buscar texto..."
                aria-label="Buscar por texto"
                style={{padding:'8px 10px 8px 28px', borderRadius:8, border:'1px solid var(--surface-border)', background:'var(--surface)', color:'var(--surface-text)', minWidth:160}}
              />
            </div>
            <label style={{display:'flex', alignItems:'center', gap:6, color:'var(--surface-text)', fontSize:12}}>
              Prioridad
              <input type="number" min={1} max={10} value={prioMin} onChange={(e)=> setPrioMin(Math.max(1, Math.min(10, Number(e.target.value)||1)))} aria-label="Prioridad mínima" style={{width:52, padding:'6px 8px', borderRadius:8, border:'1px solid var(--surface-border)', background:'var(--surface)', color:'var(--surface-text)'}} />
              –
              <input type="number" min={1} max={10} value={prioMax} onChange={(e)=> setPrioMax(Math.max(1, Math.min(10, Number(e.target.value)||10)))} aria-label="Prioridad máxima" style={{width:52, padding:'6px 8px', borderRadius:8, border:'1px solid var(--surface-border)', background:'var(--surface)', color:'var(--surface-text)'}} />
            </label>
            <fieldset style={{display:'flex', gap:6, border:'none', margin:0, padding:0}} aria-label="Cuadrantes">
              {['TL','TR','BL','BR'].map(q => (
                <label key={q} style={{display:'flex', alignItems:'center', gap:4, background: quad[q] ? 'rgba(240,55,93,.35)' : 'transparent', border:'1px solid var(--surface-border)', padding:'6px 8px', borderRadius:8, color:'var(--surface-text)', cursor:'pointer'}}>
                  <input type="checkbox" checked={!!quad[q]} onChange={(e)=> setQuad(prev=> ({ ...prev, [q]: e.target.checked }))} />
                  {q}
                </label>
              ))}
            </fieldset>
            <button type="button" onClick={()=>{ setSearchText(''); setPrioMin(1); setPrioMax(10); setQuad({TL:true,TR:true,BL:true,BR:true}) }}
              aria-label="Limpiar filtros" title="Limpiar filtros"
              style={{background:'transparent', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'6px 10px', borderRadius:8, cursor:'pointer'}}>Limpiar</button>
          </form>

          {/* Zoom controls and capacity */}
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap: 'wrap'}}>
            <span aria-live="polite" style={{fontSize:11, opacity:.8, color:'var(--surface-text)'}}>Notas: {notes.length} / ~{capacity}</span>
            <button aria-label="Reordenar denso" title="Reordenar denso" onClick={repackDense}
              className="touch-feedback"
              style={{background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>
              <RefreshCcw size={18} aria-hidden="true" />
            </button>
            {/* Grid contrast control */}
            <label title="Contraste de grilla" style={{display:'flex', alignItems:'center', gap:6, background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'6px 10px', borderRadius:10, fontSize:12}}>
              Grilla
              <input type="range" min={0.5} max={2} step={0.1}
                value={gridContrast}
                onChange={(e)=> setGridContrast(Math.max(0.5, Math.min(2, Number(e.target.value) || 1)))}
                style={{ accentColor:'var(--primary)' }}
                aria-label="Contraste de grilla" />
              <span style={{width:34, textAlign:'right'}}>{Math.round(gridContrast*100)}%</span>
            </label>
            <button aria-label="Centrar vista" title="Centrar" onClick={centerView}
              className="touch-feedback"
              style={{background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>
              <Crosshair size={18} aria-hidden="true" />
            </button>
            <button aria-label="Alejar vista (Zoom -)" title="Zoom -" onClick={()=> setZoom(z=> Math.max(ZMIN, +(z - ZSTEP).toFixed(2)))}
              className="touch-feedback"
              style={{background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>
              <ZoomOut size={18} aria-hidden="true" />
            </button>
            <button aria-label="Restablecer zoom (doble toque para centrar)" title="Reset" onClick={()=> setZoom(1)}
              className="touch-feedback"
              style={{background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px 10px', minWidth:56, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>
              {Math.round(zoom*100)}%
            </button>
            <button aria-label="Ajustar vista al contenido" title="Ajustar al contenido" onClick={zoomToFit}
              className="touch-feedback"
              style={{background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>
              <Home size={18} aria-hidden="true" />
            </button>
            <button aria-label="Acercar vista (Zoom +)" title="Zoom +" onClick={()=> setZoom(z=> Math.min(ZMAX, +(z + ZSTEP).toFixed(2)))}
              className="touch-feedback"
              style={{background:'var(--primary)', color:'var(--on-primary)', border:'none', padding:'8px 10px', minWidth:40, minHeight:40, borderRadius:10, fontWeight:900, cursor:'pointer'}}>
              <ZoomIn size={18} aria-hidden="true" />
            </button>
            {/* Help / Cheat-sheet toggle */}
            <button aria-label="Atajos de teclado y gestos (H)" title="Atajos (H)" onClick={()=> setShowCheats(v=> !v)}
              className="touch-feedback"
              style={{background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'8px 10px', minWidth:36, minHeight:40, borderRadius:10, fontWeight:800, cursor:'pointer'}}>
              ?
            </button>
          </div>
        </div>

        {/* Quick input panel - bottom center */}
        <div className="eh-quick-input" style={{position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', zIndex:5}}>
          <form onSubmit={submitQuickInput} style={{display:'flex', gap:8, alignItems:'center', flexWrap: 'wrap', justifyContent: 'center'}}>
            <input
              value={quickInput}
              onChange={(e)=> setQuickInput(e.target.value.slice(0, MAX_TEXT))}
              placeholder="Añadir tarea rápida..."
              maxLength={MAX_TEXT}
              className="touch-feedback"
              style={{
                width: '280px', minWidth: '240px', maxWidth: '90vw', 
                padding:'12px 16px', borderRadius:12, border:'1px solid var(--surface-border)',
                background:'var(--surface)', color:'var(--surface-text)', outline:'none',
                backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
                boxShadow:'0 8px 24px rgba(0,0,0,.3)',
                fontSize: '16px', // Prevent zoom on iOS
                minHeight: '44px' // Touch-friendly minimum
              }}
            />
            <button type="submit" disabled={!quickInput.trim()}
              className="touch-feedback"
              style={{
                background: quickInput.trim() ? 'var(--primary)' : 'var(--btn-disabled-bg)',
                color: quickInput.trim() ? 'var(--on-primary)' : 'var(--btn-disabled-fg)',
                border: quickInput.trim() ? 'none' : '1px solid var(--btn-disabled-border)',
                padding:'12px 20px', borderRadius:12, fontWeight:700, cursor: quickInput.trim() ? 'pointer' : 'not-allowed',
                backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
                boxShadow: quickInput.trim() ? '0 8px 24px rgba(0,0,0,.3)' : 'none',
                minHeight: '44px', // Touch-friendly
                fontSize: '14px'
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

  {/* Cheat-sheet overlay */}
        {showCheats && (
          <div role="dialog" aria-label="Atajos de teclado y gestos táctiles" aria-modal="false"
            style={{position:'absolute', left:'50%', top:'50%', transform:'translate(-50%, -50%)', zIndex:8,
            background:'var(--panel-bg)', color:'var(--text)', border:'1px solid var(--panel-border)', borderRadius:12,
            padding:16, boxShadow:'0 20px 60px rgba(0,0,0,.35)', minWidth:320, maxHeight:'80vh', overflowY: 'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <strong>Atajos y Gestos</strong>
              <button onClick={()=> setShowCheats(false)} aria-label="Cerrar ayuda" className="touch-feedback"
                style={{background:'transparent', color:'var(--text)', border:'1px solid var(--panel-border)', borderRadius:8, padding:'4px 12px', cursor:'pointer', minHeight: '32px'}}>Cerrar</button>
            </div>
            
            <div style={{marginBottom: 16}}>
              <h4 style={{margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: 'var(--accent)'}}>⌨️ Atajos de Teclado</h4>
              <ul style={{margin:0, paddingLeft:16, lineHeight:1.6, fontSize:12}}>
                <li>N: Crear nota rápida</li>
                <li>E: Editar nota seleccionada</li>
                <li>Supr/Backspace: Borrar nota seleccionada</li>
                <li>Flechas: Mover nota seleccionada</li>
                <li>= / +: Zoom in</li>
                <li>-: Zoom out</li>
                <li>0: Ajustar al contenido</li>
                <li>H / ?: Mostrar/ocultar esta ayuda</li>
              </ul>
            </div>

            <div>
              <h4 style={{margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: 'var(--accent)'}}>👆 Gestos Táctiles</h4>
              <ul style={{margin:0, paddingLeft:16, lineHeight:1.6, fontSize:12}}>
                <li>🤏 <strong>Pellizcar:</strong> Hacer zoom in/out</li>
                <li>👆 <strong>Doble toque:</strong> Restablecer zoom y centrar</li>
                <li>⏱️ <strong>Mantener presionado:</strong> Crear nota nueva</li>
                <li>👋 <strong>Deslizar:</strong> Navegar entre vistas</li>
                <li>👆 <strong>Toque:</strong> Seleccionar y editar notas</li>
                <li>🔄 <strong>Arrastrar:</strong> Mover notas por la matriz</li>
              </ul>
            </div>
          </div>
        )}

        {/* Live region for screen readers */}
        <div data-testid="sr" aria-live="polite" aria-atomic="true" style={{position:'absolute', left:-9999, width:1, height:1, overflow:'hidden'}}>{srMsg || ' '}</div>
      </div>
    </div>
  )
})

EisenhowerPanel.displayName = 'EisenhowerPanel'

export default EisenhowerPanel
