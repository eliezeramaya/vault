import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Quadrant, startFocus, endFocus, logEvent, weekKey } from '../lib/metrics'
import { pomodoroStats } from '../lib/metrics'
import PomodoroStats from './PomodoroStats.jsx'
import PomodoroAchievements from './PomodoroAchievements.jsx'

// Tooltip Component for contextual help
function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'absolute',
          zIndex: 1000,
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          color: 'var(--text)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '200px',
          whiteSpace: 'normal',
          lineHeight: '1.4',
          ...(position === 'top' ? {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px'
          } : {
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px'
          })
        }}>
          {content}
          <div style={{
            position: 'absolute',
            ...(position === 'top' ? {
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--surface-border)'
            } : {
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid var(--surface-border)'
            })
          }} />
        </div>
      )}
    </div>
  )
}

/**
 * PomodoroPanel with Enhanced UX/UI and Gamification
 * - Tab-based interface: Timer, Stats, Achievements
 * - Improved settings panel with tooltips and better UX
 * - Work/break cycles with visual feedback
 * - Comprehensive metrics and achievement system
 */
export default function PomodoroPanel(){
  const testMode = isTestMode()
  console.log('PomodoroPanel render, testMode:', testMode)
  
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

  // UI state
  const [activeTab, setActiveTab] = useState(()=> loadString('pomo_active_tab', 'timer'))
  const [settingsOpen, setSettingsOpen] = useState(()=> loadBool('pomo_settings_open', false))

  // Runtime state
  const [phase, setPhase] = useState('idle') // idle | work | break_short | break_long | paused
  const [leftSec, setLeftSec] = useState(workMin * 60)
  const [completedInSet, setCompletedInSet] = useState(0)
  const [targetMin, setTargetMin] = useState(workMin)
  const [quadrant, setQuadrant] = useState(Quadrant.Q2)
  const tickRef = useRef(null)
  const sessionRef = useRef(null)
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
  useEffect(()=>{ try { localStorage.setItem('pomo_settings_open', JSON.stringify(settingsOpen)) } catch {} }, [settingsOpen])

  // Cleanup
  useEffect(()=>()=>{ if (tickRef.current) clearInterval(tickRef.current) }, [])

  // Add CSS animations for enhanced UX
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
      @keyframes tab-switch {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .tab-content {
        animation: tab-switch 0.3s ease-out;
      }
      .metric-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .metric-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  // Derived values
  const dots = useMemo(()=> Array.from({ length: interval }, (_, i)=> i < completedInSet), [interval, completedInSet])

  const fmt = (s)=>{
    const m = Math.floor(s/60)
    const ss = String(s%60).padStart(2,'0')
    return `${m}:${ss}`
  }

  const progressPercentage = useMemo(()=> {
    if (phase === 'idle') return 0
    const totalSec = targetMin * 60
    const elapsedSec = totalSec - leftSec
    return Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100))
  }, [leftSec, targetMin, phase])

  const getPhaseColor = (currentPhase) => {
    switch(currentPhase) {
      case 'work': return '#ef4444'
      case 'break_short': return '#22c55e'
      case 'break_long': return '#0ea5e9'
      case 'paused': return '#a3a3a3'
      default: return '#e5e5e5'
    }
  }

  // Timer functions
  const startTick = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    const TICK_MS = testMode ? 100 : 1000
    let warningShown = false
    
    tickRef.current = setInterval(()=> setLeftSec(x=> {
      if (!warningShown && x === 60 && phase === 'work') {
        warningShown = true
        showNotification('⏰ ¡Último minuto!', 'Queda 1 minuto para completar este Pomodoro')
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

  const onPhaseComplete = ()=>{
    if (phase === 'work'){
      if (sessionRef.current) {
        endFocus(sessionRef.current, { actual_min: targetMin, interruptions: 0 })
        sessionRef.current = null
      }
      
      const history = JSON.parse(localStorage.getItem('pomodoroHistory') || '[]')
      history.push({ date: new Date().toISOString(), completed: true })
      localStorage.setItem('pomodoroHistory', JSON.stringify(history))
      
      logEvent('pomodoro_complete', { work_min: targetMin, quadrant })
      setCompletedInSet(x=> x+1)
      
      const isLongBreak = (completedInSet + 1) >= interval
      const breakMin = isLongBreak ? longBreakMin : shortBreakMin
      const nextPhase = isLongBreak ? 'break_long' : 'break_short'
      
      showNotification('🎉 ¡Pomodoro completado!', `¡Excelente trabajo! Hora de ${isLongBreak ? 'un descanso largo' : 'un descanso corto'}`)
      playNotificationSound('complete')
      
      if (autoStartBreak) {
        startBreak(nextPhase, breakMin)
      } else {
        setPhase('idle')
        setLeftSec(breakMin * 60)
        setTargetMin(breakMin)
      }
      
      if (isLongBreak) setCompletedInSet(0)
    } else if (phase.startsWith('break')) {
      logEvent('break_complete', { break_min: targetMin, type: phase })
      
      showNotification('✨ Descanso terminado', '¿Listo para otra sesión de enfoque?')
      playNotificationSound('break_end')
      
      if (autoStartNext) {
        startWork()
      } else {
        setPhase('idle')
        setLeftSec(workMin * 60)
        setTargetMin(workMin)
      }
    }
    
    setStats(pomodoroStats(weekKey()))
  }

  const startWork = ()=>{
    const session = startFocus({ quadrant, planned_min: workMin, source: 'pomodoro' })
    sessionRef.current = session
    
    setPhase('work')
    setLeftSec(workMin * 60)
    setTargetMin(workMin)
    startTick()
    
    showNotification('🍅 Sesión iniciada', 'Tiempo de concentración profunda')
    playNotificationSound('start')
  }

  const startBreak = (breakType, minutes)=>{
    setPhase(breakType)
    setLeftSec(minutes * 60)
    setTargetMin(minutes)
    startTick()
  }

  const stopWork = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    
    if (sessionRef.current) {
      const actualMin = Math.max(1, Math.round((targetMin * 60 - leftSec) / 60))
      endFocus(sessionRef.current, { actual_min: actualMin, interruptions: 1 })
      sessionRef.current = null
    }
    
    logEvent('pomodoro_stop', { elapsed_min: Math.round((targetMin * 60 - leftSec) / 60) })
    setPhase('idle')
    setLeftSec(workMin * 60)
    setTargetMin(workMin)
    setStats(pomodoroStats(weekKey()))
  }

  const pauseTimer = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    setPhase('paused')
    logEvent('pomodoro_pause', { remaining_sec: leftSec })
  }

  const resumeTimer = ()=>{
    const wasBreak = phase === 'paused' && (sessionRef.current === null)
    setPhase(wasBreak ? (targetMin > 10 ? 'break_long' : 'break_short') : 'work')
    startTick()
    logEvent('pomodoro_resume', { remaining_sec: leftSec })
  }

  const resetTimer = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    if (sessionRef.current) {
      endFocus(sessionRef.current, { actual_min: 0, interruptions: 1 })
      sessionRef.current = null
    }
    setPhase('idle')
    setLeftSec(workMin * 60)
    setTargetMin(workMin)
    logEvent('pomodoro_reset')
  }

  const skipBreak = ()=>{
    if (tickRef.current) clearInterval(tickRef.current)
    logEvent('break_skip', { remaining_sec: leftSec })
    
    if (autoStartNext) {
      startWork()
    } else {
      setPhase('idle')
      setLeftSec(workMin * 60)
      setTargetMin(workMin)
    }
  }

  // Notification functions
  const showNotification = (title, body) => {
    if (!notificationsEnabled || notificationPermission !== 'granted') return
    
    const notification = new Notification(title, {
      body,
      icon: '/vault/icons/icon-192x192.png',
      badge: '/vault/icons/icon-192x192.png',
      requireInteraction: false
    })
    
    setTimeout(() => notification.close(), 5000)
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false
    
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    return permission === 'granted'
  }

  const playNotificationSound = (type) => {
    if (!audioEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      const frequencies = {
        start: [523.25, 659.25, 783.99],
        complete: [523.25, 659.25, 783.99, 1046.50],
        warning: [440, 554.37],
        break_end: [392, 493.88, 587.33]
      }
      
      const freq = frequencies[type] || frequencies.start
      
      freq.forEach((f, i) => {
        setTimeout(() => {
          oscillator.frequency.setValueAtTime(f, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          
          if (i === 0) oscillator.start(audioContext.currentTime)
          if (i === freq.length - 1) oscillator.stop(audioContext.currentTime + 0.3)
        }, i * 150)
      })
    } catch (error) {
      console.log('Audio playback failed:', error)
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
      <div style={{ width: '100%' }} className="tab-content">
        {activeTab === 'timer' && renderTimerTab()}
        {activeTab === 'stats' && <PomodoroStats />}
        {activeTab === 'achievements' && <PomodoroAchievements />}
      </div>
    </div>
  )

  // Timer tab content
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
              {/* Progress Percentage */}
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
              
              {/* Target Duration */}
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

        {/* Control Buttons */}
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

        {/* Progress Indicator */}
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

        {/* Enhanced Settings Panel */}
        <div style={{ width: '100%' }}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: settingsOpen ? 'var(--surface-hover)' : 'var(--surface)',
              borderRadius: '12px',
              border: `2px solid ${settingsOpen ? 'var(--primary)' : 'var(--surface-border)'}`,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text)',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: settingsOpen ? '0 2px 8px rgba(239, 68, 68, 0.1)' : 'none'
            }}
          >
            <span style={{ 
              fontSize: '16px',
              transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}>⚙️</span>
            <span>Configuración avanzada</span>
            <span style={{ 
              fontSize: '12px',
              transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}>▼</span>
          </button>
          
          {settingsOpen && (
            <div style={{
              marginTop: '16px',
              padding: '24px',
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--surface-border)',
              animation: 'tab-switch 0.3s ease-out'
            }}>
              {/* Timing Configuration */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'var(--surface-hover)',
                borderRadius: '12px'
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⏱️ Configuración de tiempo
                </h4>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: 16,
                  alignItems: 'start'
                }}>
                  <Tooltip content="Duración de cada sesión de trabajo enfocado. Recomendado: 25 minutos para máxima concentración.">
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
                  </Tooltip>
                  
                  <Tooltip content="Descanso entre sesiones de trabajo. Ideal para relajar la mente manteniendo el ritmo.">
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
                  </Tooltip>
                  
                  <Tooltip content="Descanso más largo después de completar un set completo. Tiempo para recargar energías.">
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
                  </Tooltip>
                  
                  <Tooltip content="Número de pomodoros antes del descanso largo. El estándar es 4 para mantener un ritmo sostenible.">
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
                  </Tooltip>
                </div>
              </div>
              
              {/* Priority Matrix */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'var(--surface-hover)',
                borderRadius: '12px'
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📋 Matriz de Prioridades Eisenhower
                </h4>
                
                <Tooltip 
                  content="Q1: Crisis, emergencias, proyectos con fecha límite • Q2: Prevención, planificación, desarrollo personal • Q3: Interrupciones, llamadas no importantes, algunas reuniones • Q4: Trivialidades, pérdidas de tiempo, redes sociales"
                  position="bottom"
                >
                  <label style={labelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      📋 Cuadrante actual
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ℹ️</span>
                    </div>
                    <select 
                      value={quadrant} 
                      onChange={(e)=> setQuadrant(e.target.value)} 
                      style={{ ...inputStyle, height: 40 }}
                    >
                      <option value={Quadrant.Q1}>🔴 Q1 - Urgente e Importante (Crisis)</option>
                      <option value={Quadrant.Q2}>🟢 Q2 - No urgente, Importante (Enfoque)</option>
                      <option value={Quadrant.Q3}>🟡 Q3 - Urgente, No importante (Interrupciones)</option>
                      <option value={Quadrant.Q4}>⚪ Q4 - No urgente, No importante (Distracción)</option>
                    </select>
                  </label>
                </Tooltip>
                
                {/* Visual Quadrant Guide */}
                <div style={{
                  marginTop: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  fontSize: '11px'
                }}>
                  <div style={{
                    padding: '8px',
                    background: quadrant === Quadrant.Q1 ? '#fee2e2' : 'var(--surface)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: 700, color: '#dc2626' }}>Q1 - Hacer</div>
                    <div style={{ fontSize: '10px', color: '#7f1d1d' }}>Urgente + Importante</div>
                  </div>
                  <div style={{
                    padding: '8px',
                    background: quadrant === Quadrant.Q2 ? '#dcfce7' : 'var(--surface)',
                    border: '1px solid #22c55e',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>Q2 - Planificar</div>
                    <div style={{ fontSize: '10px', color: '#14532d' }}>No urgente + Importante</div>
                  </div>
                  <div style={{
                    padding: '8px',
                    background: quadrant === Quadrant.Q3 ? '#fef3c7' : 'var(--surface)',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: 700, color: '#d97706' }}>Q3 - Delegar</div>
                    <div style={{ fontSize: '10px', color: '#92400e' }}>Urgente + No importante</div>
                  </div>
                  <div style={{
                    padding: '8px',
                    background: quadrant === Quadrant.Q4 ? '#f3f4f6' : 'var(--surface)',
                    border: '1px solid #9ca3af',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: 700, color: '#6b7280' }}>Q4 - Eliminar</div>
                    <div style={{ fontSize: '10px', color: '#4b5563' }}>No urgente + No importante</div>
                  </div>
                </div>
              </div>
              
              {/* Automation & Notifications */}
              <div style={{
                padding: '16px',
                background: 'var(--surface-hover)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🤖 Automatización & Notificaciones
                </h4>
                
                <Tooltip content="Inicia automáticamente el descanso cuando termina una sesión de trabajo, sin necesidad de hacer clic.">
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
                    <span>Iniciar descansos automáticamente</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ℹ️</span>
                  </label>
                </Tooltip>
                
                <Tooltip content="Continúa con la siguiente sesión de trabajo automáticamente después del descanso.">
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
                    <span>Iniciar siguiente trabajo automáticamente</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ℹ️</span>
                  </label>
                </Tooltip>
                
                <Tooltip content="Recibe notificaciones del sistema cuando completas sesiones, cuando queda 1 minuto, y al finalizar descansos.">
                  <label style={labelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      🔔 Notificaciones del sistema
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ℹ️</span>
                    </div>
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
                </Tooltip>
                
                <Tooltip content="Reproduce sonidos distintivos para inicio de sesión, finalización, alertas y descansos.">
                  <label style={labelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      🔊 Sonidos de notificación
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ℹ️</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={audioEnabled} 
                        onChange={(e) => setAudioEnabled(e.target.checked)}
                        style={{ marginRight: 8 }} 
                      />
                      <span style={{ fontSize: 14 }}>Habilitar sonidos</span>
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
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}

// Button styles
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

// Helper functions
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

function loadBool(key, def){ 
  try { 
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    return typeof v === 'boolean' ? v : def 
  } catch { return def } 
}

function loadString(key, def){ 
  try { 
    const v = localStorage.getItem(key)
    return v !== null ? v : def 
  } catch { return def } 
}

function isTestMode(){
  try {
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
    <div className="metric-card" style={{ 
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