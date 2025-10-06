import React, { useMemo } from 'react'
import { weeklyFQI, weekKey } from '../lib/metrics'

export default function FQIThermometer(){
  const wk = weekKey()
  const prevWk = useMemo(()=>{
    const d = new Date(wk + 'T00:00:00Z')
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0,10)
  }, [wk])
  const cur = weeklyFQI(wk)
  const prev = weeklyFQI(prevWk)
  const delta = +(cur.value - (prev.value || 0)).toFixed(2)
  const pct = Math.round((cur.value || 0) * 100)
  const color = cur.value < 0.34 ? '#e74c3c' : cur.value < 0.67 ? '#f39c12' : '#2ecc71'
  return (
    <div aria-label="FQI termómetro" style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width: 120, height: 14, borderRadius: 999, background: 'linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71)', position:'relative' }}>
        <div style={{ position:'absolute', left:`calc(${pct}% - 6px)`, top:-3, width:12, height:20, background: color, borderRadius:6, boxShadow:'0 2px 6px rgba(0,0,0,.25)' }} />
      </div>
      <div style={{ fontWeight:800 }}>{cur.value.toFixed(2)} {delta>=0 ? `↑${delta.toFixed(2)}` : `↓${Math.abs(delta).toFixed(2)}`}</div>
    </div>
  )
}
