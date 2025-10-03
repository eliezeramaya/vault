import React, { useEffect, useRef, useState } from 'react'
import { Sun, Moon, HelpCircle, MoreHorizontal } from 'lucide-react'
import Globe from './components/Globe'
import EisenhowerPanel from './components/EisenhowerPanel'
import Welcome from './components/Welcome'
import Onboarding from './components/Onboarding'
import Preloader from './components/Preloader'
import AddIslandSheet from './components/AddIslandSheet'
import NavRail from './components/NavRail'
import HomePanel from './components/HomePanel'
import SettingsPanel from './components/SettingsPanel'

export default function App(){
  const [theme, setTheme] = useState('dark') // 'dark' | 'light'
  const [showWelcome, setShowWelcome] = useState(true)
  const [demoLeft, setDemoLeft] = useState(0)
  const demoTimer = useRef(null)
  const [showOb, setShowOb] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const globeApiRef = useRef(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [view, setView] = useState('map') // 'home' | 'map' | 'matrix' | 'settings'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)

  useEffect(()=>{
    return ()=> { if (demoTimer.current) clearInterval(demoTimer.current) }
  },[])

  // Load preferred theme from localStorage or system, then apply to <html data-theme>
  useEffect(()=>{
    try{
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark'){
        setTheme(saved)
        document.documentElement.setAttribute('data-theme', saved)
        return
      }
    }catch{}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = prefersDark ? 'dark' : 'light'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  },[])

  // Load initial view from localStorage (persist selected tab)
  useEffect(()=>{
    try{
      const savedView = localStorage.getItem('view')
      if (savedView === 'map' || savedView === 'matrix' || savedView === 'home' || savedView === 'settings') setView(savedView)
    }catch{}
  },[])

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    try{ localStorage.setItem('theme', theme) }catch{}
  },[theme])

  // Global keyboard shortcut: open help/shortcuts with H or ?
  useEffect(()=>{
    const onKeyDown = (e)=>{
      if (e.defaultPrevented) return
      const el = e.target
      const tag = (el && el.tagName ? el.tagName : '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || (el && el.isContentEditable)
      if (typing) return
      const isHelp = e.key === 'h' || e.key === 'H' || e.key === '?' || (e.key === '/' && e.shiftKey)
      if (isHelp){ e.preventDefault(); setShowOb(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return ()=> window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Persist view selection
  useEffect(()=>{
    try{ localStorage.setItem('view', view) }catch{}
  },[view])

  // Simulate perceived loading progression up to 95% until Globe signals ready
  useEffect(()=>{
    if (!loading) return
    let pct = 0
    setLoadPct(0)
    const id = setInterval(()=>{
      // Ease-out increment: larger first, smaller near the end
      const increment = Math.max(0.5, 6 * Math.exp(-pct/22))
      pct = Math.min(95, pct + increment)
      setLoadPct(Math.round(pct))
    }, 80)
    return ()=> clearInterval(id)
  },[loading])

  // Failsafe: if Globe never signals ready (e.g., no WebGL / slow devices), finish loader after a timeout
  useEffect(()=>{
    if (!loading) return
    const FAILSAFE_MS = 12000
    const t = setTimeout(()=>{
      // If still loading after the timeout, complete and hide the loader
      setLoadPct(100)
      setTimeout(()=> setLoading(false), 280)
    }, FAILSAFE_MS)
    return ()=> clearTimeout(t)
  }, [loading])

  const handleGlobeReady = ()=>{
    // Finish to 100% and hide loader shortly after for a short fade
    setLoadPct(100)
    setTimeout(()=> setLoading(false), 280)
  }

  const startDemo = ()=>{
    setShowWelcome(false)
    setDemoLeft(30)
    if (demoTimer.current) clearInterval(demoTimer.current)
    demoTimer.current = setInterval(()=>{
      setDemoLeft((t)=>{
        if (t<=1){ clearInterval(demoTimer.current); return 0 }
        return t-1
      })
    },1000)
  }

  // Close menu on outside click or Esc
  useEffect(()=>{
    if (!menuOpen) return
    const onDocDown = (e)=>{
      const m = menuRef.current
      const b = menuBtnRef.current
      if (!m || !b) return
      if (!m.contains(e.target) && !b.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e)=>{ if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return ()=>{
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="app" style={{position:'relative'}}>
      {/* Persistent Navigation Rail / Bottom Bar */}
      <NavRail value={view} onChange={setView} />

      {/* Global theme hints */}
      <style>{`
        :root { color-scheme: light dark; }
        :root[data-theme='dark'] { color-scheme: dark; }
        :root[data-theme='light'] { color-scheme: light; }

        :root[data-theme='dark']{
          /* Neutrals */
          --bg: #0A0C18;
          --bg-wrap: var(--bg);
          --text: #EAEAEA;
          --panel-bg: rgba(255,255,255,0.06);
          --panel-border: rgba(255,255,255,0.14);
          --note-border: rgba(255,255,255,.4);
          --note-bg: transparent;
          --composer-bg: rgba(10,12,24,0.75);
          --composer-text: #EAEAEA;
          --axis-rgb: 255,255,255;
          --grid-minor: rgba(255,255,255,.06);
          --grid-medium: rgba(255,255,255,.13);
          --grid-major: rgba(255,255,255,.16);
          --keepout: rgba(240,55,93,.08);
          /* Standardized aliases */
          --surface: var(--panel-bg);
          --surface-border: var(--panel-border);
          --surface-text: var(--text);
          /* Accent */
          --primary: #F0375D;
          --primary-hover: #FF5C7A;
          --primary-pressed: #D22E51;
          --on-primary: #12131A;
          --focus: #8AB4FF;
          /* Accent aliases */
          --accent: var(--primary);
          --accent-hover: var(--primary-hover);
          --accent-pressed: var(--primary-pressed);
          --on-accent: var(--on-primary);
          --focus-ring: var(--focus);
          /* State */
          --success: #1DB954;
          --warning: #FFB020;
          --danger:  #F44336;
          /* State aliases */
          --ok: var(--success);
          --btn-border: rgba(127,127,127,.25);
          --btn-border-hover: rgba(255,255,255,.35);
          --btn-border-active: rgba(255,255,255,.5);
          --elev-hover: 0 6px 18px rgba(0,0,0,.28);
          --elev-active: 0 3px 10px rgba(0,0,0,.36);
          /* Elevation aliases */
          --elevation-0: none;
          --elevation-1: var(--elev-hover);
          --elevation-2: var(--elev-active);
          /* Accessibility tokens */
          --placeholder: rgba(234,234,234,.72);
          --btn-disabled-bg: #2a2f3a;
          --btn-disabled-fg: #cfd6e3;
          --btn-disabled-border: #3d4352;
        }
        :root[data-theme='light']{
          /* Neutrals */
          --bg: #F7F8FB;
          --bg-wrap: var(--bg);
          --text: #12131A;
          --panel-bg: rgba(10,12,24,0.06);
          --panel-border: rgba(0,0,0,0.12);
          --note-border: rgba(0,0,0,.25);
          --note-bg: transparent;
          --composer-bg: rgba(255,255,255,0.85);
          --composer-text: #12131A;
          --axis-rgb: 0,0,0;
          --grid-minor: rgba(0,0,0,.06);
          --grid-medium: rgba(0,0,0,.12);
          --grid-major: rgba(0,0,0,.16);
          --keepout: rgba(240,55,93,.10);
          /* Standardized aliases */
          --surface: var(--panel-bg);
          --surface-border: var(--panel-border);
          --surface-text: var(--text);
          /* Accent */
          --primary: #F0375D;
          --primary-hover: #FF5C7A;
          --primary-pressed: #D22E51;
          --on-primary: #12131A;
          --focus: #A1C3FF;
          /* Accent aliases */
          --accent: var(--primary);
          --accent-hover: var(--primary-hover);
          --accent-pressed: var(--primary-pressed);
          --on-accent: var(--on-primary);
          --focus-ring: var(--focus);
          /* State */
          --success: #1DB954;
          --warning: #FFB020;
          --danger:  #F44336;
          /* State aliases */
          --ok: var(--success);
          --btn-border: rgba(127,127,127,.25);
          --btn-border-hover: rgba(0,0,0,.18);
          --btn-border-active: rgba(0,0,0,.24);
          --elev-hover: 0 6px 18px rgba(0,0,0,.14);
          --elev-active: 0 3px 10px rgba(0,0,0,.20);
          /* Elevation aliases */
          --elevation-0: none;
          --elevation-1: var(--elev-hover);
          --elevation-2: var(--elev-active);
          /* Accessibility tokens */
          --placeholder: rgba(18,19,26,.55);
          --btn-disabled-bg: #e6e8ef;
          --btn-disabled-fg: #4a5263;
          --btn-disabled-border: #c9ceda;
        }

        /* Skip link for keyboard users */
        .skip-link { position:absolute; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden; }
        .skip-link:focus { left: max(10px, env(safe-area-inset-left)); top: max(10px, env(safe-area-inset-top)); width:auto; height:auto; padding:8px 12px; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius:8px; color: var(--text); z-index: 200; }

        /* Global interactive states (consistent across themes using tokens) */
        button, [role='tab'], input, select, textarea, a {
          transition: box-shadow .15s ease, border-color .15s ease, background-color .15s ease, transform .06s ease;
        }
        button:hover, [role='tab']:hover, a:hover {
          box-shadow: var(--elevation-1) !important;
          border-color: var(--btn-border-hover) !important;
        }
        button:active, [role='tab']:active, a:active {
          box-shadow: var(--elevation-2) !important;
          border-color: var(--btn-border-active) !important;
          transform: translateY(1px);
        }
        button:focus-visible, [role='tab']:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        /* Inputs and placeholders */
        input::placeholder, textarea::placeholder { color: var(--placeholder); opacity: 1; }

        /* Disabled buttons: avoid opacity-only; use explicit colors for contrast */
        button:disabled,
        button[aria-disabled='true']{
          background: var(--btn-disabled-bg) !important;
          color: var(--btn-disabled-fg) !important;
          border-color: var(--btn-disabled-border) !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
          transform: none !important;
        }
      `}</style>
      {/* Global SVG filters for visual effects (e.g., crystal-btn distortion) */}
      <svg width="0" height="0" style={{position:'absolute'}} aria-hidden focusable="false">
        <filter id="distorsion">
          <feTurbulence type="turbulence" baseFrequency="0.012" numOctaves="3" seed="7" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>

      {/* Top navigation bar (kept for brand and quick actions) */}
      {/* Skip link */}
      <a href="#main" className="skip-link">Saltar al contenido</a>

      <header role="banner" style={{
        position:'absolute', top:'max(10px, env(safe-area-inset-top))', left:'max(10px, env(safe-area-inset-left))', right:'max(10px, env(safe-area-inset-right))',
        zIndex:18,
        pointerEvents:'none'
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
          padding:'10px 12px', borderRadius:12,
          boxShadow:'0 12px 36px rgba(0,0,0,.22)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
          pointerEvents:'auto'
        }}>
          {/* Logo */}
          <div aria-hidden="true" style={{
            width:28, height:28, borderRadius:8, display:'grid', placeItems:'center',
            background:'conic-gradient(from 210deg, #0f2a4d, #f0375d 40%, #db2d50, #0f2a4d)',
            fontWeight:900
          }}>IS</div>
          <div style={{fontWeight:800, letterSpacing:.3}}>Idea Sphere</div>

          {/* Tabs */}
          <nav role="tablist" aria-label="Vistas" style={{display:'flex', gap:6, marginLeft:16}}>
            <button
              id="tab-home"
              role="tab"
              aria-selected={view==='home'}
              aria-controls="panel-home"
              onClick={()=> setView('home')}
              style={{
                background: view==='home' ? 'var(--primary)' : 'transparent',
                color: view==='home' ? 'var(--on-primary)' : 'var(--text)',
                border:'1px solid var(--surface-border)', borderRadius:10,
                padding:'8px 12px', minHeight:36, minWidth:44, fontWeight:700, cursor:'pointer'
              }}
            >Inicio</button>
            <button
              id="tab-map"
              role="tab"
              aria-selected={view==='map'}
              aria-controls="panel-map"
              onClick={()=> setView('map')}
              style={{
                background: view==='map' ? 'var(--primary)' : 'transparent',
                color: view==='map' ? 'var(--on-primary)' : 'var(--text)',
                border:'1px solid var(--surface-border)', borderRadius:10,
                padding:'8px 12px', minHeight:36, minWidth:44, fontWeight:700, cursor:'pointer'
              }}
            >Mapa</button>
            <button
              id="tab-matrix"
              role="tab"
              aria-selected={view==='matrix'}
              aria-controls="panel-matrix"
              onClick={()=> setView('matrix')}
              style={{
                background: view==='matrix' ? 'var(--primary)' : 'transparent',
                color: view==='matrix' ? 'var(--on-primary)' : 'var(--text)',
                  border:'1px solid var(--surface-border)', borderRadius:10,
                padding:'8px 12px', minHeight:36, minWidth:44, fontWeight:700, cursor:'pointer'
              }}
            >Matriz</button>
            <button
              id="tab-settings"
              role="tab"
              aria-selected={view==='settings'}
              aria-controls="panel-settings"
              onClick={()=> setView('settings')}
              style={{
                background: view==='settings' ? 'var(--primary)' : 'transparent',
                color: view==='settings' ? 'var(--on-primary)' : 'var(--text)',
                border:'1px solid var(--surface-border)', borderRadius:10,
                padding:'8px 12px', minHeight:36, minWidth:44, fontWeight:700, cursor:'pointer'
              }}
            >Ajustes</button>
          </nav>

          <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
            {/* Help */}
            <button
              type="button"
              onClick={()=> setShowOb(true)}
              aria-label="Ayuda y atajos (H / ?)"
              title="Ayuda y atajos (H / ?)"
              style={{
                background:'transparent', color:'var(--text)', border:'1px solid var(--surface-border)',
                padding:'8px 10px', minHeight:36, minWidth:36, borderRadius:10, fontWeight:800, cursor:'pointer'
              }}
            >
              <HelpCircle size={18} aria-hidden="true" />
            </button>
            {/* Theme toggle */}
            <button
              type="button"
              onClick={()=> setTheme(t=> t==='dark' ? 'light' : 'dark')}
              aria-label={theme==='dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme==='dark' ? 'Modo claro' : 'Modo oscuro'}
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border:'1px solid var(--surface-border)',
                padding:'8px 10px', minHeight:36, minWidth:44, borderRadius:10,
                fontWeight:700, cursor:'pointer', lineHeight:1
              }}
            >{theme==='dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
            {/* Menu */}
            <div style={{ position:'relative' }}>
              <button
                ref={menuBtnRef}
                type="button"
                aria-label="Menú"
                title="Menú"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={()=> setMenuOpen(o=> !o)}
                style={{
                  background:'transparent', color:'var(--text)', border:'1px solid var(--surface-border)',
                  padding:'8px 10px', minHeight:36, minWidth:44, borderRadius:10,
                  fontWeight:700, cursor:'pointer', lineHeight:1
                }}
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Menú principal"
                  style={{
                    position:'absolute', right:0, top:'calc(100% + 8px)', zIndex:30,
                    background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
                    borderRadius:12, boxShadow:'0 16px 48px rgba(0,0,0,.28)', minWidth:200,
                    padding:6, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)'
                  }}
                >
                  <button role="menuitem" type="button"
                    onClick={()=>{ setShowOb(true); setMenuOpen(false) }}
                    style={{
                      display:'flex', width:'100%', textAlign:'left',
                      background:'transparent', color:'var(--text)', border:'1px solid transparent',
                      padding:'10px 12px', borderRadius:8, cursor:'pointer'
                    }}
                  >Ayuda y atajos</button>
                  <button role="menuitem" type="button"
                    onClick={()=>{ setTheme(t=> t==='dark' ? 'light' : 'dark'); setMenuOpen(false) }}
                    style={{
                      display:'flex', width:'100%', textAlign:'left',
                      background:'transparent', color:'var(--text)', border:'1px solid transparent',
                      padding:'10px 12px', borderRadius:8, cursor:'pointer'
                    }}
                  >Cambiar tema</button>
                  <button role="menuitem" type="button"
                    onClick={()=>{ setView(v=> v==='map' ? 'matrix' : 'map'); setMenuOpen(false) }}
                    style={{
                      display:'flex', width:'100%', textAlign:'left',
                      background:'transparent', color:'var(--text)', border:'1px solid transparent',
                      padding:'10px 12px', borderRadius:8, cursor:'pointer'
                    }}
                  >{view==='map' ? 'Ir a Matriz' : 'Ir a Mapa'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {showWelcome && (
        <Welcome
          onEnterMatrix={()=>{ setView('matrix'); setShowWelcome(false) }}
          onEnterMap={()=>{ setView('map'); setShowWelcome(false) }}
          onDemo={startDemo}
          onClose={()=> setShowWelcome(false)}
        />
      )}

      {/* Main content area with tabpanels */}
      <main id="main" role="main" style={{position:'relative'}}>
        {/* Home */}
        <div role="tabpanel" id="panel-home" aria-labelledby="tab-home" hidden={view!=='home'}>
          {view==='home' && <HomePanel />}
        </div>

        {/* Map */}
        <div role="tabpanel" id="panel-map" aria-labelledby="tab-map" hidden={view!=='map'}>
          {view==='map' && (
            <Globe onHelp={()=>setShowOb(true)} onReady={handleGlobeReady} onApi={(api)=> (globeApiRef.current = api)} />
          )}
        </div>

        {/* Matrix */}
        <div role="tabpanel" id="panel-matrix" aria-labelledby="tab-matrix" hidden={view!=='matrix'}>
          {view==='matrix' && <EisenhowerPanel />}
        </div>

        {/* Settings */}
        <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" hidden={view!=='settings'}>
          {view==='settings' && (
            <SettingsPanel theme={theme} onThemeToggle={()=> setTheme(t=> t==='dark' ? 'light' : 'dark')} />
          )}
        </div>
      </main>

      <Onboarding open={showOb} onClose={()=>setShowOb(false)} />
      <Preloader progress={loadPct} visible={loading && view==='map'} />
      {/* FAB visible only on map */}
      {view === 'map' && (
        <>
          <button
            type="button"
            onClick={()=> setSheetOpen(true)}
            aria-label="Crear nueva isla"
            title="Crear nueva isla"
            style={{
              position:'absolute', right:'max(16px, env(safe-area-inset-right))', bottom:'max(16px, env(safe-area-inset-bottom))',
              width:56, height:56, borderRadius:28, cursor:'pointer', zIndex:15,
              background:'var(--primary)', color:'var(--on-primary)', border:'none', boxShadow:'0 10px 26px rgba(240,55,93,.35)', fontSize:24, fontWeight:900
            }}
          >+
          </button>
          <AddIslandSheet
            open={sheetOpen}
            onClose={()=> setSheetOpen(false)}
            onCreate={({ title, emoji, zone })=> globeApiRef.current?.addIsland?.({ title, emoji, zone }) }
          />
        </>
      )}
      {demoLeft>0 && (
        <div style={{
          position:'absolute',
          left: 'max(16px, env(safe-area-inset-left))',
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          background:'var(--surface)', border:'1px solid var(--surface-border)', color:'var(--surface-text)'
        }}>Demo en progreso · {demoLeft}s  —  Puedes arrastrar nodos y ajustar el heatmap</div>
      )}

      {/* Removed old floating theme/view switcher in favor of top nav */}
      {/* Footer landmark */}
      <footer role="contentinfo" style={{position:'absolute', left:16, right:16, bottom:16, pointerEvents:'none'}} aria-hidden>
        {/* Reserved for future legal/links; kept minimal to avoid overlap */}
      </footer>
    </div>
  )
}
