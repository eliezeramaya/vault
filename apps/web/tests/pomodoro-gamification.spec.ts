import { test, expect } from '@playwright/test'

test.describe('Pomodoro Stats Gamification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('http://localhost:3000/vault/?pomo_test=1')
    await page.evaluate(() => {
      localStorage.clear()
      // Set test mode
      localStorage.setItem('pomo_test', 'true')
    })
    await page.reload()
    
    // Navigate to Pomodoro tab
    await page.click('text=Pomodoro')
  })

  test('displays stats tab and navigates correctly', async ({ page }) => {
    // Check that stats tab exists
    await expect(page.locator('button:has-text("📊")')).toBeVisible()
    
    // Click stats tab
    await page.click('button:has-text("📊")')
    
    // Check stats content is displayed
    await expect(page.locator('text=📊 Estadísticas de Productividad')).toBeVisible()
    await expect(page.locator('text=🎯 Puntuación de Enfoque')).toBeVisible()
    await expect(page.locator('text=📅 Actividad de la Semana')).toBeVisible()
  })

  test('displays achievements tab and shows system correctly', async ({ page }) => {
    // Navigate to achievements tab
    await page.click('button:has-text("🏆")')
    
    // Check achievements content
    await expect(page.locator('text=Nivel')).toBeVisible()
    await expect(page.locator('text=Maestro de la Productividad')).toBeVisible()
    await expect(page.locator('text=XP')).toBeVisible()
    
    // Check achievement categories
    await expect(page.locator('text=Hitos')).toBeVisible()
    await expect(page.locator('text=Rachas')).toBeVisible()
    await expect(page.locator('text=Diarios')).toBeVisible()
  })

  test('shows progress charts and visual feedback', async ({ page }) => {
    await page.click('button:has-text("📊")')
    
    // Wait for stats to load
    await page.waitForTimeout(1000)
    
    // Check for canvas elements (charts)
    await expect(page.locator('canvas')).toHaveCount(2)
    
    // Check metric cards are displayed
    await expect(page.locator('text=🍅')).toBeVisible()
    await expect(page.locator('text=🔥')).toBeVisible()
    await expect(page.locator('text=⏱️')).toBeVisible()
    
    // Check motivational message
    await expect(page.locator('text=🌱')).toBeVisible()
  })

  test('displays achievement badges and progress', async ({ page }) => {
    await page.click('button:has-text("🏆")')
    
    // Check for achievement cards
    await expect(page.locator('text=Primer Paso')).toBeVisible()
    await expect(page.locator('text=Completa tu primer pomodoro')).toBeVisible()
    
    // Check rarity indicators
    await expect(page.locator('text=common')).toBeVisible()
    await expect(page.locator('text=+50 XP')).toBeVisible()
    
    // Check achievement summary
    await expect(page.locator('text=📈 Resumen de Logros')).toBeVisible()
    await expect(page.locator('text=Desbloqueados')).toBeVisible()
    await expect(page.locator('text=Por desbloquear')).toBeVisible()
  })

  test('unlocks first achievement after completing pomodoro', async ({ page }) => {
    // Start a pomodoro
    await page.click('[data-testid="start-work-btn"]')
    
    // Wait for it to complete (using test mode timing)
    await page.waitForTimeout(200)
    
    // Stop the work session
    await page.click('[data-testid="stop-work-btn"]')
    
    // Navigate to achievements
    await page.click('button:has-text("🏆")')
    
    // Check that first achievement is unlocked
    await expect(page.locator('text=🎉')).toBeVisible({ timeout: 2000 })
    await expect(page.locator('text=¡Nuevo Logro Desbloqueado!')).toBeVisible()
  })

  test('shows correct stats after completing multiple pomodoros', async ({ page }) => {
    // Complete 3 pomodoros
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="start-work-btn"]')
      await page.waitForTimeout(200)
      await page.click('[data-testid="stop-work-btn"]')
      await page.waitForTimeout(100)
    }
    
    // Navigate to stats
    await page.click('button:has-text("📊")')
    
    // Check that stats reflect completed pomodoros
    const todayMetric = page.locator('.metric-card').first()
    await expect(todayMetric.locator('text=3')).toBeVisible()
  })

  test('displays motivational insights based on performance', async ({ page }) => {
    await page.click('button:has-text("📊")')
    
    // Check for insights section
    await expect(page.locator('text=📊 Tendencias')).toBeVisible()
    await expect(page.locator('text=🏆 Récords Personales')).toBeVisible()
    
    // Check motivational message section
    const motivationalSection = page.locator('.gradient').last()
    await expect(motivationalSection).toBeVisible()
  })

  test('persists tab selection across page reloads', async ({ page }) => {
    // Select stats tab
    await page.click('button:has-text("📊")')
    await expect(page.locator('text=📊 Estadísticas de Productividad')).toBeVisible()
    
    // Reload page
    await page.reload()
    await page.click('text=Pomodoro')
    
    // Should still be on stats tab
    await expect(page.locator('text=📊 Estadísticas de Productividad')).toBeVisible()
  })

  test('shows XP and level progression', async ({ page }) => {
    // Complete a pomodoro to gain XP
    await page.click('[data-testid="start-work-btn"]')
    await page.waitForTimeout(200)
    await page.click('[data-testid="stop-work-btn"]')
    
    // Check achievements tab
    await page.click('button:has-text("🏆")')
    
    // Check XP display
    await expect(page.locator('text=50 XP')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=para el siguiente nivel')).toBeVisible()
  })

  test('shows achievement categories and filtering', async ({ page }) => {
    await page.click('button:has-text("🏆")')
    
    // Check all achievement categories are displayed
    const categories = ['Hitos', 'Rachas', 'Diarios', 'Calidad', 'Hábitos', 'Especiales']
    
    for (const category of categories) {
      await expect(page.locator(`text=${category}`)).toBeVisible()
    }
    
    // Check that achievements are grouped by category
    await expect(page.locator('text=Primer Paso').locator('xpath=ancestor::div[contains(@style, "grid")]')).toBeVisible()
  })

  test('displays proper visual hierarchy and animations', async ({ page }) => {
    await page.click('button:has-text("🏆")')
    
    // Check for proper tab styling
    const activeTab = page.locator('button:has-text("🏆")')
    await expect(activeTab).toHaveCSS('background-color', 'rgb(239, 68, 68)')
    
    // Check level display has proper styling
    const levelDisplay = page.locator('text=Nivel 1')
    await expect(levelDisplay).toBeVisible()
    
    // Check achievement cards have proper styling
    const achievementCard = page.locator('text=Primer Paso').locator('xpath=ancestor::div[1]')
    await expect(achievementCard).toBeVisible()
  })
})

