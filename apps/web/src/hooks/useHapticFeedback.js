import { useCallback, useRef } from 'react'

/**
 * Hook for haptic feedback on mobile devices
 * Provides vibration patterns for different interaction types
 */
export const useHapticFeedback = () => {
  const isSupported = useRef(typeof navigator !== 'undefined' && 'vibrate' in navigator)
  const lastVibration = useRef(0)
  const VIBRATION_THROTTLE = 50 // Minimum ms between vibrations

  /**
   * Trigger vibration with throttling to prevent spam
   * @param {number|number[]} pattern - Vibration pattern in ms
   */
  const vibrate = useCallback((pattern) => {
    if (!isSupported.current) return false
    
    const now = Date.now()
    if (now - lastVibration.current < VIBRATION_THROTTLE) {
      return false // Throttled
    }
    
    try {
      lastVibration.current = now
      return navigator.vibrate(pattern)
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
      return false
    }
  }, [])

  /**
   * Light tap - for button presses, selections
   */
  const light = useCallback(() => {
    return vibrate(10)
  }, [vibrate])

  /**
   * Medium tap - for confirmations, toggles
   */
  const medium = useCallback(() => {
    return vibrate(25)
  }, [vibrate])

  /**
   * Strong tap - for important actions, errors
   */
  const strong = useCallback(() => {
    return vibrate(50)
  }, [vibrate])

  /**
   * Double tap pattern - for double tap gestures
   */
  const doubleTap = useCallback(() => {
    return vibrate([15, 50, 15])
  }, [vibrate])

  /**
   * Long press pattern - for long press start
   */
  const longPress = useCallback(() => {
    return vibrate([30, 30, 60])
  }, [vibrate])

  /**
   * Success pattern - for successful actions
   */
  const success = useCallback(() => {
    return vibrate([10, 30, 10, 30, 10])
  }, [vibrate])

  /**
   * Error pattern - for errors, failures
   */
  const error = useCallback(() => {
    return vibrate([50, 50, 50, 50, 100])
  }, [vibrate])

  /**
   * Warning pattern - for warnings, alerts
   */
  const warning = useCallback(() => {
    return vibrate([25, 25, 25, 25, 50])
  }, [vibrate])

  /**
   * Navigation pattern - for swipe navigation
   */
  const navigation = useCallback(() => {
    return vibrate([5, 20, 5])
  }, [vibrate])

  /**
   * Selection pattern - for selecting items
   */
  const selection = useCallback(() => {
    return vibrate([15, 15, 15])
  }, [vibrate])

  /**
   * Zoom pattern - for pinch zoom actions
   */
  const zoom = useCallback(() => {
    return vibrate([8, 12, 8])
  }, [vibrate])

  /**
   * Custom vibration pattern
   * @param {number|number[]} pattern - Custom pattern
   */
  const custom = useCallback((pattern) => {
    return vibrate(pattern)
  }, [vibrate])

  /**
   * Stop all vibrations
   */
  const stop = useCallback(() => {
    if (!isSupported.current) return false
    try {
      return navigator.vibrate(0)
    } catch (error) {
      console.warn('Failed to stop vibration:', error)
      return false
    }
  }, [])

  return {
    // Basic patterns
    light,
    medium,
    strong,
    
    // Gesture patterns
    doubleTap,
    longPress,
    navigation,
    selection,
    zoom,
    
    // Feedback patterns
    success,
    error,
    warning,
    
    // Utilities
    custom,
    stop,
    isSupported: isSupported.current
  }
}

/**
 * Hook for integrating haptic feedback with UI interactions
 * Provides common patterns for button presses, form interactions, etc.
 */
export const useUIHaptics = () => {
  const haptic = useHapticFeedback()

  /**
   * Button press haptic - light vibration for button taps
   */
  const onButtonPress = useCallback((type = 'default') => {
    switch (type) {
      case 'primary':
        return haptic.medium()
      case 'danger':
        return haptic.strong()
      case 'success':
        return haptic.light()
      default:
        return haptic.light()
    }
  }, [haptic])

  /**
   * Form submission haptic
   */
  const onFormSubmit = useCallback((success = true) => {
    return success ? haptic.success() : haptic.error()
  }, [haptic])

  /**
   * Toggle switch haptic
   */
  const onToggle = useCallback((enabled) => {
    return enabled ? haptic.medium() : haptic.light()
  }, [haptic])

  /**
   * Navigation haptic - for view changes
   */
  const onNavigation = useCallback(() => {
    return haptic.navigation()
  }, [haptic])

  /**
   * Selection haptic - for selecting items
   */
  const onSelection = useCallback(() => {
    return haptic.selection()
  }, [haptic])

  /**
   * Error haptic - for error states
   */
  const onError = useCallback(() => {
    return haptic.error()
  }, [haptic])

  /**
   * Success haptic - for success states
   */
  const onSuccess = useCallback(() => {
    return haptic.success()
  }, [haptic])

  /**
   * Warning haptic - for warning states
   */
  const onWarning = useCallback(() => {
    return haptic.warning()
  }, [haptic])

  return {
    onButtonPress,
    onFormSubmit,
    onToggle,
    onNavigation,
    onSelection,
    onError,
    onSuccess,
    onWarning,
    
    // Expose raw haptic controls
    ...haptic
  }
}

export default useHapticFeedback