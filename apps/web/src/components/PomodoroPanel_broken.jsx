import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Quadrant, startFocus, endFocus, logEvent, weekKey } from '../lib/metrics'
import { pomodoroStats } from '../lib/metrics'
import PomodoroStats from './PomodoroStats.jsx'
import PomodoroAchievements from './PomodoroAchievements.jsx'

/**
 * PomodoroPanel
 * - Work/break cycles with simple controls
 * - Uses metrics.startFocus/endFocus for WORK sessions so they feed FQI
 * - Logs extra events for break phases; optional auto-start
 */
export default function PomodoroPanel(){
  const testMode = isTestMode()
  console.log('PomodoroPanel render, testMode:', testMode)
  
  // Add CSS animations
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px currentColor; }
        50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
      }
      @keyframes countdown-warning {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes achievement-unlock {
        0% { transform: scale(0.8) rotate(-10deg); opacity: 0; }
        50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes celebration-bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      @keyframes progress-fill {
        0% { transform: scaleX(0); }
        100% { transform: scaleX(1); }
      }
      @keyframes tab-switch {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes stats-appear {
        0% { opacity: 0; transform: translateY(20px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes level-up {
        0% { transform: scale(1); }
        25% { transform: scale(1.1) rotate(2deg); }
        50% { transform: scale(1.05) rotate(-1deg); }
        75% { transform: scale(1.08) rotate(1deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes xp-gain {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-20px) scale(1.2); opacity: 0; }
      }
      @keyframes badge-shine {
        0% { background-position: -100% 0; }
        100% { background-position: 100% 0; }
      }
      .achievement-unlock {
        animation: achievement-unlock 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .celebration-bounce {
        animation: celebration-bounce 1s ease-in-out;
      }
      .progress-fill {
        animation: progress-fill 0.8s ease-out;
        transform-origin: left center;
      }
      .tab-content {
        animation: tab-switch 0.3s ease-out;
      }
      .stats-appear {
        animation: stats-appear 0.5s ease-out;
      }
      .level-up {
        animation: level-up 0.8s ease-out;
      }
      .xp-gain {
        animation: xp-gain 1s ease-out forwards;
      }
      .badge-shine {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        background-size: 200% 100%;
        animation: badge-shine 2s ease-in-out infinite;
      }
      .hover-lift {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .hover-lift:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .metric-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .metric-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      .timer-glow {
        position: relative;
      }
      .timer-glow::before {
        content: '';
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, var(--primary), transparent, var(--primary));
        animation: spin 3s linear infinite;
        opacity: 0.3;
        z-index: -1;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .notification-slide {
        animation: notification-slide 0.5s ease-out;
      }
      @keyframes notification-slide {
        0% { transform: translateX(100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }
      .streak-fire {
        position: relative;
        overflow: hidden;
      }
      .streak-fire::after {
        content: '🔥';
        position: absolute;
        top: -5px;
        right: -5px;
        font-size: 16px;
        animation: celebration-bounce 2s ease-in-out infinite;
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
  // Settings (persisted in localStorage)
  const [workMin, setWorkMin] = useState(()=> loadNumber('pomo_work_min', testMode ? 0.1 : 25, testMode))
  const [shortBreakMin, setShortBreakMin] = useState(()=> loadNumber('pomo_short_min', testMode ? 0.1 : 5, testMode))
  const [longBreakMin, setLongBreakMin] = useState(()=> loadNumber('pomo_long_min', testMode ? 0.1 : 15, testMode))
  const [interval, setIntervalVal] = useState(()=> loadNumber('pomo_interval', 4))
  const [autoStartBreak, setAutoStartBreak] = useState(()=> loadBool('pomo_auto_break', true))
  const [autoStartNext, setAutoStartNext] = useState(()=> loadBool('pomo_auto_next', false))
  const [notificationsEnabled, setNotificationsEnabled] = useState(()=> loadBool('pomo_notifications', true))
  const [audioEnabled, setAudioEnabled] = useState(()=> loadBool('pomo_audio', true))
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission)

  // Tab state for new visualizations
  const [activeTab, setActiveTab] = useState(()=> loadString('pomo_active_tab', 'timer'))

  // Runtime state
  const [phase, setPhase] = useState('idle') // idle | work | break_short | break_long | paused
  const [leftSec, setLeftSec] = useState(workMin * 60)
  const [completedInSet, setCompletedInSet] = useState(0)
  const [targetMin, setTargetMin] = useState(workMin)
  const [quadrant, setQuadrant] = useState(Quadrant.Q2)
  const tickRef = useRef(null)
  const sessionRef = useRef(null) // holds current work session started via startFocus
  const [stats, setStats] = useState(()=> pomodoroStats(weekKey()))

  // Persist settings
  useEffect(()=>{ try { localStorage.setItem('pomo_work_min', String(workMin)) } catch {} }, [workMin])
  useEffect(()=>{ try { localStorage.setItem('pomo_short_min', String(shortBreakMin)) } catch {} }, [shortBreakMin])
  useEffect(()=>{ try { localStorage.setItem('pomo_long_min', String(longBreakMin)) } catch {} }, [longBreakMin])
  useEffect(()=>{ try { localStorage.setItem('pomo_interval', String(interval)) } catch {} }, [interval])
  useEffect(()=>{ try { localStorage.setItem('pomo_auto_break', JSON.stringify(autoStartBreak)) } catch {} }, [autoStartBreak])
  useEffect(()=>{ try { localStorage.setItem('pomo_auto_next', JSON.stringify(autoStartNext)) } catch {} }, [autoStartNext])
  useEffect(()=>{ try { localStorage.setItem('pomo_notifications', JSON.stringify(notificationsEnabled)) } catch {} }, [notificationsEnabled])
  useEffect(()=>{ try { localStorage.setItem('pomo_audio', JSON.stringify(audioEnabled)) } catch {} }, [audioEnabled])
  useEffect(()=>{ try { localStorage.setItem('pomo_active_tab', activeTab) } catch {} }, [activeTab])

  // Cleanup
  useEffect(()=>()=>{ if (tickRef.current) clearInterval(tickRef.current) }, [])

  // Derived dots for progress
  const dots = useMemo(()=> Array.from({ length: interval }, (_, i)=> i < completedInSet), [interval, completedInSet])

  const fmt = (s)=>{
    const m = Math.floor(s/60)
    const ss = String(s%60).padStart(2,'0')
    return `${m}:${ss}`
  }

  const startTick = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    const TICK_MS = testMode ? 100 : 1000
    let warningShown = false
    
    tickRef.current = setInterval(()=> setLeftSec(x=> {
      // Show warning notification at 1 minute remaining (only for work phase)
      if (!warningShown && x === 60 && phase === 'work') {
        warningShown = true
        showNotification(
          '⏰ ¡Último minuto!',
          'Queda 1 minuto para completar este Pomodoro'
        )
        playNotificationSound('warning')
      }
      
      if (x <= 1){
        clearInterval(tickRef.current)
        onPhaseComplete()
        return 0
      }
      return x-1
    }), TICK_MS)
  }

  const startWork = ()=>{
    const planned = workMin
    setPhase('work')
    setTargetMin(planned)
    setLeftSec(planned * 60)
    sessionRef.current = startFocus({ task_id: null, quadrant, planned_min: planned, source: 'pomodoro' })
    logEvent('pomodoro_start', { planned_min: planned, quadrant })
    startTick()
  }

  const startBreak = (type)=>{
    const planned = type === 'break_long' ? longBreakMin : shortBreakMin
    setPhase(type)
    setTargetMin(planned)
    setLeftSec(planned * 60)
    logEvent('break_start', { type, planned_min: planned })
    startTick()
  }

  const pause = ()=>{
    if (!tickRef.current) return
    clearInterval(tickRef.current)
    tickRef.current = null
    setPhase('paused')
    logEvent('pomodoro_pause', { phase })
  }

  const resume = ()=>{
    if (phase !== 'paused') return
    // Resume to last intended phase: when paused we don't store which; infer by comparing target to settings
    // If target equals workMin, treat as work; otherwise break
    const resPhase = (targetMin === workMin) ? 'work' : (targetMin === longBreakMin ? 'break_long' : 'break_short')
    setPhase(resPhase)
    startTick()
    logEvent('pomodoro_resume', { phase: resPhase })
  }

  const reset = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    // If we had a started work session and reset during work, end it with actual minutes spent so far
    if (sessionRef.current && (phase === 'work' || phase === 'paused' && targetMin === workMin)){
      const elapsed = Math.max(0, Math.round((workMin*60 - leftSec)/60)) || 0
      try { endFocus(sessionRef.current, { actual_min: elapsed, interruptions: 0 }) } catch {}
      logEvent('pomodoro_cancel', { elapsed_min: elapsed })
    }
    sessionRef.current = null
    setPhase('idle')
    setLeftSec(workMin * 60)
    setTargetMin(workMin)
  }

  const skip = ()=>{
    if (phase === 'break_short' || phase === 'break_long'){
      logEvent('break_skipped', { type: phase })
      nextCycle()
    }
  }

  const onPhaseComplete = ()=>{
    console.log('onPhaseComplete called, current phase:', phase, 'targetMin:', targetMin)
    if (phase === 'work' || (phase === 'paused' && targetMin === workMin)){
      // Close work session
      const actual = targetMin
      try { 
        endFocus(sessionRef.current, { actual_min: actual, interruptions: 0 }) 
        console.log('endFocus called for session:', sessionRef.current)
      } catch (e) {
        console.error('Failed to end focus session:', e)
      }
      sessionRef.current = null
      setCompletedInSet(n=> n+1)
      console.log('Logging pomodoro_complete event with actual_min:', actual)
      logEvent('pomodoro_complete', { actual_min: actual })
      
      // Show completion notification and play sound
      showNotification(
        '🍅 ¡Pomodoro Completado!',
        `Has completado ${actual} minutos de trabajo enfocado. ¡Tiempo de descanso!`
      )
      playNotificationSound('complete')
      
      // Decide break
      const isLong = ((completedInSet + 1) % interval) === 0
      if (autoStartBreak){
        startBreak(isLong ? 'break_long' : 'break_short')
      } else {
        setPhase(isLong ? 'break_long' : 'break_short')
        setTargetMin(isLong ? longBreakMin : shortBreakMin)
        setLeftSec((isLong ? longBreakMin : shortBreakMin) * 60)
      }
      // Update weekly stats summary after each completed pomo
      try { setStats(pomodoroStats(weekKey())) } catch {}
    } else if (phase === 'break_short' || phase === 'break_long'){
      logEvent('break_complete', { type: phase, actual_min: targetMin })
      
      // Show break completion notification
      const breakType = phase === 'break_long' ? 'largo' : 'corto'
      showNotification(
        `☕ Descanso ${breakType} completado`,
        '¡Es hora de volver al trabajo! 💪'
      )
      playNotificationSound('break')
      
      try { setStats(pomodoroStats(weekKey())) } catch {}
      nextCycle()
    }
  }

  const nextCycle = ()=>{
    // After a break, start next work automatically if enabled
    if (autoStartNext){
      startWork()
    } else {
      setPhase('idle')
      setTargetMin(workMin)
      setLeftSec(workMin * 60)
    }
  }

  // Notification and audio helpers
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }

  const showNotification = (title, body, icon = '🍅') => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return
    
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'pomodoro-timer',
        requireInteraction: false,
        silent: !audioEnabled
      })
      
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    } catch (error) {
      console.warn('Failed to show notification:', error)
    }
  }

  const playNotificationSound = (type = 'complete') => {
    if (!audioEnabled) return
    
    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different tones for different events
      const frequencies = {
        complete: [523, 659, 784], // C-E-G major chord
        break: [440, 554, 659],    // A-C#-E major chord
        warning: [330, 330, 330]   // Single tone for warnings
      }
      
      const freqs = frequencies[type] || frequencies.complete
      
      freqs.forEach((freq, index) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          
          osc.connect(gain)
          gain.connect(audioContext.destination)
          
          osc.frequency.setValueAtTime(freq, audioContext.currentTime)
          osc.type = 'sine'
          
          gain.gain.setValueAtTime(0, audioContext.currentTime)
          gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          
          osc.start(audioContext.currentTime)
          osc.stop(audioContext.currentTime + 0.3)
        }, index * 100)
      })
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }

  const PhaseBadge = ({ label, color }) => (
    <span style={{
      background: color,
      color: 'white',
      padding: '4px 8px',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 0.3,
      transition: 'all 0.3s ease',
      transform: 'scale(1)',
      animation: 'pulse 2s infinite'
    }}>{label}</span>
  )

  // Calculate progress percentage
  const progressPercentage = ((targetMin * 60 - leftSec) / (targetMin * 60)) * 100
  
  // Get phase colors
  const getPhaseColor = (currentPhase) => {
    switch(currentPhase) {
      case 'work': return '#ef4444'
      case 'break_short': return '#22c55e'
      case 'break_long': return '#0ea5e9'
      case 'paused': return '#a3a3a3'
      default: return '#e5e5e5'
    }
  }

  return (
    <div style={{ 
      padding: '24px 16px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      maxWidth: '800px',
      margin: '0 auto',
      gap: '32px'
    }}>
      {/* Header with Title and Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        width: '100%'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: 28, 
          fontWeight: 900,
          color: 'var(--text)',
          textAlign: 'center'
        }}>
          🍅 Pomodoro Center
        </h1>
        
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '4px',
          border: '1px solid var(--surface-border)',
          gap: '4px'
        }}>
          {[
            { id: 'timer', label: '⏱️ Timer', icon: '⏱️' },
            { id: 'stats', label: '📊 Estadísticas', icon: '📊' },
            { id: 'achievements', label: '🏆 Logros', icon: '🏆' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...btnTab,
                ...(activeTab === tab.id ? btnTabActive : {}),
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              <span>{tab.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ width: '100%' }}>
        {activeTab === 'timer' && renderTimerTab()}
        {activeTab === 'stats' && <PomodoroStats />}
        {activeTab === 'achievements' && <PomodoroAchievements />}
      </div>
    </div>
  )

  // Timer tab content (original functionality)
  function renderTimerTab() {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px'
      }}>
        {/* Phase Badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 16, 
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {phase === 'work' && <PhaseBadge label="ENFOQUE" color="#ef4444" />}
          {phase === 'break_short' && <PhaseBadge label="DESCANSO" color="#22c55e" />}
          {phase === 'break_long' && <PhaseBadge label="DESCANSO LARGO" color="#0ea5e9" />}
          {phase === 'paused' && <PhaseBadge label="PAUSADO" color="#a3a3a3" />}
        </div>

        {/* Main Timer Display */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 32px ${getPhaseColor(phase)}20, 0 0 0 2px ${getPhaseColor(phase)}10`,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: phase === 'work' ? 'scale(1.02)' : 'scale(1)'
          }}>
            {/* Progress Ring Overlay for Smoother Animation */}
            <div style={{
              position: 'absolute',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'transparent',
              border: `4px solid transparent`,
              borderTopColor: getPhaseColor(phase),
              transform: `rotate(${(progressPercentage * 3.6) - 90}deg)`,
              transition: 'transform 1s ease-out',
              opacity: 0.3
            }} />
            
            <div style={{
              width: '264px',
              height: '264px',
              borderRadius: '50%',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              position: 'relative',
              transition: 'all 0.3s ease'
            }}>
              {/* Progress Percentage Display */}
              <div style={{
                position: 'absolute',
                top: '20px',
                fontSize: '14px',
                fontWeight: 700,
                color: getPhaseColor(phase),
                opacity: phase === 'idle' ? 0 : 1,
                transition: 'all 0.3s ease'
              }}>
                {phase !== 'idle' && `${Math.round(progressPercentage)}%`}
              </div>
              
              {/* Time Display */}
              <div 
                style={{ 
                  fontSize: '48px', 
                  fontWeight: 900, 
                  fontFamily: 'ui-monospace, "SF Mono", Monaco, Consolas, monospace',
                  color: 'var(--text)',
                  textAlign: 'center',
                  lineHeight: 1,
                  animation: leftSec <= 60 && phase === 'work' ? 'countdown-warning 1s ease-in-out infinite' : 'none'
                }}
                data-testid="timer-display"
              >
                {fmt(leftSec)}
              </div>
              
              {/* Target Duration Display */}
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>Meta:</span>
                <span style={{ color: 'var(--text)' }}>{targetMin}m</span>
              </div>
              
              {/* Phase Description */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                {phase === 'idle' && 'Listo para comenzar'}
                {phase === 'work' && 'Enfoque profundo'}
                {phase === 'break_short' && 'Descanso corto'}
                {phase === 'break_long' && 'Descanso largo'}
                {phase === 'paused' && 'En pausa'}
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons with Enhanced UX */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {phase === 'idle' && (
            <button 
              style={{
                ...btnPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                padding: '16px 32px'
              }}
              onClick={startWork}
              data-testid="start-work-btn"
            >
              <span style={{ fontSize: '20px' }}>▶️</span>
              Iniciar sesión de trabajo
            </button>
          )}
          
          {phase === 'work' && (
            <>
              <button 
                style={{
                  ...btnSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={pauseTimer}
                data-testid="pause-btn"
              >
                <span>⏸️</span>
                Pausar sesión
              </button>
              <button 
                style={{
                  ...btnDestructive,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={stopWork}
                data-testid="stop-work-btn"
              >
                <span>⏹️</span>
                Finalizar sesión
              </button>
            </>
          )}
          
          {(phase === 'break_short' || phase === 'break_long') && (
            <>
              <button 
                style={{
                  ...btnSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={pauseTimer}
                data-testid="pause-break-btn"
              >
                <span>⏸️</span>
                Pausar descanso
              </button>
              <button 
                style={{
                  ...btnSuccess,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={skipBreak}
                data-testid="skip-break-btn"
              >
                <span>⏭️</span>
                Finalizar descanso
              </button>
            </>
          )}
          
          {phase === 'paused' && (
            <>
              <button 
                style={{
                  ...btnPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={resumeTimer}
                data-testid="resume-btn"
              >
                <span>▶️</span>
                Continuar
              </button>
              <button 
                style={{
                  ...btnDestructive,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={resetTimer}
                data-testid="reset-btn"
              >
                <span>🔄</span>
                Reiniciar timer
              </button>
            </>
          )}
        </div>

        {/* Progress Indicator with Pomodoro Dots */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 24px',
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--surface-border)'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginRight: '8px'
          }}>
            Set actual:
          </span>
          {dots.map((completed, i) => (
            <div 
              key={i} 
              title={`Pomodoro ${i+1}${completed ? ' (completado)' : ''}`} 
              style={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                background: completed ? 'var(--primary)' : 'var(--surface-border)', 
                border: `2px solid ${completed ? 'var(--primary)' : 'var(--surface-border)'}`,
                transition: 'all 0.3s ease',
                boxShadow: completed ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
              }} 
            />
          ))}
          <span style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginLeft: '8px'
          }}>
            {completedInSet}/{interval}
          </span>
        </div>

        {/* Weekly Stats - Secondary Information */}
        <div style={{
          width: '100%',
          padding: '20px',
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--surface-border)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text)',
            textAlign: 'center'
          }}>
            📊 Estadísticas de la semana
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: 12,
            justifyItems: 'center'
          }}>
            <StatChip label="🍅 Pomos" value={stats.pomodoros_completed} />
            <StatChip label="⏱️ Min foco" value={stats.pomo_work_min} />
            <StatChip label="☕ Descansos" value={stats.breaks_completed} />
            <StatChip label="⏸️ Pausas" value={stats.pauses} />
          </div>
        </div>

        {/* Settings - Collapsible Section */}
        <details style={{ width: '100%' }}>
          <summary style={{
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--surface-border)',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text)',
            textAlign: 'center',
            listStyle: 'none',
            userSelect: 'none'
          }}>
            ⚙️ Configuración
          </summary>
          
          <div style={{
            marginTop: '16px',
            padding: '24px',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--surface-border)'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 20,
              alignItems: 'start'
            }}>
              <label style={labelStyle}>
                ⏱️ Trabajo (minutos)
                <input 
                  type="number" 
                  step={testMode ? 0.1 : 1} 
                  min={testMode ? 0.1 : 10} 
                  max={60} 
                  value={workMin} 
                  onChange={(e)=> setWorkMin(clampNum(e.target.value, testMode ? 0.1 : 10, 60, testMode))} 
                  style={inputStyle} 
                />
              </label>
              
              <label style={labelStyle}>
                ☕ Descanso corto (minutos)
                <input 
                  type="number" 
                  step={testMode ? 0.1 : 1} 
                  min={testMode ? 0.1 : 3} 
                  max={30} 
                  value={shortBreakMin} 
                  onChange={(e)=> setShortBreakMin(clampNum(e.target.value, testMode ? 0.1 : 3, 30, testMode))} 
                  style={inputStyle} 
                />
              </label>
              
              <label style={labelStyle}>
                🛋️ Descanso largo (minutos)
                <input 
                  type="number" 
                  step={testMode ? 0.1 : 1} 
                  min={testMode ? 0.1 : 5} 
                  max={60} 
                  value={longBreakMin} 
                  onChange={(e)=> setLongBreakMin(clampNum(e.target.value, testMode ? 0.1 : 5, 60, testMode))} 
                  style={inputStyle} 
                />
              </label>
              
              <label style={labelStyle}>
                🔄 Pomodoros por set
                <input 
                  type="number" 
                  min={2} 
                  max={8} 
                  value={interval} 
                  onChange={(e)=> setIntervalVal(clampInt(e.target.value, 2, 8))} 
                  style={inputStyle} 
                />
              </label>
              
              <label style={labelStyle}>
                📋 Cuadrante Eisenhower
                <select 
                  value={quadrant} 
                  onChange={(e)=> setQuadrant(e.target.value)} 
                  style={{ ...inputStyle, height: 40 }}
                >
                  <option value={Quadrant.Q1}>Q1 - Urgente e Importante</option>
                  <option value={Quadrant.Q2}>Q2 - No urgente, Importante</option>
                  <option value={Quadrant.Q3}>Q3 - Urgente, No importante</option>
                  <option value={Quadrant.Q4}>Q4 - No urgente, No importante</option>
                </select>
              </label>
            </div>
            
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'var(--surface-hover)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '8px'
              }}>
                🤖 Automatización
              </h4>
              
              <label style={{ 
                ...labelStyle, 
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center', 
                gap: 12,
                fontSize: 14
              }}>
                <input 
                  type="checkbox" 
                  checked={autoStartBreak} 
                  onChange={(e)=> setAutoStartBreak(e.target.checked)}
                  style={{ width: 'auto' }}
                /> 
                Iniciar descansos automáticamente
              </label>
              
              <label style={{ 
                ...labelStyle, 
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center', 
                gap: 12,
                fontSize: 14
              }}>
                <input 
                  type="checkbox" 
                  checked={autoStartNext} 
                  onChange={(e)=> setAutoStartNext(e.target.checked)}
                  style={{ width: 'auto' }}
                /> 
                Iniciar siguiente trabajo automáticamente
              </label>
              
              <label style={labelStyle}>
                🔔 Notificaciones
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input 
                    type="checkbox" 
                    checked={notificationsEnabled} 
                    onChange={async (e) => {
                      const enabled = e.target.checked
                      if (enabled && notificationPermission !== 'granted') {
                        const granted = await requestNotificationPermission()
                        if (granted) {
                          setNotificationsEnabled(true)
                        }
                      } else {
                        setNotificationsEnabled(enabled)
                      }
                    }}
                    style={{ marginRight: 8 }} 
                  />
                  <span style={{ fontSize: 14 }}>Habilitar notificaciones</span>
                  {notificationPermission === 'denied' && (
                    <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 8 }}>
                      Bloqueadas por el navegador
                    </span>
                  )}
                </div>
              </label>
              
              <label style={labelStyle}>
                🔊 Audio
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input 
                    type="checkbox" 
                    checked={audioEnabled} 
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                    style={{ marginRight: 8 }} 
                  />
                  <span style={{ fontSize: 14 }}>Sonidos de notificación</span>
                  <button 
                    type="button"
                    onClick={() => playNotificationSound('complete')}
                    style={{
                      ...btnGhost,
                      fontSize: '12px',
                      padding: '4px 8px',
                      marginLeft: 8
                    }}
                  >
                    🔊 Probar
                  </button>
                </div>
              </label>
            </div>
          </div>
        </details>
      </div>
    )
  }
}

      {/* Main Timer Display - Prominent and Circular with Enhanced Progress */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Enhanced Circular Progress Ring */}
        <div style={{
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: `conic-gradient(from -90deg, ${getPhaseColor(phase)} ${progressPercentage}%, var(--surface-border) 0%)`,
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 32px ${getPhaseColor(phase)}20, 0 0 0 2px ${getPhaseColor(phase)}10`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: phase === 'work' ? 'scale(1.02)' : 'scale(1)'
        }}>
          {/* Progress Ring Overlay for Smoother Animation */}
          <div style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'transparent',
            border: `4px solid transparent`,
            borderTopColor: getPhaseColor(phase),
            transform: `rotate(${(progressPercentage * 3.6) - 90}deg)`,
            transition: 'transform 1s ease-out',
            opacity: 0.3
          }} />
          
          <div style={{
            width: '264px',
            height: '264px',
            borderRadius: '50%',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}>
            {/* Progress Percentage Display */}
            <div style={{
              position: 'absolute',
              top: '20px',
              fontSize: '14px',
              fontWeight: 700,
              color: getPhaseColor(phase),
              opacity: phase === 'idle' ? 0 : 1,
              transition: 'all 0.3s ease'
            }}>
              {phase !== 'idle' && `${Math.round(progressPercentage)}%`}
            </div>
            
            {/* Enhanced Timer Display */}
            <div style={{ 
              fontSize: '72px', 
              fontWeight: 900, 
              textAlign: 'center', 
              letterSpacing: '-2px',
              color: phase === 'idle' ? 'var(--text)' : getPhaseColor(phase),
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'color 0.5s ease, transform 0.3s ease',
              transform: phase === 'work' && leftSec <= 60 ? 'scale(1.1)' : 'scale(1)'
            }} aria-live="polite">
              {fmt(leftSec)}
            </div>
            
            {/* Animated Phase Label */}
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.3s ease',
              opacity: 0.8
            }}>
              {phase === 'idle' && 'Listo para comenzar'}
              {phase === 'work' && '🔥 Tiempo de enfoque'}
              {phase === 'break_short' && '☕ Descanso corto'}
              {phase === 'break_long' && '🛋️ Descanso largo'}
              {phase === 'paused' && '⏸️ En pausa'}
            </div>
            
            {/* Time Remaining Indicator */}
            {phase !== 'idle' && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                opacity: 0.6,
                transition: 'all 0.3s ease'
              }}>
                {Math.ceil(leftSec / 60)} min restantes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Controls - Prominent */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {(phase === 'idle') && (
          <button type="button" onClick={startWork} style={{
            ...btnPrimary,
            fontSize: '18px',
            padding: '16px 32px',
            borderRadius: '50px',
            minWidth: '240px',
            height: '56px',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
            animation: 'glow 3s ease-in-out infinite'
          }}>
            <span style={{ fontSize: '20px' }}>🍅</span>
            <span>Comenzar sesión de enfoque</span>
          </button>
        )}
        {(phase === 'work') && (
          <>
            <button type="button" onClick={pause} style={{
              ...btnSecondary,
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '50px',
              minWidth: '160px',
              transition: 'all 0.3s ease',
              animation: leftSec <= 60 ? 'countdown-warning 1s ease-in-out infinite' : 'none'
            }}>
              <span style={{ fontSize: '16px' }}>⏸️</span>
              <span>Pausar sesión</span>
            </button>
            <button type="button" onClick={reset} style={{
              ...btnDestructive,
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '50px',
              minWidth: '160px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '16px' }}>🚫</span>
              <span>Finalizar sesión</span>
            </button>
          </>
        )}
        {(phase === 'paused') && (
          <>
            <button type="button" onClick={resume} style={{
              ...btnPrimary,
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '50px',
              minWidth: '160px',
              transition: 'all 0.3s ease',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <span style={{ fontSize: '16px' }}>▶️</span>
              <span>Reanudar sesión</span>
            </button>
            <button type="button" onClick={reset} style={{
              ...btnDestructive,
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '50px',
              minWidth: '160px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '16px' }}>�</span>
              <span>Detener sesión</span>
            </button>
          </>
        )}
        {(phase === 'break_short' || phase === 'break_long') && (
          <>
            <button type="button" onClick={skip} style={{
              ...(phase === 'break_short' ? btnSuccess : btnInfo),
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '50px',
              minWidth: '180px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '16px' }}>⏭️</span>
              <span>Terminar descanso</span>
            </button>
            <button type="button" onClick={reset} style={{
              ...btnDestructive,
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '50px',
              minWidth: '180px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '16px' }}>🚫</span>
              <span>Salir del Pomodoro</span>
            </button>
          </>
        )}
        {testMode && (
          <button type="button" aria-label="Completar ahora (test)" onClick={onPhaseComplete} style={{
            ...btnGhost,
            fontSize: '12px',
            padding: '8px 16px',
            gap: '4px'
          }}>
            <span style={{ fontSize: '12px' }}>⚡</span>
            <span>Completar ahora</span>
          </button>
        )}
      </div>

      {/* Progress Dots - Visual Feedback */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '24px',
        border: '1px solid var(--surface-border)'
      }} aria-label="Progreso del set de Pomodoros">
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginRight: '8px'
        }}>
          Set actual:
        </span>
        {dots.map((completed, i) => (
          <div 
            key={i} 
            title={`Pomodoro ${i+1}${completed ? ' (completado)' : ''}`} 
            style={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%', 
              background: completed ? 'var(--primary)' : 'var(--surface-border)', 
              border: `2px solid ${completed ? 'var(--primary)' : 'var(--surface-border)'}`,
              transition: 'all 0.3s ease',
              boxShadow: completed ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
            }} 
          />
        ))}
        <span style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginLeft: '8px'
        }}>
          {completedInSet}/{interval}
        </span>
      </div>

      {/* Weekly Stats - Secondary Information */}
      <div style={{
        width: '100%',
        padding: '20px',
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--surface-border)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text)',
          textAlign: 'center'
        }}>
          📊 Estadísticas de la semana
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: 12,
          justifyItems: 'center'
        }}>
          <StatChip label="🍅 Pomos" value={stats.pomodoros_completed} />
          <StatChip label="⏱️ Min foco" value={stats.pomo_work_min} />
          <StatChip label="☕ Descansos" value={stats.breaks_completed} />
          <StatChip label="⏸️ Pausas" value={stats.pauses} />
        </div>
      </div>

      {/* Settings - Collapsible Section */}
      <details style={{ width: '100%' }}>
        <summary style={{
          padding: '16px',
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--surface-border)',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text)',
          textAlign: 'center',
          listStyle: 'none',
          userSelect: 'none'
        }}>
          ⚙️ Configuración
        </summary>
        
        <div style={{
          marginTop: '16px',
          padding: '24px',
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--surface-border)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 20,
            alignItems: 'start'
          }}>
            <label style={labelStyle}>
              ⏱️ Trabajo (minutos)
              <input 
                type="number" 
                step={testMode ? 0.1 : 1} 
                min={testMode ? 0.1 : 10} 
                max={60} 
                value={workMin} 
                onChange={(e)=> setWorkMin(clampNum(e.target.value, testMode ? 0.1 : 10, 60, testMode))} 
                style={inputStyle} 
              />
            </label>
            
            <label style={labelStyle}>
              ☕ Descanso corto (minutos)
              <input 
                type="number" 
                step={testMode ? 0.1 : 1} 
                min={testMode ? 0.1 : 3} 
                max={30} 
                value={shortBreakMin} 
                onChange={(e)=> setShortBreakMin(clampNum(e.target.value, testMode ? 0.1 : 3, 30, testMode))} 
                style={inputStyle} 
              />
            </label>
            
            <label style={labelStyle}>
              🛋️ Descanso largo (minutos)
              <input 
                type="number" 
                step={testMode ? 0.1 : 1} 
                min={testMode ? 0.1 : 5} 
                max={60} 
                value={longBreakMin} 
                onChange={(e)=> setLongBreakMin(clampNum(e.target.value, testMode ? 0.1 : 5, 60, testMode))} 
                style={inputStyle} 
              />
            </label>
            
            <label style={labelStyle}>
              🔄 Pomodoros por set
              <input 
                type="number" 
                min={2} 
                max={8} 
                value={interval} 
                onChange={(e)=> setIntervalVal(clampInt(e.target.value, 2, 8))} 
                style={inputStyle} 
              />
            </label>
            
            <label style={labelStyle}>
              📋 Cuadrante Eisenhower
              <select 
                value={quadrant} 
                onChange={(e)=> setQuadrant(e.target.value)} 
                style={{ ...inputStyle, height: 40 }}
              >
                <option value={Quadrant.Q1}>Q1 - Urgente e Importante</option>
                <option value={Quadrant.Q2}>Q2 - No urgente, Importante</option>
                <option value={Quadrant.Q3}>Q3 - Urgente, No importante</option>
                <option value={Quadrant.Q4}>Q4 - No urgente, No importante</option>
              </select>
            </label>
          </div>
          
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--surface-hover)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '8px'
            }}>
              🤖 Automatización
            </h4>
            
            <label style={{ 
              ...labelStyle, 
              display: 'flex', 
              flexDirection: 'row',
              alignItems: 'center', 
              gap: 12,
              fontSize: 14
            }}>
              <input 
                type="checkbox" 
                checked={autoStartBreak} 
                onChange={(e)=> setAutoStartBreak(e.target.checked)}
                style={{ width: 'auto' }}
              /> 
              Iniciar descansos automáticamente
            </label>
            
            <label style={{ 
              ...labelStyle, 
              display: 'flex', 
              flexDirection: 'row',
              alignItems: 'center', 
              gap: 12,
              fontSize: 14
            }}>
              <input 
                type="checkbox" 
                checked={autoStartNext} 
                onChange={(e)=> setAutoStartNext(e.target.checked)}
                style={{ width: 'auto' }}
              /> 
              Iniciar siguiente trabajo automáticamente
            </label>
            
            <label style={labelStyle}>
              🔔 Notificaciones
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled} 
                  onChange={async (e) => {
                    const enabled = e.target.checked
                    if (enabled && notificationPermission !== 'granted') {
                      const granted = await requestNotificationPermission()
                      if (granted) {
                        setNotificationsEnabled(true)
                      }
                    } else {
                      setNotificationsEnabled(enabled)
                    }
                  }}
                  style={{ marginRight: 8 }} 
                />
                <span style={{ fontSize: 14 }}>Habilitar notificaciones</span>
                {notificationPermission === 'denied' && (
                  <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 8 }}>
                    Bloqueadas por el navegador
                  </span>
                )}
              </div>
            </label>
            
            <label style={labelStyle}>
              🔊 Audio
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  checked={audioEnabled} 
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  style={{ marginRight: 8 }} 
                />
                <span style={{ fontSize: 14 }}>Sonidos de notificación</span>
                <button 
                  type="button"
                  onClick={() => playNotificationSound('complete')}
                  style={{
                    ...btnGhost,
                    fontSize: '12px',
                    padding: '4px 8px',
                    marginLeft: 8
                  }}
                >
                  🔊 Probar
                </button>
              </div>
            </label>
            
            <label style={labelStyle}>
              � Notificaciones
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled} 
                  onChange={async (e) => {
                    const enabled = e.target.checked
                    if (enabled && notificationPermission !== 'granted') {
                      const granted = await requestNotificationPermission()
                      if (granted) {
                        setNotificationsEnabled(true)
                      }
                    } else {
                      setNotificationsEnabled(enabled)
                    }
                  }}
                  style={{ marginRight: 8 }} 
                />
                <span style={{ fontSize: 14 }}>Habilitar notificaciones</span>
                {notificationPermission === 'denied' && (
                  <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 8 }}>
                    Bloqueadas por el navegador
                  </span>
                )}
              </div>
            </label>
            
            <label style={labelStyle}>
              🔊 Audio
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  checked={audioEnabled} 
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  style={{ marginRight: 8 }} 
                />
                <span style={{ fontSize: 14 }}>Sonidos de notificación</span>
                <button 
                  type="button"
                  onClick={() => playNotificationSound('complete')}
                  style={{
                    ...btnGhost,
                    fontSize: '12px',
                    padding: '4px 8px',
                    marginLeft: 8
                  }}
                >
                  🔊 Probar
                </button>
              </div>
            </label>
          </div>
        </div>
      </details>
    </div>
  )
}

