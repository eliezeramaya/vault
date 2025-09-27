import React from 'react'

export default function Preloader({ progress = 0, visible = true }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)))

  // Simple microcopy based on progress ranges
  const message =
    pct < 10 ? 'Inicializando motor 3D…' :
    pct < 25 ? 'Preparando shaders y GPU…' :
    pct < 45 ? 'Generando geometrías y luz…' :
    pct < 65 ? 'Calculando heatmap inicial…' :
    pct < 85 ? 'Optimizando para tu dispositivo…' :
    pct < 100 ? 'Últimos detalles…' :
    '¡Listo!'

  const overlay = {
    position:'absolute', inset:0, zIndex:40,
    display:'grid', placeItems:'center',
    background:'radial-gradient(1000px 700px at 65% 15%, rgba(240,55,93,.06), transparent 60%), rgba(8,10,20,.78)',
    backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
    transition:'opacity 280ms ease',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none'
  }
  const card = {
    width:'min(520px,92vw)', borderRadius:16,
    border:'1px solid rgba(255,255,255,.1)',
    background:'linear-gradient(180deg, rgba(18,20,36,.85), rgba(10,12,24,.85))',
    boxShadow:'0 24px 80px rgba(0,0,0,.5)',
    padding:'18px 18px 14px', color:'#EAEAEA',
    fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  }
  const title = { fontSize:14, letterSpacing:.3, fontWeight:800, marginBottom:10, opacity:.95 }
  const track = { width:'100%', height:10, background:'rgba(255,255,255,.08)', borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,.08)' }
  const fill = { width:`${pct}%`, height:'100%', background:'linear-gradient(90deg, #6aa7ff, #F0375D)', boxShadow:'0 0 24px rgba(240,55,93,.45)', transition:'width 220ms ease' }
  const labels = { display:'flex', justifyContent:'space-between', fontSize:12, marginTop:8, opacity:.9 }

  return (
    <div style={overlay} role="status" aria-live="polite" aria-label={`Cargando escena • ${pct}%`}>
      <div style={card}>
        <div style={title}>Cargando Esfera</div>
        <div style={track} aria-hidden="true"><div style={fill} /></div>
        <div style={labels}>
          <span>{message}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  )
}
