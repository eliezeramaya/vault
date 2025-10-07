import React from 'react'
import { ChevronsLeft, ChevronsRight, Home, Map, Grid3X3, Timer, Settings, BarChart3 } from 'lucide-react'

const itemBase = {
  display:'flex', alignItems:'center', gap:10,
  width:'100%', padding:'10px 12px',
  background:'transparent', border:'1px solid transparent', color:'var(--text)',
  borderRadius:10, cursor:'pointer', fontWeight:800
}

export default function Sidebar({ open, onToggle, currentView, onSelect }){
  const items = [
    { key:'home', label:'Inicio', icon: Home },
    { key:'matrix', label:'Matriz', icon: Grid3X3 },
    { key:'map', label:'Mapa', icon: Map },
    { key:'pomodoro', label:'Pomodoro', icon: Timer },
    { key:'scorecard', label:'Scorecard', icon: BarChart3 },
    { key:'settings', label:'Ajustes', icon: Settings },
  ]

  const width = open ? 240 : 76

  return (
    <aside
      aria-label="Barra lateral"
      data-open={open}
      style={{
        position:'fixed', left:'max(10px, env(safe-area-inset-left))', top:'max(10px, env(safe-area-inset-top))', bottom:'max(10px, env(safe-area-inset-bottom))',
        width, display:'flex', flexDirection:'column',
        background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
        borderRadius:16, boxShadow:'0 18px 48px rgba(0,0,0,.32)',
        backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
        zIndex: 22, overflow:'hidden', transition:'width .18s ease'
      }}
    >
      {/* Top brand + toggle */}
      <div style={{display:'flex', alignItems:'center', gap:10, padding:10, paddingBottom:8}}>
        <div aria-hidden="true" style={{
          width:34, height:34, borderRadius:10, display:'grid', placeItems:'center',
          background:'conic-gradient(from 210deg, #0f2a4d, #f0375d 40%, #db2d50, #0f2a4d)',
          fontWeight:900, color:'#fff'
        }}>IS</div>
        {open && <div style={{fontWeight:900, letterSpacing:.3}}>Idea Sphere</div>}
        <button
          aria-label={open ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
          aria-expanded={open}
          onClick={onToggle}
          style={{
            marginLeft:'auto', background:'transparent', color:'var(--text)',
            border:'1px solid var(--surface-border)', borderRadius:10,
            padding:'6px 8px', cursor:'pointer'
          }}
        >
          {open ? <ChevronsLeft size={18} aria-hidden /> : <ChevronsRight size={18} aria-hidden />}
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Funciones" style={{display:'flex', flexDirection:'column', gap:6, padding:10}}>
        {items.map(({ key, label, icon:Icon })=>{
          const active = currentView === key
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={()=> onSelect?.(key)}
              style={{
                ...itemBase,
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--on-primary)' : 'var(--text)',
                borderColor: active ? 'var(--primary)' : 'transparent'
              }}
            >
              <Icon size={18} aria-hidden />
              {open && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div style={{flex:1}} />

      {/* Footer area (optional) */}
      <div style={{padding:10, paddingTop:0, opacity:.75, fontSize:12}} aria-hidden>
        {open ? 'v0.2.0' : ' '}
      </div>
    </aside>
  )
}
