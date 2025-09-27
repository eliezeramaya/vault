import React, { useEffect, useRef, useState } from 'react'
import Globe from './components/Globe'
import Welcome from './components/Welcome'
import Onboarding from './components/Onboarding'
import Preloader from './components/Preloader'

export default function App(){
  const [showWelcome, setShowWelcome] = useState(true)
  const [demoLeft, setDemoLeft] = useState(0)
  const demoTimer = useRef(null)
  const [showOb, setShowOb] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [loading, setLoading] = useState(true)

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
      <Globe onHelp={()=>setShowOb(true)} onReady={handleGlobeReady} />
      <Onboarding open={showOb} onClose={()=>setShowOb(false)} />
      <Preloader progress={loadPct} visible={loading} />
      {demoLeft>0 && (
        <div style={{position:'absolute', left:16, bottom:16, background:'rgba(10,12,24,.6)', border:'1px solid rgba(255,255,255,.1)', color:'#EAEAEA', padding:'8px 12px', borderRadius:8, fontSize:12, backdropFilter:'blur(8px)'}}>Demo en progreso · {demoLeft}s  —  Puedes arrastrar nodos y ajustar el heatmap</div>
      )}
    </div>
  )
}
