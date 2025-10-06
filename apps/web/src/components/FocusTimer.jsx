import React, { useEffect, useRef, useState } from 'react'
import { startFocus, endFocus, Quadrant, completeTask } from '../lib/metrics'

export default function FocusTimer({ task, defaultMinutes = 25, quadrant = Quadrant.Q2, onSessionComplete }){
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [running, setRunning] = useState(false)
  const [left, setLeft] = useState(defaultMinutes * 60)
  const sessionRef = useRef(null)
  const tickRef = useRef(null)

  useEffect(()=>{
    return ()=> { if (tickRef.current) clearInterval(tickRef.current) }
  },[])

  const start = (mins) => {
    const m = mins || minutes
    setMinutes(m)
    setLeft(m * 60)
    sessionRef.current = startFocus({ task_id: task?.id || null, quadrant: quadrant || task?.quadrant || Quadrant.Q2, planned_min: m })
    setRunning(true)
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(()=> setLeft(x => {
      if (x <= 1){
        clearInterval(tickRef.current)
        finish()
        return 0
      }
      return x - 1
    }), 1000)
  }

  const finish = () => {
    if (!sessionRef.current) return
    const secs = left
    const mins = Math.max(1, Math.round((minutes * 60 - secs) / 60))
    const rec = endFocus(sessionRef.current, { actual_min: mins, interruptions: 0 })
    setRunning(false)
    sessionRef.current = null
    if (task?.id){
      completeTask(task.id, mins)
    }
    onSessionComplete?.(rec)
  }

  const cancel = () => {
    if (tickRef.current) clearInterval(tickRef.current)
    setRunning(false)
    sessionRef.current = null
  }

  const fmt = (s)=>{
    const m = Math.floor(s/60)
    const ss = String(s%60).padStart(2,'0')
    return `${m}:${ss}`
  }

  const Chip = ({ val }) => (
    <button type="button" onClick={()=> start(val)} disabled={running}
      style={{
        background: running ? 'var(--btn-disabled-bg)' : 'var(--surface)',
        color: running ? 'var(--btn-disabled-fg)' : 'var(--surface-text)',
        border: '1px solid var(--surface-border)', padding:'8px 10px', borderRadius:10, cursor: running ? 'not-allowed' : 'pointer'
      }}>{val}m</button>
  )

  return (
    <div aria-label="Temporizador de foco" style={{ display:'grid', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <Chip val={15} />
        <Chip val={25} />
        <Chip val={45} />
        {!running && (
          <button type="button" onClick={()=> start(minutes)} style={{ background:'var(--primary)', color:'var(--on-primary)', border:'none', padding:'10px 14px', borderRadius:10, fontWeight:800, cursor:'pointer' }}>Empezar foco</button>
        )}
        {running && (
          <>
            <button type="button" onClick={finish} style={{ background:'var(--primary)', color:'var(--on-primary)', border:'none', padding:'10px 14px', borderRadius:10, fontWeight:800, cursor:'pointer' }}>Terminar</button>
            <button type="button" onClick={cancel} style={{ background:'transparent', color:'var(--surface-text)', border:'1px solid var(--surface-border)', padding:'10px 14px', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Cancelar</button>
          </>
        )}
      </div>
      <div style={{ fontSize:24, fontWeight:900 }} aria-live="polite">{running ? fmt(left) : `${minutes}:00`}</div>
    </div>
  )
}
