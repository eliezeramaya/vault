import React, { useEffect } from 'react'
import { useKeyboardNavigation, useFocusRestore } from '../hooks/useKeyboardNavigation'

export default function Onboarding({ open, onClose }){
  const [step, setStep] = React.useState(0)
  const [autoAdvance, setAutoAdvance] = React.useState(false)
  // reserved ref removed (unused)
  const { saveFocus, restoreFocus } = useFocusRestore()
  
  // Enhanced keyboard navigation
  const { containerRef } = useKeyboardNavigation({
    enabled: open,
    trapFocus: true,
  onArrowKey: (key) => {
      if (key === 'ArrowRight' || key === 'ArrowLeft') {
        const delta = key === 'ArrowRight' ? 1 : -1
        setStep(s => Math.max(0, Math.min(5, s + delta)))
        return true
      }
      return false
    },
  onEnter: () => {
      if (step === 5) {
        onClose()
        return true
      }
      // Navigate to next step
      setStep(s => Math.min(5, s + 1))
      return true
    },
  onEscape: () => {
      onClose()
      return true
    },
  onSpace: () => {
      setStep(s => Math.min(5, s + 1))
      return true
    },
    customShortcuts: {
      'Home': () => { setStep(0); return true },
      'End': () => { setStep(5); return true },
      'PageUp': () => { setStep(s => Math.max(0, s - 1)); return true },
      'PageDown': () => { setStep(s => Math.min(5, s + 1)); return true },
      'a': () => { setAutoAdvance(v => !v); return true },
      'A': () => { setAutoAdvance(v => !v); return true }
    }
  })
  
  useEffect(() => {
    if (!open) return
    
    // Save focus and setup
    saveFocus()
    setStep(0)
    setAutoAdvance(false)
    
    // Focus the container
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.focus()
      }
    })
    
    // Cleanup on close
    return () => {
      if (!open) {
        restoreFocus()
      }
    }
  }, [open, saveFocus, restoreFocus, containerRef])

  // Auto-advance functionality (optional)
  useEffect(()=>{
    if(!open || !autoAdvance || step >= 5) return
    const timer = setTimeout(()=>{
      setStep(s => s + 1)
    }, 8000) // 8 seconds per step
    return ()=> clearTimeout(timer)
  }, [open, autoAdvance, step])

  if(!open) return null

  const steps = [
    {
      title: '1/6 • Bienvenido a Idea Sphere',
      desc: 'Una herramienta innovadora de gestión de ideas que combina la visualización 3D interactiva con metodologías probadas de productividad como la Matriz de Eisenhower.',
      hint: '💡 Perfecto para: brainstorming, gestión de proyectos, organización personal y visualización de conceptos complejos. Tus datos se guardan localmente para máxima privacidad.',
      icon: '🌍'
    },
    {
      title: '2/6 • Vista del Globo 3D',
      desc: 'El corazón visual de la aplicación. Crea "islas de ideas" en un espacio 3D interactivo. Arrastra para rotar la vista, rueda del ratón para zoom, doble clic para crear nuevas islas.',
      hint: '🎯 Funciones clave: Heatmap dinámico muestra densidad de ideas, conexiones automáticas entre conceptos relacionados, ajustes en tiempo real de opacidad, sigma y radio para personalizar la visualización.',
      icon: '🏝️'
    },
    {
      title: '3/6 • Matriz de Eisenhower',
      desc: 'Organiza tareas y proyectos usando la metodología probada de productividad. Eje horizontal = Urgencia, Eje vertical = Importancia. Cada cuadrante tiene un propósito estratégico específico.',
      hint: '📋 Cuadrantes: TL (Crisis - Hacer ahora), TR (Planificación - Programar), BL (Delegación - Asignar), BR (Eliminación - Evitar). Arrastra notas entre cuadrantes, edita con E, elimina con Del.',
      icon: '📊'
    },
    {
      title: '4/6 • Navegación y Herramientas',
      desc: 'Interface intuitiva con paneles especializados. Botones superiores para cambiar vistas, panel izquierdo para herramientas, derecho para filtros y configuración.',
      hint: '🔧 Características avanzadas: Filtros por texto y prioridad, búsqueda en tiempo real, modo oscuro/claro/sistema, zoom y pan inteligente, entrada rápida de ideas en barra inferior.',
      icon: '🎛️'
    },
    {
      title: '5/6 • Atajos de Productividad',
      desc: 'Flujo de trabajo optimizado con atajos de teclado intuitivos. Navegación rápida, edición eficiente y controles de vista sin usar el ratón.',
      hint: '⚡ Atajos esenciales: H (ayuda), N (nueva nota), E (editar), Del (borrar), flechas (mover), + / - (zoom), 0 (ajustar vista). Temas: Ctrl+Shift + L/D/R/T para claro/oscuro/sistema/alternar.',
      icon: '⌨️'
    },
    {
      title: '6/6 • Persistencia y Configuración',
      desc: 'Tus ideas se guardan automáticamente en el navegador (localStorage). Funciona completamente offline. Exporta/importa datos para backup o sincronización.',
      hint: '🔒 Privacidad total: Sin servidores externos, datos 100% locales. Configuración avanzada disponible para personalizar comportamiento, visualización y preferencias de usuario.',
      icon: '💾'
    }
  ]

  const overlay = {
    position:'absolute', inset:0, zIndex:30,
    background:'radial-gradient(1200px 800px at 60% 10%, rgba(240,55,93,.06), transparent 55%), rgba(10,11,20,.62)',
    backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', color:'#EAEAEA',
    display:'grid', placeItems:'center'
  }
  const card = {
    width:'min(720px,94vw)', borderRadius:20, border:'1px solid rgba(255,255,255,.12)',
    background:'linear-gradient(180deg, rgba(18,20,36,.9), rgba(10,12,24,.9))',
    boxShadow:'0 30px 100px rgba(0,0,0,.6)', padding:'28px 28px 20px',
    backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'
  }
  const iconStyle = { fontSize:32, marginBottom:12, display:'block' }
  const title = { fontSize:20, fontWeight:800, letterSpacing:.3, marginBottom:8, color:'#FFFFFF' }
  const desc = { fontSize:15, opacity:.94, lineHeight:1.7, marginBottom:4 }
  const hint = { fontSize:13, opacity:.8, marginTop:12, padding:'12px 16px', background:'rgba(240,55,93,.08)', borderRadius:10, borderLeft:'3px solid var(--primary)' }
  const bar = { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:20 }
  const progressBar = { width:'100%', height:4, background:'rgba(255,255,255,.1)', borderRadius:2, marginBottom:16, overflow:'hidden' }
  const progressFill = { width:`${((step+1)/6)*100}%`, height:'100%', background:'linear-gradient(90deg, var(--primary), #ff6b9d)', borderRadius:2, transition:'width 0.3s ease' }
  const dots = { display:'flex', gap:6 }
  const dot = (i)=>({ 
    width:8, height:8, borderRadius:20, 
    background: i===step? 'var(--primary)' : i<step? 'rgba(240,55,93,.6)' : 'rgba(255,255,255,.2)', 
    boxShadow: i===step? '0 0 12px rgba(240,55,93,.4)': 'none',
    transition: 'all 0.3s ease'
  })
  const btn = (primary)=>({
    background: primary? 'linear-gradient(135deg, var(--primary), #ff6b9d)' : 'rgba(255,255,255,.05)', 
    color: primary? 'var(--on-primary)' : '#EAEAEA',
    border: primary? 'none' : '1px solid rgba(255,255,255,.2)', 
    padding:'12px 18px', borderRadius:12, fontWeight:700, cursor:'pointer',
    transition: 'all 0.2s ease',
    boxShadow: primary? '0 4px 20px rgba(240,55,93,.3)' : 'none'
  })

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="obTitle" ref={containerRef} tabIndex={-1}>
      <div style={card}>
        <div style={progressBar} role="progressbar" aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={6} aria-label="Progreso del tutorial">
          <div style={progressFill}></div>
        </div>
        <span style={iconStyle} aria-hidden="true">{steps[step].icon}</span>
        <div id="obTitle" style={title}>{steps[step].title}</div>
        <div style={desc}>{steps[step].desc}</div>
        <div style={hint}>{steps[step].hint}</div>
        <div style={bar}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={dots} aria-label={`Paso ${step+1} de 6 - ${steps[step].title}`}>
              {[0,1,2,3,4,5].map(i=> <div key={i} style={dot(i)} aria-hidden="true" />)}
            </div>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:11, opacity:.7, cursor:'pointer'}}>
              <input 
                type="checkbox" 
                checked={autoAdvance} 
                onChange={(e)=>setAutoAdvance(e.target.checked)}
                style={{margin:0}}
              />
              Auto-avanzar
            </label>
          </div>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <span style={{fontSize:11, opacity:.6}}>← → PgUp/PgDn SPACE ENTER ESC • A (auto) • Home/End</span>
            <button 
              type="button" 
              style={{...btn(false), outline:'none'}} 
              onClick={onClose} 
              aria-label="Omitir tutorial"
              onFocus={(e) => e.target.style.outline = '2px solid var(--accent)'}
              onBlur={(e) => e.target.style.outline = 'none'}
            >
              Omitir
            </button>
            {step>0 && 
              <button 
                type="button" 
                style={{...btn(false), outline:'none'}} 
                onClick={()=>setStep(s=>s-1)} 
                aria-label="Paso anterior"
                onFocus={(e) => e.target.style.outline = '2px solid var(--accent)'}
                onBlur={(e) => e.target.style.outline = 'none'}
              >
                Anterior
              </button>
            }
            {step<5 ? (
              <button 
                type="button" 
                style={{...btn(true), outline:'none'}} 
                onClick={()=>setStep(s=>s+1)} 
                aria-label="Siguiente paso"
                onFocus={(e) => e.target.style.outline = '2px solid white'}
                onBlur={(e) => e.target.style.outline = 'none'}
              >
                Siguiente
              </button>
            ) : (
              <button 
                type="button" 
                style={{...btn(true), outline:'none'}} 
                onClick={onClose} 
                aria-label="Completar tutorial y empezar"
                onFocus={(e) => e.target.style.outline = '2px solid white'}
                onBlur={(e) => e.target.style.outline = 'none'}
              >
                ¡Empezar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
