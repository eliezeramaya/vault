import React, { useEffect, useRef, useState } from 'react'
import Globe from './components/Globe'
import Welcome from './components/Welcome'
import Onboarding from './components/Onboarding'
import Preloader from './components/Preloader'
import AddIslandSheet from './components/AddIslandSheet'

export default function App(){
  const [showWelcome, setShowWelcome] = useState(true)
  const [demoLeft, setDemoLeft] = useState(0)
  const demoTimer = useRef(null)
  const [showOb, setShowOb] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const globeApiRef = useRef(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(()=>{
    return ()=> { if (demoTimer.current) clearInterval(demoTimer.current) }
  },[])

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
      {showWelcome && (
        <Welcome onEnter={()=>setShowWelcome(false)} onDemo={startDemo} />
      )}
      <Globe onHelp={()=>setShowOb(true)} onReady={handleGlobeReady} onApi={(api)=> (globeApiRef.current = api)} />
      <Onboarding open={showOb} onClose={()=>setShowOb(false)} />
      <Preloader progress={loadPct} visible={loading} />
      {/* FAB */}
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
      >+</button>
      <AddIslandSheet
        open={sheetOpen}
        onClose={()=> setSheetOpen(false)}
        onCreate={({ title, emoji, zone })=> globeApiRef.current?.addIsland?.({ title, emoji, zone }) }
      />
      {demoLeft>0 && (
        <div style={{
          position:'absolute',
          left: 'max(16px, env(safe-area-inset-left))',
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          background:'rgba(10,12,24,.6)', border:'1px solid rgba(255,255,255,.1)', color:'#EAEAEA',
          padding:'8px 12px', borderRadius:8, fontSize:12, backdropFilter:'blur(8px)'
        }}>Demo en progreso · {demoLeft}s  —  Puedes arrastrar nodos y ajustar el heatmap</div>
      )}
    </div>
  )
}
