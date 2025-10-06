import React from 'react'
import FocusTimer from './FocusTimer'
import FQIThermometer from './FQIThermometer'
import { deriveNextBestTask, Quadrant, streakDays } from '../lib/metrics'

export default function HomePanel(){
  const next = deriveNextBestTask()
  return (
    <section aria-label="Inicio" style={{
      position:'relative', minHeight:'70vh',
      margin:'max(16px, env(safe-area-inset-top)) auto 80px',
      padding:'24px 16px', maxWidth:920,
      background:'var(--surface)', border:'1px solid var(--surface-border)', color:'var(--surface-text)',
      borderRadius:16
    }}>
      <h1 style={{marginTop:0}}>Inicio</h1>
      {/* Siguiente mejor acción */}
      <div style={{ display:'grid', gap:12, alignItems:'center', gridTemplateColumns:'1fr auto', marginTop:12 }}>
        <div>
          <div style={{ fontSize:12, opacity:.8 }}>Siguiente mejor acción</div>
          <div style={{ fontSize:18, fontWeight:800 }}>
            {next ? next.title : 'Añade una tarea Q1/Q2 para empezar'}
          </div>
          <div style={{ fontSize:12, opacity:.7 }}>
            {next ? `Cuadrante ${next.quadrant}` : 'Consejo: arrastra tus notas en la Matriz'}
          </div>
        </div>
        <FocusTimer task={next || { quadrant: Quadrant.Q2 }} defaultMinutes={25} quadrant={next?.quadrant || Quadrant.Q2}
          onSessionComplete={()=>{/* noop for now */}} />
      </div>

      {/* Mini termómetro FQI + Streak placeholder */}
      <div style={{ marginTop:20, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, opacity:.8 }}>FQI</span>
          <FQIThermometer />
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', color:'var(--surface-text)', padding:'6px 10px', borderRadius:999, fontSize:12 }}>
          Streak: {streakDays()} días
        </div>
      </div>
    </section>
  )
}