test.describe('Pomodoro Stats Integration', () => {
  test('stats integrate with existing metrics system', async ({ page }) => {
    await page.goto('http://localhost:3000/vault/?pomo_test=1')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    
    await page.click('text=Pomodoro')
    
    // Complete a pomodoro
    await page.click('[data-testid="start-work-btn"]')
    await page.waitForTimeout(200)
    await page.click('[data-testid="stop-work-btn"]')
    
    // Check both timer tab stats and dedicated stats tab
    await expect(page.locator('text=📊 Estadísticas de la semana')).toBeVisible()
    
    await page.click('button:has-text("📊")')
    await expect(page.locator('text=📊 Estadísticas de Productividad')).toBeVisible()
    
    // Both should show the completed pomodoro
    await expect(page.locator('text=1').first()).toBeVisible()
  })

  test('achievements unlock at correct milestones', async ({ page }) => {
    await page.goto('http://localhost:3000/vault/?pomo_test=1')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    
    await page.click('text=Pomodoro')
    
    // Complete first pomodoro
    await page.click('[data-testid="start-work-btn"]')
    await page.waitForTimeout(200)
    await page.click('[data-testid="stop-work-btn"]')
    
    await page.click('button:has-text("🏆")')
    
    // Should unlock "Primer Paso" achievement
    await expect(page.locator('text=¡Nuevo Logro Desbloqueado!')).toBeVisible({ timeout: 2000 })
    await expect(page.locator('text=Primer Paso')).toBeVisible()
  })
})