// Helpers/styles
const btnPrimary = {
  background: 'var(--primary)', 
  color: 'var(--on-primary)', 
  border: 'none', 
  padding: '12px 24px', 
  borderRadius: '50px', 
  fontWeight: 700, 
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
}

const btnSecondary = {
  background: 'var(--surface)', 
  color: 'var(--text)', 
  border: '2px solid var(--surface-border)', 
  padding: '12px 24px', 
  borderRadius: '50px', 
  fontWeight: 700, 
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease'
}

const btnDestructive = {
  background: '#dc2626',
  color: '#ffffff',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '50px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
}

const btnSuccess = {
  background: '#16a34a',
  color: '#ffffff',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '50px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
}

const btnGhost = {
  background: 'transparent', 
  color: 'var(--text-secondary)', 
  border: '1px solid var(--surface-border)', 
  padding: '8px 16px', 
  borderRadius: '20px', 
  fontWeight: 600, 
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.2s ease'
}

const btnTab = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: 'none',
  padding: '12px 20px',
  borderRadius: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease'
}

const btnTabActive = {
  background: 'var(--primary)',
  color: 'var(--on-primary)',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
}

const labelStyle = { 
  display: 'grid', 
  gap: 8, 
  fontSize: 14, 
  fontWeight: 600,
  color: 'var(--text)'
}

