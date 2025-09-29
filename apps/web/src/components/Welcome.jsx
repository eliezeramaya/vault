import React from 'react'
import CrystalButton from './CrystalButton'

export default function Welcome({ onEnterMatrix, onEnterMap, onDemo }){
  const wrap = {
    position:'absolute', inset:0, display:'grid', placeItems:'center',
    background:'var(--bg-wrap)',
    color:'var(--text)', zIndex:20
  }
  const card = {
    width:'min(640px,90vw)', padding:'28px 28px 24px', borderRadius:16,
    background:'var(--panel-bg)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
    border:'1px solid var(--panel-border)', boxShadow:'0 16px 48px rgba(0,0,0,.20)'
  }
  const logo = { display:'flex', alignItems:'center', gap:12, marginBottom:8 }
  const mark = {
    width:40, height:40, borderRadius:10, display:'grid', placeItems:'center',
    background:'conic-gradient(from 210deg, #0f2a4d, #f0375d 40%, #db2d50, #0f2a4d)'
  }
  const title = { fontSize:22, fontWeight:800, letterSpacing:.3 }
  const subtitle = { opacity:.85, lineHeight:1.5, marginTop:6, fontSize:14 }
  const ctas = { display:'flex', gap:12, marginTop:18, flexWrap:'wrap' }
  const demoRow = { display:'flex', gap:12, marginTop:14, alignItems:'center', flexWrap:'wrap' }
  const primary = {
    background:'#F0375D', color:'#0a0a15', border:'none', padding:'12px 16px', minHeight:44, minWidth:44, borderRadius:10,
    fontWeight:700, cursor:'pointer'
  }
  const secondary = {
    background:'transparent', color:'var(--text)', border:'1px solid rgba(127,127,127,.25)', padding:'12px 16px', minHeight:44, minWidth:44, borderRadius:10,
    fontWeight:600, cursor:'pointer'
  }
  const kbd = { padding:'2px 6px', borderRadius:6, border:'1px solid #2a3355', background:'#0a0f1f', fontSize:12 }

  return (
    <div style={wrap} role="dialog" aria-modal="true" aria-labelledby="wTitle" aria-describedby="wDesc">
      <div style={card}>
        <div style={logo}>
          <div style={mark} aria-hidden="true"><span style={{fontWeight:900}}>IS</span></div>
          <div>
            <h1 id="wTitle" style={title}>Idea Map</h1>
            <div style={{fontSize:13, opacity:.8}}>Mapa interactivo y Matriz de Eisenhower con efecto glass</div>
          </div>
        </div>
        <div id="wDesc" style={subtitle}>
          Elige cómo empezar:
          
          • Matriz de Eisenhower para priorizar (urgente/importante) sobre una cuadrícula glass de 96×96 celdas.
          
          • Mapa interactivo con heatmap para organizar ideas y conexiones.
          
          Consejo en el Mapa: usa <span style={kbd}>clic</span> + arrastre para mover nodos y <span style={kbd}>rueda</span> para zoom.
        </div>
        <div style={ctas}>
          <button type="button" style={primary} onClick={onEnterMatrix} aria-label="Entrar a la Matriz" autoFocus>Entrar a la Matriz</button>
          <button type="button" style={secondary} onClick={onEnterMap} aria-label="Entrar al Mapa">Entrar al Mapa</button>
          <button type="button" style={secondary} onClick={onDemo} aria-label="Ver una demo rápida">Demo rápida 30s</button>
        </div>
        <div style={demoRow}>
          <div style={{opacity:.7, fontSize:12}}>Idea visual:</div>
          <CrystalButton aria-label="Botón cristal demo">CRYSTAL</CrystalButton>
        </div>
      </div>
    </div>
  )
}
