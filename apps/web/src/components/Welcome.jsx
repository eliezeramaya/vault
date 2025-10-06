import React, { useEffect, useRef } from 'react'
// import CrystalButton from './CrystalButton'

export default function Welcome({ onEnterMatrix, onEnterMap, onClose }){
  // Wrapper centrado relativo
  const wrap = {
    position:'absolute', inset:0, display:'grid', placeItems:'center',
    background:'var(--bg-wrap)', color:'var(--text)', zIndex:20,
    padding:'48px 16px'
  }
  // Tarjeta (hero) con glass, borde y sombra mejorados
  const card = {
    width:'min(840px, 92vw)', padding:'40px 32px 28px', borderRadius:20,
    background:'var(--panel-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
    border:'1px solid var(--hero-border)', boxShadow:'var(--hero-shadow)'
  }
  const logo = { display:'flex', alignItems:'center', gap:12, marginBottom:12 }
  const mark = {
    width:40, height:40, borderRadius:12, display:'grid', placeItems:'center',
    background:'conic-gradient(from 210deg, #0f2a4d, #f0375d 40%, #db2d50, #0f2a4d)'
  }
  const title = { fontSize:32, fontWeight:900, letterSpacing:.2, margin:0 }
  const subtitle = { color:'var(--text-secondary)', lineHeight:1.6, marginTop:8, fontSize:16 }
  const bullets = { marginTop:12, display:'grid', gap:8, color:'var(--text-secondary)', fontSize:15, lineHeight:1.6 }
  const ctas = { display:'flex', gap:12, marginTop:22, flexWrap:'wrap' }
  // const demoRow = { display:'flex', gap:12, marginTop:16, alignItems:'center', flexWrap:'wrap' }
  const primary = {
    background:'var(--primary)', color:'var(--on-primary)', border:'none', padding:'12px 20px', minHeight:48, minWidth:48, borderRadius:12,
    fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:10
  }
  const secondary = {
    background:'transparent', color:'var(--text)', border:'1px solid var(--btn-border)', padding:'12px 20px', minHeight:48, minWidth:48, borderRadius:12,
    fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:10
  }
  const ghostLink = {
    background:'transparent', color:'var(--text-secondary)', border:'none', padding:'8px 8px', minHeight:36, borderRadius:8,
    fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, textDecoration:'underline 0.5px rgba(127,127,127,.35)'
  }
  const kbd = { padding:'2px 6px', borderRadius:6, border:'1px solid #2a3355', background:'#0a0f1f', fontSize:12 }

  const dialogRef = useRef(null)
  const lastFocusRef = useRef(null)
  useEffect(()=>{
    // Save previously focused element to restore on close
    lastFocusRef.current = document.activeElement
    const onKey = (e)=>{
      if (e.key === 'Escape' && onClose){ e.preventDefault(); onClose() }
      if (e.key === 'Tab'){
        const root = dialogRef.current
        if (!root) return
        const focusables = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length-1]
        if (e.shiftKey){
          if (document.activeElement === first){ e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last){ e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return ()=>{
      document.removeEventListener('keydown', onKey)
      // Restore focus to the previously focused trigger if present
      const el = lastFocusRef.current
      if (el && typeof el.focus === 'function') setTimeout(()=> el.focus(), 0)
    }
  }, [onClose])

  return (
    <div style={wrap} role="dialog" aria-modal="true" aria-labelledby="wTitle" aria-describedby="wDesc">
      <div style={card} ref={dialogRef}>
        <div style={logo}>
          <div style={mark} aria-hidden="true"><span style={{fontWeight:900}}>IS</span></div>
          <div>
            <h1 id="wTitle" style={title}>Idea Map</h1>
            <div style={{fontSize:15, color:'var(--text-secondary)'}}>Mapa interactivo y Matriz de Eisenhower con efecto glass</div>
          </div>
        </div>
        <div id="wDesc" style={subtitle}>
          Elige cómo empezar:
          <div style={bullets}>
            <div>• <strong>Matriz de Eisenhower</strong> para priorizar (urgente/importante) sobre una cuadrícula glass.</div>
            <div>• <strong>Mapa interactivo</strong> con heatmap para organizar ideas y conexiones.</div>
          </div>
          <div style={{marginTop:12}}>
            Consejo en el Mapa: usa <span style={kbd}>clic</span> + arrastre para mover nodos y <span style={kbd}>rueda</span> para zoom.
          </div>
        </div>
        <div style={ctas}>
          <button type="button" style={primary} onClick={onEnterMap} aria-label="Entrar al Mapa">
            <span aria-hidden>🗺️</span> Entrar al Mapa
          </button>
          <button type="button" style={secondary} onClick={onEnterMatrix} aria-label="Entrar a la Matriz">
            <span aria-hidden>🔲</span> Entrar a la Matriz
          </button>
          {onClose && (
            <button type="button" style={ghostLink} onClick={onClose} aria-label="Cerrar diálogo">Cerrar</button>
          )}
        </div>
        {/* Sección 'Idea visual' eliminada a petición */}
      </div>
    </div>
  )
}
