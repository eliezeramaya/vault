import React, { useEffect, useCallback } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { useError } from '../contexts/ErrorContext'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useTouchGestures, useMobileButton } from '../hooks/useTouchGestures'

const NotificationToast = ({ notification, onRemove, index }) => {
  const { containerRef } = useKeyboardNavigation({
    enabled: true,
  onEnter: (event) => {
      if (event.target.tagName === 'BUTTON') {
        event.target.click()
        return true
      }
      return false
    },
    onEscape: () => {
      onRemove(notification.id)
      return true
    },
    customShortcuts: {
      'x': () => { onRemove(notification.id); return true },
      'X': () => { onRemove(notification.id); return true },
      'Delete': () => { onRemove(notification.id); return true }
    }
  })

  // Mobile swipe-to-dismiss gesture
  const handleSwipeDismiss = useCallback((direction, velocity) => {
    if (direction === 'right' && velocity.x > 100) {
      onRemove(notification.id)
    }
  }, [notification.id, onRemove])

  const swipeRef = useTouchGestures({
    onSwipe: handleSwipeDismiss,
    swipeThreshold: 50
  })

  // Mobile-friendly close button
  const closeButton = useMobileButton({
    onPress: () => onRemove(notification.id),
    hapticFeedback: true,
    rippleEffect: true
  })
  
  // Auto-focus first notification
  useEffect(() => {
    if (index === 0 && containerRef.current) {
      const closeBtn = containerRef.current.querySelector('button')
      if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100)
      }
    }
  }, [index, containerRef])
  const getIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle size={20} />
      case 'warning': return <AlertTriangle size={20} />
      case 'success': return <CheckCircle size={20} />
      default: return <Info size={20} />
    }
  }

  const getColors = (type) => {
    switch (type) {
      case 'error': 
        return {
          bg: 'rgba(220, 38, 38, 0.1)',
          border: 'rgba(220, 38, 38, 0.3)',
          color: '#fee2e2',
          iconColor: '#f87171'
        }
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#fef3c7',
          iconColor: '#fbbf24'
        }
      case 'success':
        return {
          bg: 'rgba(34, 197, 94, 0.1)',
          border: 'rgba(34, 197, 94, 0.3)',
          color: '#dcfce7',
          iconColor: '#4ade80'
        }
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.1)',
          border: 'rgba(59, 130, 246, 0.3)',
          color: '#dbeafe',
          iconColor: '#60a5fa'
        }
    }
  }

  const colors = getColors(notification.type)

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        if (swipeRef) swipeRef.current = el
      }}
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className="notification-toast touch-feedback"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '16px',
        marginBottom: '12px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        color: colors.color,
        fontSize: '15px', // Slightly larger for mobile
        lineHeight: '1.5',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'slideInRight 0.3s ease-out',
        maxWidth: '400px',
        minHeight: '60px', // Touch-friendly minimum
        position: 'relative',
        transition: 'transform 0.2s ease'
      }}
    >
      <div style={{ color: colors.iconColor, flexShrink: 0, marginTop: '2px' }}>
        {getIcon(notification.type)}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ wordBreak: 'break-word' }}>
          {notification.message}
        </div>
        
        {notification.type === 'error' && (
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.8, 
            marginTop: '4px',
            fontFamily: 'monospace'
          }}>
            {new Date(notification.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {/* Swipe indicator (shown briefly on touch) */}
      <div className="swipe-indicator right" style={{
        opacity: 0,
        fontSize: '11px',
        fontWeight: 600
      }}>
        Desliza →
      </div>
      
      <button
        type="button"
        ref={closeButton.ref}
        onClick={closeButton.handleClick}
        onTouchStart={closeButton.handleTouchStart}
        onTouchEnd={closeButton.handleTouchEnd}
        aria-label={`Cerrar notificación: ${notification.message}`}
        title="Presiona X, Del o Escape para cerrar, o desliza hacia la derecha"
        className="touch-feedback"
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.iconColor,
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '36px', // Touch-friendly
          minHeight: '36px',
          transition: 'all 0.2s ease'
        }}
        onFocus={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.1)'
          e.target.style.outline = `2px solid ${colors.iconColor}`
          e.target.style.outlineOffset = '2px'
        }}
        onBlur={(e) => {
          e.target.style.background = 'transparent'
          e.target.style.outline = 'none'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default function NotificationCenter() {
  const { notifications, removeNotification } = useError()

  if (notifications.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .notification-toast {
            margin: 0 16px 12px 16px !important;
            padding: 20px !important;
            border-radius: 20px !important;
            font-size: 16px !important; /* Prevent zoom on iOS */
            min-height: 72px !important;
          }
          
          .notification-toast button {
            min-width: 44px !important;
            min-height: 44px !important;
            padding: 12px !important;
            border-radius: 12px !important;
          }
          
          .notification-toast button svg {
            width: 20px !important;
            height: 20px !important;
          }
          
          .notification-toast .swipe-indicator {
            display: block !important;
          }
        }

        /* Extra small devices */
        @media (max-width: 480px) {
          .notification-toast {
            margin: 0 8px 12px 8px !important;
            padding: 24px !important;
            min-height: 80px !important;
          }
          
          .notification-toast button {
            min-width: 48px !important;
            min-height: 48px !important;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .notification-toast:hover {
            transform: none !important;
          }
          
          .notification-toast:active {
            transform: translateX(-4px) !important;
            transition: transform 0.1s ease !important;
          }
          
          .notification-toast button:hover {
            transform: none !important;
          }
          
          .notification-toast button:active {
            transform: scale(0.9) !important;
            background: rgba(255, 255, 255, 0.2) !important;
          }
        }

        /* Dark mode adjustments for mobile */
        @media (max-width: 768px) and (prefers-color-scheme: dark) {
          .notification-toast {
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
          }
        }
      `}</style>
      
      <div
        aria-label="Centro de notificaciones"
        style={{
          position: 'fixed',
          top: 'max(20px, env(safe-area-inset-top))',
          right: 'max(20px, env(safe-area-inset-right))',
          left: 'max(20px, env(safe-area-inset-left))', // Add left for mobile
          zIndex: 9999,
          maxHeight: '80vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          width: 'auto', // Change from 100% to auto
          maxWidth: '420px',
          marginLeft: 'auto', // Center on mobile
          pointerEvents: 'auto'
        }}
      >
        {notifications.map((notification, index) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
            index={index}
          />
        ))}
      </div>
    </>
  )
}