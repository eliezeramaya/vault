import { useState, useEffect } from 'react'

const TUTORIAL_STORAGE_KEY = 'sphere_vault_tutorial_completed'
const TUTORIAL_VERSION = '2.0' // Incremented for new interactive tutorial

export function useMobileTutorial() {
  const [showTutorial, setShowTutorial] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [tutorialTrigger, setTutorialTrigger] = useState(null)

  // Enhanced mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
      
      // More comprehensive mobile detection
      return isMobileDevice || (isTouchDevice && (isSmallScreen || hasCoarsePointer))
    }

    const updateMobileStatus = () => {
      const mobile = checkMobile()
      setIsMobile(mobile)
      
      // Log detection for debugging
      if (mobile) {
        console.log('Mobile device detected, tutorial available')
      }
    }

    updateMobileStatus()
    window.addEventListener('resize', updateMobileStatus)
    return () => window.removeEventListener('resize', updateMobileStatus)
  }, [])

  // Check if tutorial should be shown
  useEffect(() => {
    if (!isMobile) return

    try {
      const tutorialData = localStorage.getItem(TUTORIAL_STORAGE_KEY)
      const data = tutorialData ? JSON.parse(tutorialData) : null
      
      // Show tutorial if:
      // 1. No tutorial data exists (new user)
      // 2. Tutorial version has changed (new features)
      // 3. User explicitly requested it
      // 4. More than 30 days since last completion (optional refresh)
      const shouldShow = !data || 
                        data.version !== TUTORIAL_VERSION || 
                        data.forceShow ||
                        (data.completedAt && isOlderThan30Days(data.completedAt))
      
      if (shouldShow) {
        setShowTutorial(true)
        setTutorialTrigger(data ? 'version_update' : 'new_user')
      }
    } catch (error) {
      console.warn('Error reading tutorial data:', error)
      setShowTutorial(true)
      setTutorialTrigger('error_fallback')
    }
  }, [isMobile])

  const isOlderThan30Days = (dateString) => {
    try {
      const completedDate = new Date(dateString)
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      return completedDate < thirtyDaysAgo
    } catch {
      return false
    }
  }

  const completeTutorial = () => {
    try {
      const tutorialData = {
        completed: true,
        version: TUTORIAL_VERSION,
        completedAt: new Date().toISOString(),
        forceShow: false,
        trigger: tutorialTrigger,
        completionCount: incrementCompletionCount()
      }
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialData))
      console.log('Tutorial completed successfully')
    } catch (error) {
      console.warn('Error saving tutorial completion:', error)
    }
    setShowTutorial(false)
    setTutorialTrigger(null)
  }

  const skipTutorial = () => {
    try {
      const tutorialData = {
        completed: false,
        skipped: true,
        version: TUTORIAL_VERSION,
        skippedAt: new Date().toISOString(),
        forceShow: false,
        trigger: tutorialTrigger,
        skipCount: incrementSkipCount()
      }
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialData))
      console.log('Tutorial skipped')
    } catch (error) {
      console.warn('Error saving tutorial skip:', error)
    }
    setShowTutorial(false)
    setTutorialTrigger(null)
  }

  const resetTutorial = () => {
    try {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY)
      if (isMobile) {
        setShowTutorial(true)
        setTutorialTrigger('manual_reset')
      }
      console.log('Tutorial reset')
    } catch (error) {
      console.warn('Error resetting tutorial:', error)
    }
  }

  const forceTutorial = () => {
    try {
      const tutorialData = {
        completed: false,
        version: TUTORIAL_VERSION,
        forceShow: true,
        forcedAt: new Date().toISOString()
      }
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialData))
      setShowTutorial(true)
      setTutorialTrigger('manual_force')
      console.log('Tutorial forced to show')
    } catch (error) {
      console.warn('Error forcing tutorial:', error)
      setShowTutorial(true)
      setTutorialTrigger('manual_force')
    }
  }

  const getTutorialStatus = () => {
    try {
      const tutorialData = localStorage.getItem(TUTORIAL_STORAGE_KEY)
      return tutorialData ? JSON.parse(tutorialData) : null
    } catch (error) {
      console.warn('Error reading tutorial status:', error)
      return null
    }
  }

  const incrementCompletionCount = () => {
    try {
      const current = getTutorialStatus()
      return (current?.completionCount || 0) + 1
    } catch {
      return 1
    }
  }

  const incrementSkipCount = () => {
    try {
      const current = getTutorialStatus()
      return (current?.skipCount || 0) + 1
    } catch {
      return 1
    }
  }

  // Analytics helpers
  const logTutorialEvent = (eventType, data = {}) => {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      isMobile,
      trigger: tutorialTrigger,
      userAgent: navigator.userAgent,
      ...data
    }
    
    // Could be sent to analytics service
    console.log('Tutorial Event:', event)
  }

  return {
    showTutorial,
    isMobile,
    tutorialTrigger,
    completeTutorial,
    skipTutorial,
    resetTutorial,
    forceTutorial,
    getTutorialStatus,
    logTutorialEvent
  }
}

export default useMobileTutorial