import { useEffect, useCallback, useRef } from 'react'

/**
 * Hook for comprehensive keyboard navigation
 * Provides grid navigation, focus management, and common shortcuts
 */
export function useKeyboardNavigation({
  enabled = true,
  onArrowKey = null,
  onEnter = null,
  onEscape = null,
  onSpace = null,
  customShortcuts = {},
  gridMode = false,
  gridColumns = 1,
  trapFocus = false,
  excludeInputs = true
}) {
  const containerRef = useRef(null)
  
  const isTypingContext = useCallback((element) => {
    if (!element) return false
    const tag = (element.tagName || '').toLowerCase()
    const editable = element.isContentEditable
    return editable || tag === 'input' || tag === 'textarea' || tag === 'select'
  }, [])
  
  const getFocusableElements = useCallback((container) => {
    if (!container) return []
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    return Array.from(container.querySelectorAll(selector))
  }, [])
  
  const navigateGrid = useCallback((direction, focusables) => {
    if (!gridMode || !focusables.length) return false
    
    const currentIndex = focusables.findIndex(el => el === document.activeElement)
    if (currentIndex === -1) return false
    
    let nextIndex = currentIndex
    const currentRow = Math.floor(currentIndex / gridColumns)
    const currentCol = currentIndex % gridColumns
    const totalRows = Math.ceil(focusables.length / gridColumns)
    
    switch (direction) {
      case 'ArrowUp':
        if (currentRow > 0) {
          nextIndex = Math.max(0, currentIndex - gridColumns)
        }
        break
      case 'ArrowDown':
        if (currentRow < totalRows - 1) {
          nextIndex = Math.min(focusables.length - 1, currentIndex + gridColumns)
        }
        break
      case 'ArrowLeft':
        if (currentCol > 0) {
          nextIndex = currentIndex - 1
        }
        break
      case 'ArrowRight':
        if (currentCol < gridColumns - 1 && currentIndex + 1 < focusables.length) {
          nextIndex = currentIndex + 1
        }
        break
      default:
        return false
    }
    
    if (nextIndex !== currentIndex && focusables[nextIndex]) {
      focusables[nextIndex].focus()
      return true
    }
    return false
  }, [gridMode, gridColumns])
  
  const handleTabNavigation = useCallback((event, focusables) => {
    if (!trapFocus || !focusables.length) return false
    
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return true
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
        return true
      }
    }
    return false
  }, [trapFocus])
  
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return
    
    const { key, ctrlKey, shiftKey, altKey } = event
    const target = event.target
    
    // Skip if typing in inputs (when excludeInputs is true)
    if (excludeInputs && isTypingContext(target)) return
    
    const container = containerRef.current
    const focusables = getFocusableElements(container)
    
    // Handle Tab navigation with focus trapping
    if (key === 'Tab' && handleTabNavigation(event, focusables)) {
      return
    }
    
    // Handle grid navigation with arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      if (onArrowKey) {
        const handled = onArrowKey(key, event)
        if (handled) return
      }
      
      if (navigateGrid(key, focusables)) {
        event.preventDefault()
        return
      }
    }
    
    // Handle common navigation keys
    if (key === 'Enter' && onEnter) {
      const handled = onEnter(event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
    
    if (key === 'Escape' && onEscape) {
      const handled = onEscape(event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
    
    if (key === ' ' && onSpace) {
      const handled = onSpace(event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
    
    // Handle custom shortcuts
    const shortcutKey = `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${key}`
    if (customShortcuts[shortcutKey]) {
      const handled = customShortcuts[shortcutKey](event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
    
    // Handle single key shortcuts (when not typing)
    if (!ctrlKey && !shiftKey && !altKey && customShortcuts[key]) {
      const handled = customShortcuts[key](event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
  }, [enabled, excludeInputs, isTypingContext, getFocusableElements, handleTabNavigation, 
      navigateGrid, onArrowKey, onEnter, onEscape, onSpace, customShortcuts])
  
  useEffect(() => {
    const container = containerRef.current
    if (!enabled || !container) return
    
    container.addEventListener('keydown', handleKeyDown)
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
  
  // Focus management utilities
  const focusFirst = useCallback(() => {
    const focusables = getFocusableElements(containerRef.current)
    if (focusables.length > 0) {
      focusables[0].focus()
    }
  }, [getFocusableElements])
  
  const focusLast = useCallback(() => {
    const focusables = getFocusableElements(containerRef.current)
    if (focusables.length > 0) {
      focusables[focusables.length - 1].focus()
    }
  }, [getFocusableElements])
  
  const focusElement = useCallback((selector) => {
    const container = containerRef.current
    if (!container) return false
    
    const element = container.querySelector(selector)
    if (element && typeof element.focus === 'function') {
      element.focus()
      return true
    }
    return false
  }, [])
  
  return {
    containerRef,
    focusFirst,
    focusLast,
    focusElement,
    getFocusableElements: () => getFocusableElements(containerRef.current)
  }
}

/**
 * Hook for global keyboard shortcuts (document level)
 */
export function useGlobalKeyboardShortcuts(shortcuts = {}, enabled = true) {
  const isTypingContext = useCallback((element) => {
    if (!element) return false
    const tag = (element.tagName || '').toLowerCase()
    const editable = element.isContentEditable
    return editable || tag === 'input' || tag === 'textarea' || tag === 'select'
  }, [])
  
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return
    
    const { key, ctrlKey, shiftKey, altKey } = event
    const target = event.target
    
    // Skip if typing in inputs
    if (isTypingContext(target)) return
    
    // Build shortcut key
    const shortcutKey = `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${key}`
    
    // Try exact match first
    if (shortcuts[shortcutKey]) {
      const handled = shortcuts[shortcutKey](event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
    
    // Try single key shortcuts (when not using modifiers)
    if (!ctrlKey && !shiftKey && !altKey && shortcuts[key]) {
      const handled = shortcuts[key](event)
      if (handled) {
        event.preventDefault()
        return
      }
    }
  }, [enabled, isTypingContext, shortcuts])
  
  useEffect(() => {
    if (!enabled) return
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Hook for managing focus restoration
 */
export function useFocusRestore() {
  const lastFocusRef = useRef(null)
  
  const saveFocus = useCallback(() => {
    lastFocusRef.current = document.activeElement
  }, [])
  
  const restoreFocus = useCallback(() => {
    const element = lastFocusRef.current
    if (element && typeof element.focus === 'function') {
      setTimeout(() => element.focus(), 0)
    }
  }, [])
  
  return { saveFocus, restoreFocus }
}