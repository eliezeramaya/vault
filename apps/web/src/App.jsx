import React, { useEffect, useRef, useState } from 'react'
import Globe from './components/Globe'
import EisenhowerPanel from './components/EisenhowerPanel'
import Welcome from './components/Welcome'
import Onboarding from './components/Onboarding'
import Preloader from './components/Preloader'
import AddIslandSheet from './components/AddIslandSheet'

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
  const [view, setView] = useState('map') // 'map' | 'matrix'

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

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    try{ localStorage.setItem('theme', theme) }catch{}
  },[theme])

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

  return (
    <div className="app" style={{position:'relative'}}>
      {/* Global theme hints */}
      <style>{`
        :root { color-scheme: light dark; }
        :root[data-theme='dark'] { color-scheme: dark; }
        :root[data-theme='light'] { color-scheme: light; }

        :root[data-theme='dark']{
          --bg-wrap: radial-gradient(1200px 800px at 70% 20%, rgba(240,55,93,.05), transparent 60%), linear-gradient(180deg,#0a0a15 0%, #0a0f1f 100%);
          --text: #EAEAEA;
          --panel-bg: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
          --panel-border: rgba(255,255,255,.12);
          --note-border: rgba(255,255,255,.4);
          --note-bg: transparent;
          --composer-bg: rgba(10,12,24,0.75);
          --composer-text: #EAEAEA;
          --axis-rgb: 255,255,255;
          --grid-minor: rgba(255,255,255,.06);
          --grid-medium: rgba(255,255,255,.13);
          --grid-major: rgba(255,255,255,.22);
          --keepout: rgba(240,55,93,.08);
        }
        :root[data-theme='light']{
          --bg-wrap: radial-gradient(1200px 800px at 70% 20%, rgba(240,55,93,.08), transparent 60%), linear-gradient(180deg,#f5f7ff 0%, #eef2fb 100%);
          --text: #0a0a15;
          --panel-bg: linear-gradient(180deg, rgba(255,255,255,.75), rgba(255,255,255,.55));
          --panel-border: rgba(0,0,0,.08);
          --note-border: rgba(0,0,0,.25);
          --note-bg: transparent;
          --composer-bg: rgba(255,255,255,0.85);
          --composer-text: #0a0a15;
          --axis-rgb: 0,0,0;
          --grid-minor: rgba(0,0,0,.06);
          --grid-medium: rgba(0,0,0,.12);
          --grid-major: rgba(0,0,0,.20);
          --keepout: rgba(240,55,93,.10);
        }
      `}</style>
      {/* Global SVG filters for visual effects (e.g., crystal-btn distortion) */}
      <svg width="0" height="0" style={{position:'absolute'}} aria-hidden focusable="false">
        <filter id="distorsion">
          <feTurbulence type="turbulence" baseFrequency="0.012" numOctaves="3" seed="7" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>
      {showWelcome && (
        <Welcome
          onEnterMatrix={()=>{ setView('matrix'); setShowWelcome(false) }}
          onEnterMap={()=>{ setView('map'); setShowWelcome(false) }}
          onDemo={startDemo}
        />
      )}

      {/* Toggle between Map (Globe) and Eisenhower Matrix */}
      {view === 'map' ? (
        <Globe onHelp={()=>setShowOb(true)} onReady={handleGlobeReady} onApi={(api)=> (globeApiRef.current = api)} />
      ) : (
        <EisenhowerPanel />
      )}

      <Onboarding open={showOb} onClose={()=>setShowOb(false)} />
      <Preloader progress={loadPct} visible={loading && view==='map'} />
      {/* FAB */}
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
              background:'#F0375D', color:'#0a0a15', border:'none', boxShadow:'0 10px 26px rgba(240,55,93,.35)', fontSize:24, fontWeight:900
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
          background:'rgba(10,12,24,.6)', border:'1px solid rgba(255,255,255,.1)', color:'#EAEAEA',
          padding:'8px 12px', borderRadius:8, fontSize:12, backdropFilter:'blur(8px)'
        }}>Demo en progreso · {demoLeft}s  —  Puedes arrastrar nodos y ajustar el heatmap</div>
      )}

      {/* Theme toggle + View switcher */}
      <div style={{position:'absolute', top:'max(12px, env(safe-area-inset-top))', right:'max(12px, env(safe-area-inset-right))', zIndex:25, display:'flex', gap:8, alignItems:'center'}}>
        <button
          type="button"
          onClick={()=> setTheme(t=> t==='dark' ? 'light' : 'dark')}
          aria-label={theme==='dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme==='dark' ? 'Modo claro' : 'Modo oscuro'}
          style={{
            background: theme==='dark' ? 'rgba(10,12,24,.6)' : '#F9F9FB',
            color: theme==='dark' ? '#EAEAEA' : '#0a0a15',
            border:'1px solid rgba(127,127,127,.3)',
            padding:'10px', minHeight:40, minWidth:44, borderRadius:10,
            fontWeight:700, cursor:'pointer', lineHeight:1
          }}
        >{theme==='dark' ? '☀️' : '🌙'}</button>
        <button
          type="button"
          onClick={()=> setView('map')}
          aria-pressed={view==='map'}
          style={{
            background: view==='map' ? '#F0375D' : 'rgba(10,12,24,.6)',
            color: view==='map' ? '#0a0a15' : '#EAEAEA',
            border:'1px solid rgba(255,255,255,.15)',
            padding:'10px 14px', minHeight:40, minWidth:44, borderRadius:10,
            fontWeight:700, cursor:'pointer'
          }}
        >Mapa</button>
        <button
          type="button"
          onClick={()=> setView('matrix')}
          aria-pressed={view==='matrix'}
          style={{
            background: view==='matrix' ? '#F0375D' : 'rgba(10,12,24,.6)',
            color: view==='matrix' ? '#0a0a15' : '#EAEAEA',
            border:'1px solid rgba(255,255,255,.15)',
            padding:'10px 14px', minHeight:40, minWidth:44, borderRadius:10,
            fontWeight:700, cursor:'pointer'
          }}
        >Matriz</button>
      </div>
    </div>
  )
}
