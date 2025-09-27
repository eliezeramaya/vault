import React from 'react'

export default function Welcome({ onEnter, onDemo }){
  const wrap = {
    position:'absolute', inset:0, display:'grid', placeItems:'center',
    background:'radial-gradient(1200px 800px at 70% 20%, rgba(240,55,93,.08), transparent 60%), linear-gradient(180deg,#0a0a15 0%, #0a0f1f 100%)',
    color:'#EAEAEA', zIndex:20
  }
  const card = {
    width:'min(640px,90vw)', padding:'28px 28px 24px', borderRadius:16,
    background:'rgba(10,12,24,.65)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
    border:'1px solid rgba(255,255,255,.08)', boxShadow:'0 16px 48px rgba(0,0,0,.45)'
  }
  const logo = { display:'flex', alignItems:'center', gap:12, marginBottom:8 }
  const mark = {
    width:40, height:40, borderRadius:10, display:'grid', placeItems:'center',
    background:'conic-gradient(from 210deg, #0f2a4d, #f0375d 40%, #db2d50, #0f2a4d)'
  }
  const title = { fontSize:22, fontWeight:800, letterSpacing:.3 }
  const subtitle = { opacity:.85, lineHeight:1.5, marginTop:6, fontSize:14 }
  const ctas = { display:'flex', gap:12, marginTop:18, flexWrap:'wrap' }
  const primary = {
    background:'#F0375D', color:'#0a0a15', border:'none', padding:'12px 16px', borderRadius:10,
    fontWeight:700, cursor:'pointer'
  }
  const secondary = {
    background:'transparent', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.2)', padding:'12px 16px', borderRadius:10,
    fontWeight:600, cursor:'pointer'
  }
  const kbd = { padding:'2px 6px', borderRadius:6, border:'1px solid #2a3355', background:'#0a0f1f', fontSize:12 }

  return (
    <div style={wrap} role="dialog" aria-modal="true" aria-labelledby="wTitle">
      <div style={card}>
        <div style={logo}>
          <div style={mark}><span style={{fontWeight:900}}>IS</span></div>
          <div>
            <div id="wTitle" style={title}>Idea Sphere</div>
            <div style={{fontSize:13, opacity:.8}}>Globo interactivo con heatmap</div>
          </div>
        </div>
        <div style={subtitle}>
          Arrastra nodos en la esfera para reubicar ideas. Zoom y rotación con el ratón o trackpad.
          Consejo: usa <span style={kbd}>click</span> + arrastre para mover nodos y <span style={kbd}>wheel</span> para zoom.
        </div>
        <div style={ctas}>
          <button style={primary} onClick={onEnter} aria-label="Entrar a la Esfera">Entrar a la Esfera</button>
          <button style={secondary} onClick={onDemo} aria-label="Ver una demo rápida">Demo rápida 30s</button>
        </div>
      </div>
    </div>
  )
}
