import { useCallback } from 'react'
import { useError } from '../contexts/ErrorContext'

export const useSafeStorage = () => {
  const { addError, addNotification } = useError()

  const safeGetItem = useCallback((key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : defaultValue
    } catch (error) {
      addError(error, 'data-load')
      return defaultValue
    }
  }, [addError])

  const safeSetItem = useCallback((key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      addError(error, 'data-save')
      return false
    }
  }, [addError])

  const safeRemoveItem = useCallback((key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      addError(error, 'data-save')
      return false
    }
  }, [addError])

  const safeClearStorage = useCallback(() => {
    try {
      localStorage.clear()
      addNotification('Datos borrados correctamente', 'success')
      return true
    } catch (error) {
      addError(error, 'data-save')
      return false
    }
  }, [addError, addNotification])

  return {
    safeGetItem,
    safeSetItem,
    safeRemoveItem,
    safeClearStorage
  }
}

export const useSafeOperation = () => {
  const { addError, addNotification } = useError()

  const safeAsync = useCallback(async (operation, context = '', successMessage = null) => {
    try {
      const result = await operation()
      if (successMessage) {
        addNotification(successMessage, 'success')
      }
      return { success: true, data: result, error: null }
    } catch (error) {
      addError(error, context)
      return { success: false, data: null, error }
    }
  }, [addError, addNotification])

  const safeSync = useCallback((operation, context = '', successMessage = null) => {
    try {
      const result = operation()
      if (successMessage) {
        addNotification(successMessage, 'success')
      }
      return { success: true, data: result, error: null }
    } catch (error) {
      addError(error, context)
      return { success: false, data: null, error }
    }
  }, [addError, addNotification])

  return { safeAsync, safeSync }
}

export const useErrorBoundary = () => {
  const { addError } = useError()

  const captureError = useCallback((error, context = 'unknown', additionalInfo = {}) => {
    const enhancedError = {
      ...error,
      context,
      additionalInfo,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
    
    addError(enhancedError, context)
  }, [addError])

  return { captureError }
}