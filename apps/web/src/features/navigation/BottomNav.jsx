import React from 'react'
import { Home as HomeIcon, Map as MapIcon, Grid3X3, Timer as TimerIcon, Settings as SettingsIcon } from 'lucide-react'

export default function BottomNav({ view, onSelect }) {
  return (
    <nav className="nav-bottom" aria-label="Navegación" style={{
      position:'fixed', left:12, right:12, bottom:12, height:64,
      display:'flex', justifyContent:'space-around', alignItems:'center', gap:8,
      background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
      borderRadius:14, boxShadow:'0 12px 36px rgba(0,0,0,.22)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      zIndex:24, pointerEvents:'auto'
    }}>
      <button type="button" aria-label="Inicio" onClick={()=> onSelect('home')} style={{ background:'transparent', border:'none', color: view==='home' ? 'var(--primary)' : 'var(--text)', padding:8, borderRadius:10 }}>
        <HomeIcon size={22} aria-hidden />
      </button>
      <button type="button" aria-label="Matriz" onClick={()=> onSelect('matrix')} style={{ background:'transparent', border:'none', color: view==='matrix' ? 'var(--primary)' : 'var(--text)', padding:8, borderRadius:10 }}>
        <Grid3X3 size={22} aria-hidden />
      </button>
      <button type="button" aria-label="Mapa" onClick={()=> onSelect('map')} style={{ background:'transparent', border:'none', color: view==='map' ? 'var(--primary)' : 'var(--text)', padding:8, borderRadius:10 }}>
        <MapIcon size={22} aria-hidden />
      </button>
      <button type="button" aria-label="Pomodoro" onClick={()=> onSelect('pomodoro')} style={{ background:'transparent', border:'none', color: view==='pomodoro' ? 'var(--primary)' : 'var(--text)', padding:8, borderRadius:10 }}>
        <TimerIcon size={22} aria-hidden />
      </button>
      <button type="button" aria-label="Ajustes" onClick={()=> onSelect('settings')} style={{ background:'transparent', border:'none', color: view==='settings' ? 'var(--primary)' : 'var(--text)', padding:8, borderRadius:10 }}>
        <SettingsIcon size={22} aria-hidden />
      </button>
    </nav>
  )
}
