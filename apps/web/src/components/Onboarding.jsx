import React, { useEffect, useRef } from 'react'

export default function Onboarding({ open, onClose }){
  const [step, setStep] = React.useState(0)
  const wrapRef = useRef(null)
  useEffect(()=>{
    if(!open) return
    // Reset to first step and focus dialog when opened
    setStep(0)
    requestAnimationFrame(()=>{
      wrapRef.current?.focus?.()
    })
    const onKey = (e)=>{
      if(e.key==='Escape') onClose()
      if(e.key==='ArrowRight') setStep(s=>Math.min(2, s+1))
      if(e.key==='ArrowLeft') setStep(s=>Math.max(0, s-1))
    }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  },[open,onClose])

  if(!open) return null

  const steps = [
    {
      title: '1/3 • Rotar y zoom',
  desc: 'Arrastra con un dedo o el ratón para mover el mapa. Usa la rueda o pinza para acercar/alejar.',
  hint: 'Consejo: navega por el mapa con pan y zoom para explorar tus ideas.'
    },
    {
      title: '2/3 • Crear isla',
  desc: 'Haz doble clic sobre el mapa para crear una isla. Luego arrástrala para reubicarla.',
      hint: 'Las islas representan ideas; su prioridad ajusta su influencia en el heatmap.'
    },
    {
      title: '3/3 • Conectar ideas y ver heatmap',
      desc: 'Las conexiones entre islas muestran relaciones. El heatmap se actualiza automáticamente al mover o crear islas.',
      hint: 'Ajusta Opacidad, Sigma y Radio en el HUD para resaltar patrones.'
    }
  ]

  const overlay = {
    position:'absolute', inset:0, zIndex:30,
    background:'radial-gradient(1200px 800px at 60% 10%, rgba(240,55,93,.06), transparent 55%), rgba(10,11,20,.62)',
    backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', color:'#EAEAEA',
    display:'grid', placeItems:'center'
  }
  const card = {
    width:'min(680px,94vw)', borderRadius:16, border:'1px solid rgba(255,255,255,.1)',
    background:'linear-gradient(180deg, rgba(18,20,36,.85), rgba(10,12,24,.85))',
    boxShadow:'0 24px 80px rgba(0,0,0,.5)', padding:'22px 22px 16px'
  }
  const title = { fontSize:18, fontWeight:800, letterSpacing:.3, marginBottom:6 }
  const desc = { fontSize:14, opacity:.92, lineHeight:1.6 }
  const hint = { fontSize:12, opacity:.75, marginTop:8 }
  const bar = { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }
  const dots = { display:'flex', gap:8 }
  const dot = (i)=>({ width:10, height:10, borderRadius:20, background: i===step? 'var(--primary)' : 'rgba(255,255,255,.25)', boxShadow: i===step? '0 0 16px rgba(240,55,93,.5)': 'none' })
  const btn = (primary)=>({
    background: primary? 'var(--primary)' : 'transparent', color: primary? 'var(--on-primary)' : '#EAEAEA',
    border: primary? 'none' : '1px solid rgba(255,255,255,.25)', padding:'10px 14px', borderRadius:10, fontWeight:700, cursor:'pointer'
  })

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="obTitle" ref={wrapRef} tabIndex={-1}>
      <div style={card}>
        <div id="obTitle" style={title}>{steps[step].title}</div>
        <div style={desc}>{steps[step].desc}</div>
        <div style={hint}>{steps[step].hint}</div>
        <div style={bar}>
          <div style={dots} aria-label={`Paso ${step+1} de 3`}>
            {[0,1,2].map(i=> <div key={i} style={dot(i)} aria-hidden="true" />)}
          </div>
          <div style={{display:'flex', gap:8}}>
            <button type="button" style={btn(false)} onClick={onClose} aria-label="Omitir">Omitir</button>
            {step>0 && <button type="button" style={btn(false)} onClick={()=>setStep(s=>s-1)} aria-label="Anterior">Anterior</button>}
            {step<2 ? (
              <button type="button" style={btn(true)} onClick={()=>setStep(s=>s+1)} aria-label="Siguiente">Siguiente</button>
            ) : (
              <button type="button" style={btn(true)} onClick={onClose} aria-label="Hecho">Hecho</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
