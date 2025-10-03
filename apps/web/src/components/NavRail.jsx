import React from 'react'
import { Home, LayoutGrid, Globe2, Settings } from 'lucide-react'

/*
  Persistent navigation rail / bottom bar
  - Desktop: left rail
  - Mobile: bottom bar
  Accessibility:
  - role="navigation" with aria-label
  - Each button uses aria-current when selected
*/
export default function NavRail({ value, onChange }){
  const items = [
    { key: 'home', label: 'Inicio', icon: Home },
    { key: 'matrix', label: 'Matriz', icon: LayoutGrid },
    { key: 'map', label: 'Globo', icon: Globe2 },
    { key: 'settings', label: 'Ajustes', icon: Settings },
  ]
  return (
    <>
      {/* Desktop / large screens: lateral rail */}
      <nav aria-label="Navegación" style={{
        position:'fixed', left:'max(12px, env(safe-area-inset-left))', top:'50%', transform:'translateY(-50%)',
        zIndex: 20, display: 'none',
      }} className="nav-rail">
        <div style={{
          display:'flex', flexDirection:'column', gap:10,
          background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
          padding:10, borderRadius:14, boxShadow:'0 14px 40px rgba(0,0,0,.28)',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)'
        }}>
          {items.map(({ key, label, icon:Icon })=>{
            const active = value === key
            return (
              <button key={key} type="button"
                onClick={()=> onChange?.(key)}
                aria-current={active ? 'page' : undefined}
                title={label}
                style={{
                  display:'grid', placeItems:'center',
                  width:48, height:48, borderRadius:12, cursor:'pointer',
                  border:'1px solid ' + (active ? 'transparent' : 'var(--surface-border)'),
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'var(--on-primary)' : 'var(--text)'
                }}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="sr-only" style={{position:'absolute', left:-9999}}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Mobile: bottom bar */}
      <nav aria-label="Navegación" style={{
        position:'fixed', left:'max(8px, env(safe-area-inset-left))', right:'max(8px, env(safe-area-inset-right))',
        bottom:'max(8px, env(safe-area-inset-bottom))', zIndex:20, display:'flex'
      }} className="nav-bottom">
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8,
          background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
          padding:8, borderRadius:14, boxShadow:'0 14px 40px rgba(0,0,0,.28)',
          width:'100%', maxWidth:520, margin:'0 auto',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)'
        }}>
          {items.map(({ key, label, icon:Icon })=>{
            const active = value === key
            return (
              <button key={key} type="button"
                onClick={()=> onChange?.(key)}
                aria-current={active ? 'page' : undefined}
                title={label}
                style={{
                  display:'grid', placeItems:'center',
                  height:44, borderRadius:10, cursor:'pointer',
                  border:'1px solid ' + (active ? 'transparent' : 'var(--surface-border)'),
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'var(--on-primary)' : 'var(--text)'
                }}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="sr-only" style={{position:'absolute', left:-9999}}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <style>{`
        /* Show rail on >= 900px, bottom bar below */
        @media (min-width: 900px){
          .nav-rail{ display:block !important; }
          .nav-bottom{ display:none !important; }
        }
        @media (max-width: 899.98px){
          .nav-rail{ display:none !important; }
          .nav-bottom{ display:flex !important; }
        }
      `}</style>
    </>
  )
}
