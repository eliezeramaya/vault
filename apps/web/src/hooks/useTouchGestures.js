import { useRef, useEffect, useCallback } from 'react'
import { useHapticFeedback } from './useHapticFeedback'

/**
 * Hook for comprehensive touch gesture support
 * Provides swipe, pinch, long press, and double tap detection
 */
export function useTouchGestures({
  onSwipe = null,
  onPinch = null,
  onLongPress = null,
  onDoubleTap = null,
  onTap = null,
  swipeThreshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300,
  enabled = true,
  hapticFeedback = true
}) {
  const elementRef = useRef(null)
  const touchStartRef = useRef(null)
  // touchEndRef was unused; remove to satisfy lint
  const longPressTimerRef = useRef(null)
  const lastTapRef = useRef(null)
  const initialDistanceRef = useRef(null)
  
  const haptic = useHapticFeedback()

  // Helper functions
  const getTouchDistance = useCallback((touches) => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    return Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    )
  }, [])

  const getTouchCenter = useCallback((touches) => {
    if (touches.length === 0) return { x: 0, y: 0 }
    const x = Array.from(touches).reduce((sum, touch) => sum + touch.clientX, 0) / touches.length
    const y = Array.from(touches).reduce((sum, touch) => sum + touch.clientY, 0) / touches.length
    return { x, y }
  }, [])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleTouchStart = useCallback((event) => {
    if (!enabled) return

    const touches = Array.from(event.touches)
    
    // Store touch data
    touchStartRef.current = {
      touches: touches.map(t => ({ x: t.clientX, y: t.clientY, id: t.identifier })),
      timestamp: Date.now()
    }

    // Handle single touch - potential tap or long press
    if (touches.length === 1) {
      const touch = touches[0]
      
      // Start long press timer
      clearLongPressTimer()
      longPressTimerRef.current = setTimeout(() => {
        if (onLongPress && touchStartRef.current) {
          // Trigger haptic feedback for long press
          if (hapticFeedback) {
            haptic.longPress()
          }
          onLongPress({ x: touch.clientX, y: touch.clientY })
        }
      }, longPressDelay)
    }

    // Handle pinch start
    if (touches.length === 2) {
      clearLongPressTimer()
      initialDistanceRef.current = getTouchDistance(touches)
    }
  }, [enabled, onLongPress, longPressDelay, getTouchDistance, clearLongPressTimer, hapticFeedback, haptic])

  const handleTouchMove = useCallback((event) => {
    if (!enabled || !touchStartRef.current) return

    const touches = Array.from(event.touches)

    // Handle pinch
    if (touches.length === 2 && initialDistanceRef.current && onPinch) {
      const currentDistance = getTouchDistance(touches)
      const scale = currentDistance / initialDistanceRef.current
      const center = getTouchCenter(touches)
      
      // Trigger zoom haptic on significant scale change
      if (hapticFeedback && Math.abs(scale - 1) > 0.2) {
        haptic.zoom()
      }
      
      onPinch(scale, center)
    }

    // Cancel long press on move
    if (touches.length === 1) {
      const touch = touches[0]
      const startTouch = touchStartRef.current.touches[0]
      const distance = Math.hypot(touch.clientX - startTouch.x, touch.clientY - startTouch.y)
      
      if (distance > 10) { // 10px movement threshold
        clearLongPressTimer()
      }
    }
  }, [enabled, onPinch, getTouchDistance, getTouchCenter, clearLongPressTimer, hapticFeedback, haptic])

  const handleTouchEnd = useCallback((event) => {
    if (!enabled || !touchStartRef.current) return

    const endTime = Date.now()
    const startData = touchStartRef.current
    const duration = endTime - startData.timestamp

    clearLongPressTimer()

    // Handle tap/double tap (only for single touch)
    if (event.changedTouches.length === 1 && startData.touches.length === 1) {
      const touch = event.changedTouches[0]
      const startTouch = startData.touches[0]
      const distance = Math.hypot(touch.clientX - startTouch.x, touch.clientY - startTouch.y)

      // Only if it's a tap (short duration, minimal movement)
      if (duration < 300 && distance < 10) {
        const now = Date.now()
        const timeSinceLastTap = lastTapRef.current ? now - lastTapRef.current : Infinity

        if (timeSinceLastTap < doubleTapDelay) {
          // Double tap
          if (onDoubleTap) {
            // Trigger haptic feedback for double tap
            if (hapticFeedback) {
              haptic.doubleTap()
            }
            onDoubleTap({ x: touch.clientX, y: touch.clientY })
          }
          lastTapRef.current = null
        } else {
          // Single tap (wait to see if double tap follows)
          lastTapRef.current = now
          setTimeout(() => {
            if (lastTapRef.current === now && onTap) {
              // Trigger haptic feedback for single tap
              if (hapticFeedback) {
                haptic.light()
              }
              onTap({ x: touch.clientX, y: touch.clientY })
            }
          }, doubleTapDelay)
        }
      }
    }

    // Handle swipe (only for single touch)
    if (event.changedTouches.length === 1 && startData.touches.length === 1 && onSwipe) {
      const touch = event.changedTouches[0]
      const startTouch = startData.touches[0]
      const deltaX = touch.clientX - startTouch.x
      const deltaY = touch.clientY - startTouch.y
      const distance = Math.hypot(deltaX, deltaY)

      if (distance > swipeThreshold) {
        const velocity = { x: deltaX / duration, y: deltaY / duration }
        let direction = null

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left'
        } else {
          direction = deltaY > 0 ? 'down' : 'up'
        }

        // Trigger haptic feedback for swipe
        if (hapticFeedback) {
          haptic.navigation()
        }

        onSwipe(direction, velocity, { x: touch.clientX, y: touch.clientY })
      }
    }

    // Reset state
    touchStartRef.current = null
    // touchEndRef.current = null
    initialDistanceRef.current = null
  }, [
    enabled, onDoubleTap, onTap, onSwipe, doubleTapDelay, swipeThreshold, 
    clearLongPressTimer, hapticFeedback, haptic
  ])

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    const options = { passive: false }

    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)
    element.addEventListener('touchcancel', handleTouchEnd, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart, options)
      element.removeEventListener('touchmove', handleTouchMove, options)
      element.removeEventListener('touchend', handleTouchEnd, options)
      element.removeEventListener('touchcancel', handleTouchEnd, options)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return elementRef
}

