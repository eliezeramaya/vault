import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X, Save } from 'lucide-react'

export default function EditIslandSheet({ open, node, onClose, onSave, onConnect, onDuplicate, onDelete, onFocus }){
  const [title, setTitle] = useState(node?.id || '')
  const [zone, setZone] = useState('')
  const [priority, setPriority] = useState(node?.priority ?? 5)
  const sheetRef = useRef(null)

  useEffect(()=>{ setTitle(node?.id || ''); setPriority(node?.priority ?? 5) }, [node])
  useEffect(()=>{
    if (open) requestAnimationFrame(()=> sheetRef.current?.focus?.())
  },[open])
  useEffect(()=>{
    if (!open) return
    const onKey = (e)=>{ if (e.key === 'Escape') onClose?.() }
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
  const actions = { display:'flex', gap:12, justifyContent:'space-between', marginTop:8, alignItems:'center' }
  const btn = (primary)=> ({ padding:'12px 16px', minWidth:44, minHeight:44, borderRadius:10, cursor:'pointer', border: primary?'none':'1px solid var(--surface-border)', background: primary?'var(--primary)':'transparent', color: primary?'var(--on-primary)':'var(--surface-text)', fontWeight:700 })

  const zones = ['','Américas','Europa/África','Asia/Oceanía','Pacífico','Atlántico Sur']

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="editTitle">
      <div ref={sheetRef} tabIndex={-1} style={sheet}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <div id="editTitle" style={{fontWeight:800, letterSpacing:.3}}>Editar isla</div>
          <button type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{minWidth:44, minHeight:44, padding:'10px 12px', borderRadius:10, border:'1px solid var(--surface-border)', background:'transparent', color:'var(--surface-text)', cursor:'pointer'}}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div style={row}>
          <label style={label} htmlFor="editTitleInput">Título</label>
          <input id="editTitleInput" style={input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" />
        </div>
        <div style={row}>
          <label style={label} htmlFor="editZone">Zona (opcional)</label>
          <select id="editZone" style={{...input, padding:'12px 10px'}} value={zone} onChange={e=>setZone(e.target.value)}>
            {zones.map(z=> <option key={z || 'none'} value={z}>{z || '— mantener posición —'}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={label} htmlFor="editPriority">Prioridad: {priority}</label>
          <input id="editPriority" style={{...input}} type="range" min={1} max={10} step={1} value={priority} onChange={e=> setPriority(parseInt(e.target.value,10))} />
        </div>
        <div style={actions}>
          <div style={{display:'flex', gap:10}}>
            <button type="button" style={btn(false)} onClick={onConnect}>Conectar</button>
            <button type="button" style={btn(false)} onClick={onDuplicate}>Duplicar</button>
            <button type="button" style={btn(false)} onClick={onDelete}>Eliminar</button>
            <button type="button" style={btn(false)} onClick={onFocus}>Foco</button>
          </div>
          <div style={{display:'flex', gap:12}}>
            <button type="button" style={btn(false)} onClick={onClose} aria-label="Cancelar" title="Cancelar">
              <X size={18} aria-hidden="true" />
            </button>
            <button type="button" style={btn(true)} onClick={()=> onSave?.({ title, zone: zone || undefined, priority })} aria-label="Guardar" title="Guardar">
              <Save size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
