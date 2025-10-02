import React, { useEffect, useRef, useState } from 'react'

export default function AddIslandSheet({ open, onClose, onCreate }){
  const [title, setTitle] = useState('Nueva idea')
  const [emoji, setEmoji] = useState('🌱')
  const [zone, setZone] = useState('Américas')
  const sheetRef = useRef(null)

  useEffect(()=>{
    if (open) {
      requestAnimationFrame(()=> sheetRef.current?.focus?.())
    }
  },[open])
  useEffect(()=>{
    if (!open) return
    const onKey = (e)=>{ if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  },[open,onClose])

  if (!open) return null

  const overlay = {
    position:'absolute', inset:0, zIndex:50,
    background:'rgba(0,0,0,.25)', backdropFilter:'blur(2px)' , WebkitBackdropFilter:'blur(2px)'
  }
  const sheet = {
    position:'absolute', left:'max(12px, env(safe-area-inset-left))', right:'max(12px, env(safe-area-inset-right))',
    bottom:'max(12px, env(safe-area-inset-bottom))', borderRadius:16,
    background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)',
    boxShadow:'0 12px 40px rgba(0,0,0,.45)', padding:'14px', fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  }
  const row = { display:'grid', gap:10, marginBottom:10 }
  const label = { fontSize:12, opacity:.9 }
  const input = { width:'100%', padding:'12px', borderRadius:10, border:'1px solid var(--surface-border)', background:'var(--surface)', color:'var(--surface-text)' }
  const actions = { display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }
  const btn = (primary)=> ({ padding:'12px 16px', minWidth:44, minHeight:44, borderRadius:10, cursor:'pointer', border: primary?'none':'1px solid var(--surface-border)', background: primary?'var(--primary)':'transparent', color: primary?'var(--on-primary)':'var(--surface-text)', fontWeight:700 })

  const zones = ['Américas','Europa/África','Asia/Oceanía','Pacífico','Atlántico Sur']

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="addTitle">
      <div ref={sheetRef} tabIndex={-1} style={sheet}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <div id="addTitle" style={{fontWeight:800, letterSpacing:.3}}>Crear isla</div>
          <button type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{minWidth:44, minHeight:44, padding:'10px 12px', borderRadius:10, border:'1px solid var(--surface-border)', background:'transparent', color:'var(--surface-text)', cursor:'pointer'}}>✕</button>
        </div>
        <div style={row}>
          <label style={label} htmlFor="islaTitle">Título</label>
          <input id="islaTitle" style={input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Salud, Finanzas…" />
        </div>
        <div style={row}>
          <label style={label} htmlFor="islaEmoji">Emoji</label>
          <input id="islaEmoji" style={input} value={emoji} onChange={e=>setEmoji(e.target.value)} placeholder="🌱" />
        </div>
        <div style={row}>
          <label style={label} htmlFor="islaZone">Zona</label>
          <select id="islaZone" style={{...input, padding:'12px 10px'}} value={zone} onChange={e=>setZone(e.target.value)}>
            {zones.map(z=> <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div style={actions}>
          <button type="button" style={btn(false)} onClick={onClose}>Cancelar</button>
          <button type="button" style={btn(true)} onClick={()=>{ onCreate({ title, emoji, zone }); onClose(); }}>Crear</button>
        </div>
      </div>
    </div>
  )
}