const inputStyle = { 
  height: 40, 
  minWidth: 80, 
  background: 'var(--surface)', 
  color: 'var(--text)', 
  border: '2px solid var(--surface-border)', 
  borderRadius: 12, 
  padding: '8px 12px',
  fontSize: '14px',
  transition: 'border-color 0.2s ease'
}

function clampInt(v, min, max){
  const n = Math.max(min, Math.min(max, parseInt(v || min, 10)))
  return Number.isFinite(n) ? n : min
}
function clampNum(v, min, max, allowFloat){
  const raw = allowFloat ? parseFloat(v || String(min)) : parseInt(v || String(min), 10)
  const n = Math.max(min, Math.min(max, raw))
  return Number.isFinite(n) ? n : min
}
function loadNumber(key, def, allowFloat=false){
  try {
    const s = localStorage.getItem(key) || ''
    const v = allowFloat ? parseFloat(s) : parseInt(s, 10)
    return Number.isFinite(v) ? v : def
  } catch { return def }
}
function loadBool(key, def){ try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return typeof v === 'boolean' ? v : def } catch { return def } }
function loadString(key, def){ try { const v = localStorage.getItem(key); return v !== null ? v : def } catch { return def } }
function isTestMode(){
  try {
    // Global flags set by E2E harness
    if (typeof window !== 'undefined' && (window.__PLAYWRIGHT__ || window.__E2E__)) {
      console.log('isTestMode: true via global flag')
      return true
    }
    const u = new URL(window.location.href)
    if (u.searchParams.get('pomo_test') === '1') {
      console.log('isTestMode: true via URL param')
      return true
    }
  } catch {}
  try {
    const res = JSON.parse(localStorage.getItem('pomo_test') || 'false')
    if (res) console.log('isTestMode: true via localStorage')
    return res
  } catch { return false }
}

function StatChip({ label, value }){
  return (
    <div style={{ 
      background: 'var(--surface-hover)', 
      border: '1px solid var(--surface-border)', 
      color: 'var(--text)', 
      padding: '12px 16px', 
      borderRadius: 16, 
      fontSize: 14, 
      fontWeight: 700,
      textAlign: 'center',
      minWidth: '100px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4
    }}>
      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--primary)' }}>
        {value ?? 0}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}

function PhaseBadge({ label, color }) {
  return (
    <div style={{
      background: color,
      color: '#ffffff',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.5px',
      boxShadow: `0 2px 8px ${color}30`,
      animation: 'pulse 2s ease-in-out infinite'
    }}>
      {label}
    </div>
  )
}