/**
 * Hook for swipe navigation with haptic feedback
 */
export function useSwipeNavigation({
  onSwipeLeft = null,
  onSwipeRight = null,
  onSwipeUp = null,
  onSwipeDown = null,
  threshold = 50,
  hapticFeedback = true
}) {
  const haptic = useHapticFeedback()

  return useTouchGestures({
    onSwipe: (direction, velocity, position) => {
      // Trigger navigation haptic
      if (hapticFeedback) {
        haptic.navigation()
      }

      switch (direction) {
        case 'left':
          onSwipeLeft?.(velocity, position)
          break
        case 'right':
          onSwipeRight?.(velocity, position)
          break
        case 'up':
          onSwipeUp?.(velocity, position)
          break
        case 'down':
          onSwipeDown?.(velocity, position)
          break
      }
    },
    swipeThreshold: threshold,
    hapticFeedback
  })
}

/**
 * Hook for mobile-optimized buttons with haptic feedback
 */
export function useMobileButton({
  onPress = null,
  onLongPress = null,
  hapticFeedback = true,
  buttonType = 'default' // 'default' | 'primary' | 'danger' | 'success'
}) {
  const buttonRef = useRef(null)
  const haptic = useHapticFeedback()
  const isPressed = useRef(false)

  const handlePress = useCallback((position) => {
    if (hapticFeedback) {
      switch (buttonType) {
        case 'primary':
          haptic.medium()
          break
        case 'danger':
          haptic.strong()
          break
        case 'success':
          haptic.success()
          break
        default:
          haptic.light()
      }
    }

    onPress?.(position)
  }, [onPress, hapticFeedback, haptic, buttonType])

  const handleLongPress = useCallback((position) => {
    if (hapticFeedback) {
      haptic.longPress()
    }
    onLongPress?.(position)
  }, [onLongPress, hapticFeedback, haptic])

  const gestureRef = useTouchGestures({
    onTap: handlePress,
    onLongPress: handleLongPress,
    hapticFeedback
  })

  const handleClick = useCallback((event) => {
    // Handle regular click events for non-touch devices
    if (!isPressed.current) {
      handlePress({ x: event.clientX, y: event.clientY })
    }
    isPressed.current = false
  }, [handlePress])

  const handleTouchStart = useCallback(() => {
    isPressed.current = true
  }, [])

  const handleTouchEnd = useCallback(() => {
    // Let the gesture handler deal with the press
  }, [])

  return {
    ref: (element) => {
      buttonRef.current = element
      gestureRef.current = element
    },
    handleClick,
    handleTouchStart,
    handleTouchEnd
  }
}

export default useTouchGestures