import React, { createContext, useContext, useState, useCallback } from 'react'

const ErrorContext = createContext()

export const useError = () => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([])
  const [notifications, setNotifications] = useState([])

  // Remove notification (declared first to avoid TDZ in addNotification deps)
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Add notification for user feedback (depends on removeNotification)
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const notificationId = Date.now() + Math.random()
    const notification = {
      id: notificationId,
      message,
      type, // 'error', 'warning', 'info', 'success'
      timestamp: Date.now(),
      duration
    }

    setNotifications(prev => [...prev, notification])

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(notificationId)
      }, duration)
    }

    return notificationId
  }, [removeNotification])

  // Get user-friendly error message (declared before addError to avoid TDZ)
  const getErrorMessage = (error, context) => {
    const errorString = error.message || error.toString()
    
    // Common error patterns with user-friendly messages
    if (errorString.includes('localStorage')) {
      return 'No se pudo guardar la configuración. Verifique que el almacenamiento local esté habilitado.'
    }
    if (errorString.includes('Network') || errorString.includes('fetch')) {
      return 'Error de conexión. Verifique su conexión a internet.'
    }
    if (errorString.includes('Permission') || errorString.includes('denied')) {
      return 'Permisos insuficientes para realizar esta operación.'
    }
    if (errorString.includes('quota') || errorString.includes('storage')) {
      return 'Espacio de almacenamiento insuficiente. Libere espacio e intente nuevamente.'
    }
    if (errorString.includes('JSON')) {
      return 'Error en el formato de datos. Los datos pueden estar corruptos.'
    }
    if (context === 'theme') {
      return 'Error al cambiar el tema. Se aplicó el tema por defecto.'
    }
    if (context === 'data-save') {
      return 'No se pudieron guardar los datos. Sus cambios pueden perderse.'
    }
    if (context === 'data-load') {
      return 'Error al cargar datos guardados. Se usarán valores por defecto.'
    }
    
    // Fallback to generic message
    return `Error inesperado${context ? ` en ${context}` : ''}. Intente actualizar la página.`
  }

  // Add error to the global error state (depends on addNotification)
  const addError = useCallback((error, context = '', severity = 'error') => {
    const errorId = Date.now() + Math.random()
    const errorEntry = {
      id: errorId,
      message: error.message || error,
      stack: error.stack,
      context,
      severity, // 'error', 'warning', 'info', 'success'
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    setErrors(prev => [...prev.slice(-9), errorEntry]) // Keep last 10 errors

    // Also add to notifications for user feedback
    addNotification(
      getErrorMessage(error, context),
      severity,
      severity === 'error' ? 8000 : 5000
    )

    // Log to console for development
    if (severity === 'error') {
      console.error(`[${context}]`, error)
    } else if (severity === 'warning') {
      console.warn(`[${context}]`, error)
    } else {
      console.info(`[${context}]`, error)
    }

    return errorId
  }, [addNotification])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Safe operation wrapper
  const safeOperation = useCallback(async (operation, context = '') => {
    try {
      return await operation()
    } catch (error) {
      addError(error, context)
      return null
    }
  }, [addError])


  const value = {
    errors,
    notifications,
    addError,
    addNotification,
    removeNotification,
    clearErrors,
    clearNotifications,
    safeOperation
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

export default ErrorContext