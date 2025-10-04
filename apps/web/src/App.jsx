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
  const headerRef = useRef(null)
  const [headerH, setHeaderH] = useState(0)
  const [bottomNavH, setBottomNavH] = useState(0)

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

  useEffect(()=>{
    const el = headerRef.current
    const navEl = document.querySelector('.nav-bottom')
    if (!el && !navEl) return
    const measure = ()=> {
      try { setHeaderH(el?.getBoundingClientRect?.().height || 0) } catch { setHeaderH(0) }
      try { setBottomNavH(navEl?.getBoundingClientRect?.().height || 0) } catch { setBottomNavH(0) }
    }
    measure()
    const ro = new ResizeObserver(measure)
    try { if (el) ro.observe(el); if (navEl) ro.observe(navEl) } catch {}
    const onWin = ()=> measure()
    window.addEventListener('resize', onWin)
    const onDom = ()=> { // in case nav-bottom mounts after first paint
      const n = document.querySelector('.nav-bottom')
      if (n && n !== navEl) {
        try { ro.observe(n) } catch {}
        measure()
        document.removeEventListener('DOMContentLoaded', onDom)
      }
    }
    document.addEventListener('DOMContentLoaded', onDom)
    return ()=> { try { ro.disconnect() } catch {}; window.removeEventListener('resize', onWin); document.removeEventListener('DOMContentLoaded', onDom) }
  }, [])

  return (
    <div className="app" style={{position:'relative'}}>
      {/* Top navigation bar (persistent) */}
      {/* Skip link */}
      <a href="#main" className="skip-link">Saltar al contenido</a>

      <header ref={headerRef} role="banner" style={{
        position:'sticky', top:'max(10px, env(safe-area-inset-top))',
        zIndex:18,
        pointerEvents:'none',
        paddingLeft:'max(10px, env(safe-area-inset-left))',
        paddingRight:'max(10px, env(safe-area-inset-right))'
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
                  border:'1px solid var(--surface-border', borderRadius:10,
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
      <main id="main" role="main" style={{position:'relative', paddingTop: 0, paddingBottom: (view==='matrix' || view==='home' || view==='settings') ? (bottomNavH + 12) : 0}}>
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
