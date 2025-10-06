import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useHapticFeedback } from '../../hooks/useHapticFeedback'
import { useTouchGestures } from '../../hooks/useTouchGestures'
import './MobileTutorial.css'

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenido a Sphere Vault',
    description: 'Tu matriz de productividad personal con gestos táctiles intuitivos',
    position: 'center',
    icon: '👋',
    gestures: [],
    autoAdvance: 3000,
    tips: ['Sphere Vault te ayuda a organizar tareas usando la Matriz de Eisenhower',
           'Aprovecha los gestos táctiles para una experiencia más fluida']
  },
  {
    id: 'navigation-intro',
    title: 'Navegación Móvil',
    description: 'Usa la barra inferior para moverte entre vistas o desliza horizontalmente',
    position: 'bottom',
    icon: '�',
    gestures: [
      { type: 'swipe', direction: 'left', description: 'Vista anterior' },
      { type: 'swipe', direction: 'right', description: 'Vista siguiente' }
    ],
    tips: ['Toca los iconos en la barra inferior',
           'O desliza izquierda/derecha en cualquier parte']
  },
  {
    id: 'matrix-overview',
    title: 'Matriz de Eisenhower',
    description: 'Organiza tus tareas en 4 cuadrantes: Urgente-Importante, Importante, Urgente, y Ni urgente ni importante',
    position: 'center',
    icon: '🎯',
    gestures: [
      { type: 'tap', description: 'Tocar para seleccionar cuadrante' }
    ],
    tips: ['Verde: Hacer (Urgente + Importante)',
           'Azul: Decidir (Importante)',
           'Amarillo: Delegar (Urgente)',
           'Gris: Eliminar (Ni urgente ni importante)']
  },
  {
    id: 'create-notes',
    title: 'Crear Tareas',
    description: 'Mantén pulsado en cualquier cuadrante para crear una nueva tarea',
    position: 'center',
    icon: '✨',
    gestures: [
      { type: 'longpress', description: 'Mantén pulsado para crear' },
      { type: 'tap', description: 'Usar entrada rápida inferior' }
    ],
    tips: ['Long press: Crear en posición específica',
           'Entrada rápida: Crear y posicionar después'],
    requiresGesture: true,
    gestureType: 'longpress'
  },
  {
    id: 'move-notes',
    title: 'Mover Tareas',
    description: 'Arrastra las tareas entre cuadrantes para reorganizar tu prioridad',
    position: 'center',
    icon: '�',
    gestures: [
      { type: 'drag', description: 'Arrastra para mover' },
      { type: 'doubletap', description: 'Doble toque para editar' }
    ],
    tips: ['Arrastra cualquier tarea a otro cuadrante',
           'Doble toque para editar el contenido'],
    requiresGesture: true,
    gestureType: 'drag'
  },
  {
    id: 'zoom-navigation',
    title: 'Zoom y Navegación',
    description: 'Usa dos dedos para hacer zoom o doble toque para ajustar la vista',
    position: 'center',
    icon: '🔍',
    gestures: [
      { type: 'pinch', description: 'Pellizca para zoom' },
      { type: 'doubletap', description: 'Doble toque para centrar' }
    ],
    tips: ['Pinch: Zoom in/out',
           'Doble toque: Reset y centrar vista'],
    requiresGesture: true,
    gestureType: 'pinch'
  },
  {
    id: 'quick-actions',
    title: 'Acciones Rápidas',
    description: 'Usa atajos de teclado o gestos para acciones frecuentes',
    position: 'center',
    icon: '⚡',
    gestures: [
      { type: 'swipe', direction: 'up', description: 'Desliza arriba para filtros' },
      { type: 'swipe', direction: 'down', description: 'Desliza abajo para entrada rápida' }
    ],
    tips: ['Tecla N: Nueva tarea',
           'Tecla H: Ayuda de atajos',
           'Tecla F: Buscar']
  },
  {
    id: 'personalization',
    title: 'Personalización',
    description: 'Ajusta temas, configuraciones y preferencias en la vista de Ajustes',
    position: 'center',
    icon: '🎨',
    gestures: [],
    tips: ['Cambia entre tema claro y oscuro',
           'Ajusta sensibilidad de gestos',
           'Configura feedback háptico']
  },
  {
    id: 'completion',
    title: '¡Listo para Empezar!',
    description: 'Ya conoces los gestos básicos. ¡Comienza a organizar tus tareas!',
    position: 'center',
    icon: '🎉',
    gestures: [],
    tips: ['Recuerda: H para ayuda',
           'Tutorial disponible en Ajustes'],
    autoComplete: true
  }
]

