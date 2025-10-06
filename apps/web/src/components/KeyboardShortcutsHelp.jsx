import React, { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export default function KeyboardShortcutsHelp({ show, onClose }) {
  const { containerRef, focusFirst } = useKeyboardNavigation({
    enabled: show,
    trapFocus: true,
    onEscape: () => {
      onClose()
      return true
    }
  })

  useEffect(() => {
    if (show) {
      setTimeout(() => focusFirst(), 100)
    }
  }, [show, focusFirst])

  if (!show) return null

  const shortcuts = [
    {
      category: 'Navegación General',
      items: [
        { keys: ['H', '?'], description: 'Mostrar ayuda y tutorial' },
        { keys: ['Escape'], description: 'Cerrar modales o cancelar acciones' },
        { keys: ['1-4'], description: 'Cambiar entre vistas (Inicio, Matriz, Mapa, Ajustes)' },
        { keys: ['Alt+1-4'], description: 'Navegación alternativa entre vistas' },
        { keys: ['Tab'], description: 'Navegar entre elementos' },
        { keys: ['Shift+Tab'], description: 'Navegar hacia atrás' }
      ]
    },
    {
      category: 'Matriz de Eisenhower',
      items: [
        { keys: ['N'], description: 'Crear nueva nota' },
        { keys: ['E'], description: 'Editar nota seleccionada' },
        { keys: ['Delete', 'Backspace'], description: 'Eliminar nota seleccionada' },
        { keys: ['↑↓←→'], description: 'Mover nota seleccionada' },
        { keys: ['+', '='], description: 'Acercar zoom' },
        { keys: ['-'], description: 'Alejar zoom' },
        { keys: ['0'], description: 'Ajustar zoom automático' },
        { keys: ['F', '/'], description: 'Buscar notas' }
      ]
    },
    {
      category: 'Temas y Apariencia',
      items: [
        { keys: ['Ctrl+Shift+T'], description: 'Cambiar tema (claro/oscuro)' },
        { keys: ['Ctrl+Shift+L'], description: 'Forzar tema claro' },
        { keys: ['Ctrl+Shift+D'], description: 'Forzar tema oscuro' },
        { keys: ['Ctrl+Shift+R'], description: 'Resetear a tema del sistema' }
      ]
    },
    {
      category: 'Tutorial y Configuración',
      items: [
        { keys: ['←→'], description: 'Navegar pasos del tutorial' },
        { keys: ['Space'], description: 'Avanzar en tutorial' },
        { keys: ['Enter'], description: 'Confirmar o continuar' },
        { keys: ['A'], description: 'Alternar auto-avance en tutorial' },
        { keys: ['Home'], description: 'Ir al primer paso' },
        { keys: ['End'], description: 'Ir al último paso' }
      ]
    },
    {
      category: 'Notificaciones',
      items: [
        { keys: ['X', 'Delete'], description: 'Cerrar notificación' },
        { keys: ['Escape'], description: 'Cerrar notificación activa' }
      ]
    },
    {
      category: 'Configuración (Panel de Ajustes)',
      items: [
        { keys: ['1'], description: 'Seleccionar tema claro' },
        { keys: ['2'], description: 'Seleccionar tema oscuro' },
        { keys: ['R'], description: 'Resetear a tema del sistema' },
        { keys: ['T'], description: 'Alternar tema actual' }
      ]
    }
  ]

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      ref={containerRef}
      tabIndex={-1}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
        color: 'var(--surface-text)',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 id="shortcuts-title" style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text)',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            <Keyboard size={28} color="var(--accent)" />
            Atajos de Teclado
          </h2>
          
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ayuda de atajos"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.background = 'var(--accent-bg, rgba(59, 130, 246, 0.1))'
              e.target.style.outline = '2px solid var(--accent)'
            }}
            onBlur={(e) => {
              e.target.style.background = 'transparent'
              e.target.style.outline = 'none'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gap: '24px'
        }}>
          {shortcuts.map((category, index) => (
            <div key={index}>
              <h3 style={{
                margin: '0 0 12px 0',
                color: 'var(--accent)',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                {category.category}
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '8px'
              }}>
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--panel-bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      flexWrap: 'wrap'
                    }}>
                      {item.keys.map((key, keyIndex) => (
                        <kbd key={keyIndex} style={{
                          background: 'var(--accent)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          fontFamily: 'monospace',
                          minWidth: '24px',
                          textAlign: 'center'
                        }}>
                          {key}
                        </kbd>
                      ))}
                    </div>
                    
                    <span style={{
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}>
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--panel-bg)',
          borderRadius: '12px',
          border: '1px solid var(--panel-border)',
          textAlign: 'center'
        }}>
          <p style={{
            margin: '0 0 8px 0',
            color: 'var(--text)',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            💡 Consejo
          </p>
          <p style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            Todos los elementos interactivos muestran un indicador visual cuando reciben foco. 
            Usa <kbd style={{background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '3px'}}>Tab</kbd> para navegar 
            y los atajos mostrados para acciones rápidas.
          </p>
        </div>
      </div>
    </div>
  )
}