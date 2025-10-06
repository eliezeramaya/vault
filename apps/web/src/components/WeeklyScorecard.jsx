import React, { useEffect, useMemo } from 'react'
import { weekKey, weeklySummary, scheduleQ2BlocksSuggestion, weeklyFQI, logEvent } from '../lib/metrics'

const Card = ({ title, value, subtitle, color }) => (
  <div style={{ flex:1, minWidth:220, background:'var(--surface)', color:'var(--surface-text)', border:'1px solid var(--surface-border)', borderRadius:12, padding:16 }}>
    <div style={{ fontSize:12, opacity:.8 }}>{title}</div>
    <div style={{ fontSize:28, fontWeight:900, color }}>{value}</div>
    {subtitle && <div style={{ fontSize:12, opacity:.7 }}>{subtitle}</div>}
  </div>
)

export default function WeeklyScorecard(){
  const wk = weekKey()
  const s = weeklySummary(wk)
  const fqiColor = s.fqi < 0.34 ? '#e74c3c' : s.fqi < 0.67 ? '#f39c12' : '#2ecc71'
  const prevWk = useMemo(()=>{ const d = new Date(wk + 'T00:00:00Z'); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10) }, [wk])
  const prev = weeklyFQI(prevWk)
  const delta = +(s.fqi - (prev.value || 0)).toFixed(2)

  useEffect(()=>{
    logEvent('weekly_review_opened', { week_start: wk })
  }, [wk])
  return (
    <section aria-label="Scorecard semanal" style={{ maxWidth: 920, margin:'16px auto 80px', padding:16 }}>
      <h2 style={{ marginTop:0 }}>Scorecard semanal</h2>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
  <Card title="FQI" value={`${s.fqi.toFixed(2)} ${delta>=0 ? `↑${delta.toFixed(2)}` : `↓${Math.abs(delta).toFixed(2)}`}`} subtitle={`Min Q1:${s.minQ1} Q2:${s.minQ2} Q3:${s.minQ3} Q4:${s.minQ4}`} color={fqiColor} />
        <Card title="Streak (días)" value={String(s.streak_days)} color={'#3498db'} />
        <Card title="% Q1/Q2 completadas" value={`${s.pct_q12_completed}%`} color={'#9b59b6'} />
      </div>
      <div style={{ marginTop:16 }}>
        <button type="button" onClick={()=> scheduleQ2BlocksSuggestion()} style={{ background:'var(--primary)', color:'var(--on-primary)', border:'none', padding:'12px 16px', borderRadius:12, fontWeight:800, cursor:'pointer' }}>
          Programar 2 bloques Q2 para mañana 10:00
        </button>
      </div>
    </section>
  )
}