export function MobileTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showGestureDemo, setShowGestureDemo] = useState(false)
  const [gestureCompleted, setGestureCompleted] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  
  const tutorialRef = useRef(null)
  const autoAdvanceTimer = useRef(null)
  const haptic = useHapticFeedback()

  // Touch gestures for tutorial navigation AND gesture detection
  const gestureRef = useTouchGestures({
  onSwipe: (direction) => {
      if (direction === 'left') {
        nextStep()
      } else if (direction === 'right') {
        previousStep()
      }
      
      // Check if this gesture was required for current step
      const currentStepData = TUTORIAL_STEPS[currentStep]
      if (currentStepData.requiresGesture && currentStepData.gestureType === 'swipe') {
        handleGestureCompleted()
      }
    },
  onLongPress: () => {
      const currentStepData = TUTORIAL_STEPS[currentStep]
      if (currentStepData.requiresGesture && currentStepData.gestureType === 'longpress') {
        handleGestureCompleted()
      }
    },
  onPinch: () => {
      const currentStepData = TUTORIAL_STEPS[currentStep]
      if (currentStepData.requiresGesture && currentStepData.gestureType === 'pinch') {
        handleGestureCompleted()
      }
    },
    onTap: () => {
      if (showGestureDemo) {
        setShowGestureDemo(false)
      }
    },
    hapticFeedback: true
  })

  const handleGestureCompleted = useCallback(() => {
    setGestureCompleted(true)
    haptic.success()
    
    // Auto-advance after gesture completion
    setTimeout(() => {
      nextStep()
    }, 1000)
  }, [haptic, nextStep])

  const completeTutorial = useCallback(() => {
    haptic.success()
    setIsVisible(false)
    setTimeout(() => {
      onComplete?.()
    }, 300)
  }, [haptic, onComplete])

  const nextStep = useCallback(() => {
    const currentStepData = TUTORIAL_STEPS[currentStep]
    
    // Check if current step requires gesture and hasn't been completed
    if (currentStepData.requiresGesture && !gestureCompleted) {
      // Show hint or emphasize gesture requirement
      haptic.warning()
      return
    }
    
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setIsAnimating(true)
      haptic.navigation()
      
      setTimeout(() => {
        setCurrentStep(prev => prev + 1)
        setGestureCompleted(false) // Reset for next step
        setIsAnimating(false)
      }, 200)
    } else {
      completeTutorial()
    }
  }, [currentStep, gestureCompleted, haptic, completeTutorial])

  const previousStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true)
      haptic.navigation()
      clearAutoAdvanceTimer()
      
      setTimeout(() => {
        setCurrentStep(prev => prev - 1)
        setGestureCompleted(false)
        setIsAnimating(false)
      }, 200)
    }
  }

  const skipTutorial = () => {
    haptic.light()
    clearAutoAdvanceTimer()
    setIsVisible(false)
    setTimeout(() => {
      onSkip?.()
    }, 300)
  }

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
  }

  const showGestureAnimation = () => {
    setShowGestureDemo(true)
    haptic.light()
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setShowGestureDemo(false)
    }, 4000)
  }

  const currentStepData = TUTORIAL_STEPS[currentStep]

  // Update progress percentage
  useEffect(() => {
    setProgressPercent(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)
  }, [currentStep])

  useEffect(() => {
    // Set tutorial ref for gestures
    if (tutorialRef.current) {
      gestureRef.current = tutorialRef.current
    }
  }, [gestureRef])

  // Auto-advance logic
  useEffect(() => {
    clearAutoAdvanceTimer()
    
    if (currentStepData.autoAdvance && !currentStepData.requiresGesture) {
      autoAdvanceTimer.current = setTimeout(() => {
        nextStep()
      }, currentStepData.autoAdvance)
    }
    
    if (currentStepData.autoComplete) {
      autoAdvanceTimer.current = setTimeout(() => {
        completeTutorial()
      }, 2000)
    }
    
    return () => clearAutoAdvanceTimer()
  }, [currentStep, currentStepData, nextStep, completeTutorial])

  if (!isVisible) {
    return null
  }

  return (
    <div 
      ref={tutorialRef}
      className={`mobile-tutorial ${isAnimating ? 'animating' : ''}`}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      {/* Overlay */}
      <div
        className="tutorial-overlay"
        role="button"
        tabIndex={0}
        onClick={skipTutorial}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            skipTutorial();
          }
        }}
        aria-label="Cerrar tutorial"
      />
      
      {/* Tutorial Content */}
      <div className={`tutorial-content position-${currentStepData.position}`}>
        {/* Progress Indicator with percentage */}
        <div className="tutorial-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">
            {currentStep + 1} de {TUTORIAL_STEPS.length}
          </span>
        </div>

        {/* Step Content */}
        <div className="tutorial-step">
          <div className="step-icon" role="img" aria-label={currentStepData.title}>
            {currentStepData.icon}
          </div>
          
          <h2 id="tutorial-title" className="step-title">
            {currentStepData.title}
          </h2>
          
          <p id="tutorial-description" className="step-description">
            {currentStepData.description}
          </p>

          {/* Tips Section */}
          {currentStepData.tips && currentStepData.tips.length > 0 && (
            <div className="tutorial-tips">
              <h3>💡 Consejos:</h3>
              <ul>
                {currentStepData.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Gesture Requirements */}
          {currentStepData.requiresGesture && !gestureCompleted && (
            <div className="gesture-requirement">
              <div className="requirement-badge">
                <span className="requirement-icon">✋</span>
                <span>Prueba el gesto para continuar</span>
              </div>
            </div>
          )}

          {/* Gesture Completed Feedback */}
          {currentStepData.requiresGesture && gestureCompleted && (
            <div className="gesture-completed">
              <div className="completed-badge">
                <span className="completed-icon">✅</span>
                <span>¡Perfecto! Gesto completado</span>
              </div>
            </div>
          )}

          {/* Gesture Demonstrations */}
          {currentStepData.gestures.length > 0 && (
            <div className="gesture-demos">
              <h3>Gestos disponibles:</h3>
              <div className="gesture-list">
                {currentStepData.gestures.map((gesture, index) => (
                  <button
                    key={index}
                    className="gesture-demo-btn"
                    onClick={() => showGestureAnimation(gesture.type)}
                    aria-label={`Demostrar ${gesture.description}`}
                  >
                    <GestureIcon type={gesture.type} direction={gesture.direction} />
                    <span>{gesture.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Gesture Demo */}
          {showGestureDemo && (
            <div className="gesture-animation-overlay">
              <div className="gesture-animation">
                <GestureAnimation type={currentStepData.gestures[0]?.type} />
                <p>¡Prueba este gesto!</p>
                <button 
                  className="close-demo"
                  onClick={() => setShowGestureDemo(false)}
                  aria-label="Cerrar demostración"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="tutorial-controls">
          <button
            className="tutorial-btn secondary"
            onClick={skipTutorial}
            aria-label="Saltar tutorial"
          >
            Saltar
          </button>
          
          <div className="step-navigation">
            <button
              className="tutorial-btn icon-btn"
              onClick={previousStep}
              disabled={currentStep === 0}
              aria-label="Paso anterior"
            >
              ←
            </button>
            
            <button
              className="tutorial-btn icon-btn"
              onClick={nextStep}
              disabled={currentStepData.requiresGesture && !gestureCompleted}
              aria-label={currentStep === TUTORIAL_STEPS.length - 1 ? "Finalizar tutorial" : "Siguiente paso"}
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? '✓' : '→'}
            </button>
          </div>
        </div>

        {/* Swipe Hint - only show if no gesture required or completed */}
        {(!currentStepData.requiresGesture || gestureCompleted) && (
          <div className="swipe-hint">
            <div className="swipe-indicator">
              <span>👈</span>
              <span>Desliza para navegar</span>
              <span>👉</span>
            </div>
          </div>
        )}

        {/* Gesture Hint for required gestures */}
        {currentStepData.requiresGesture && !gestureCompleted && (
          <div className="gesture-hint">
            <div className="gesture-prompt">
              <GestureIcon type={currentStepData.gestureType} />
              <span>Realiza este gesto aquí</span>
            </div>
          </div>
        )}
      </div>

      {/* Accessibility Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Paso {currentStep + 1} de {TUTORIAL_STEPS.length}: {currentStepData.title}
        {currentStepData.requiresGesture && !gestureCompleted && " - Gesto requerido"}
        {gestureCompleted && " - Gesto completado"}
      </div>
    </div>
  )
}

// Gesture Icon Component
function GestureIcon({ type, direction }) {
  const icons = {
    swipe: {
      left: '👈',
      right: '👉',
      up: '👆',
      down: '👇'
    },
    longpress: '👆',
    doubletap: '👆👆',
    pinch: '🤏',
    drag: '✊'
  }

  if (type === 'swipe' && direction) {
    return <span>{icons.swipe[direction]}</span>
  }

  return <span>{icons[type] || '👆'}</span>
}

// Gesture Animation Component
function GestureAnimation({ type }) {
  const animations = {
    swipe: (
      <div className="swipe-animation">
        <div className="touch-point moving" />
        <div className="swipe-trail" />
      </div>
    ),
    longpress: (
      <div className="longpress-animation">
        <div className="touch-point pulsing" />
        <div className="ripple-effect" />
      </div>
    ),
    doubletap: (
      <div className="doubletap-animation">
        <div className="touch-point tapping" />
        <div className="tap-indicator">2x</div>
      </div>
    ),
    pinch: (
      <div className="pinch-animation">
        <div className="touch-point pinch-1" />
        <div className="touch-point pinch-2" />
        <div className="pinch-lines" />
      </div>
    ),
    drag: (
      <div className="drag-animation">
        <div className="touch-point dragging" />
        <div className="drag-trail" />
      </div>
    )
  }

  return (
    <div className="gesture-animation-container">
      {animations[type] || animations.longpress}
    </div>
  )
}

export default MobileTutorial