import React from 'react'
import { useFocusLoop } from '../contexts/FocusLoopContext'

const mmss = (sec)=> `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`
const btn = { border:'1px solid var(--surface-border)', padding:'8px 12px', borderRadius:10, background:'transparent', color:'var(--text)', fontWeight:800, cursor:'pointer', minWidth:48 }
const select = { border:'1px solid var(--surface-border)', background:'transparent', color:'var(--text)', padding:'6px 8px', borderRadius:8 }

export default function FocusLoopBar(){
  const { stats, todayTotal, streak, session, startFocus, pauseFocus, resumeFocus, cancelFocus, completeFocus, setTarget } = useFocusLoop()
  const pct = Math.min(100, Math.round((todayTotal / Math.max(1, stats.target)) * 100))

  return (
    <div style={{ position:'sticky', top:'12px', zIndex:16, maxWidth:560, margin:'0 auto', padding:'10px', background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)', borderRadius:12, boxShadow:'0 12px 36px rgba(0,0,0,.22)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)' }}>
      <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
        <div style={{fontWeight:800}}>Focus Loop</div>
        <div style={{flex:1, minWidth:160}}>
          <div aria-label="Progreso diario" style={{height:10, borderRadius:6, background:'rgba(255,255,255,.08)', overflow:'hidden'}}>
            <div style={{ width:`${pct}%`, height:'100%', borderRadius:6, background:'linear-gradient(90deg, var(--primary), #22c55e)' }} />
          </div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:12, opacity:.8, marginTop:4}}>
            <span>Hoy: {todayTotal} / {stats.target} min</span>
            <span>Streak: {streak}d</span>
          </div>
        </div>
        {!session && (
          <div style={{display:'flex', gap:6}}>
            <button onClick={()=> startFocus({ minutes:15, quadrant:'Q2' })} style={btn}>15</button>
            <button onClick={()=> startFocus({ minutes:25, quadrant:'Q2' })} style={btn}>25</button>
            <button onClick={()=> startFocus({ minutes:45, quadrant:'Q2' })} style={btn}>45</button>
          </div>
        )}
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <label style={{fontSize:12, opacity:.8}}>Objetivo</label>
          <select value={stats.target} onChange={e=> setTarget(e.target.value)} style={select}>
            {[60,90,120,150,180,240].map(v=> <option key={v} value={v}>{v} min</option>)}
          </select>
        </div>
      </div>

      {session && (
        <div style={{display:'flex', alignItems:'center', gap:8, marginTop:10, flexWrap:'wrap'}}>
          <div style={{fontVariantNumeric:'tabular-nums', fontWeight:800, fontSize:18}}>{mmss(session.remainingSec ?? session.minutes*60)}</div>
          <div style={{fontSize:12, opacity:.85}}>Sesión: {session.minutes} min • {session.quadrant}{session.taskId ? ` • ${session.taskId}`:''}</div>
          <div style={{marginLeft:'auto', display:'flex', gap:6}}>
            {session.running ? (
              <button onClick={pauseFocus} style={{...btn, background:'transparent'}}>Pausar</button>
            ) : (
              <button onClick={resumeFocus} style={{...btn, background:'var(--primary)', color:'var(--on-primary)'}}>Reanudar</button>
            )}
            <button onClick={completeFocus} style={{...btn, background:'#22c55e', color:'#03160a'}}>Completar</button>
            <button onClick={cancelFocus} style={{...btn, background:'transparent'}}>Cancelar</button>
          </div>
        </div>
      )}

      {stats.lastMessage && (
        <div role="status" style={{ marginTop:8, fontSize:13, padding:'8px 10px', background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.35)', borderRadius:10 }}>
          {stats.lastMessage}
        </div>
      )}
    </div>
  )
}
