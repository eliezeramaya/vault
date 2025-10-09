import { test, expect } from '@playwright/test'

test.describe('Pomodoro panel', () => {
  test('should be accessible and have functional UI', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss any blocking dialogs first
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Wait for loading to complete
    await page.waitForLoadState('networkidle')

    // Navigate to Pomodoro tab
    const pomoTab = page.getByRole('tab', { name: 'Pomodoro' })
    await expect(pomoTab).toBeVisible()
    await pomoTab.click()

    // Verify Pomodoro panel weekly stats header (updated copy)
    await expect(page.getByText('Estadísticas de la semana')).toBeVisible()

    // Verify controls are present
    const startButton = page.getByTestId('start-work-btn')
    await expect(startButton).toBeVisible()

    // Verify timer display is prominent
    const timerDisplay = page.locator('div[aria-live="polite"]').filter({ hasText: /\d+:\d+/ })
    await expect(timerDisplay).toBeVisible()

    // Verify settings are in collapsible section
    const settingsToggle = page.getByText('Configuración avanzada')
    await expect(settingsToggle).toBeVisible()

    // Verify settings inputs are present and functional
    // First, expand the settings section
    await settingsToggle.click()
    await page.waitForTimeout(300) // Wait for expansion animation

    const workInput = page.locator('input[type="number"]').nth(0)
    const breakInput = page.locator('input[type="number"]').nth(1)
    await expect(workInput).toBeVisible()
    await expect(breakInput).toBeVisible()

    // Test input functionality
    await workInput.fill('20')
    await expect(workInput).toHaveValue('20')

    // Collapse settings and test timer state change when starting
    await settingsToggle.click()
    await page.waitForTimeout(300) // Wait for collapse animation
    await startButton.click()

    // Wait for state transition
    await page.waitForTimeout(500)

    // Verify timer starts (button changes)
    await expect(page.getByTestId('pause-btn')).toBeVisible()
    await expect(page.getByTestId('stop-work-btn')).toBeVisible()

    // Verify phase indicator appears
    await expect(page.locator('span').filter({ hasText: 'ENFOQUE' })).toBeVisible()
    await expect(page.getByText('Tiempo de enfoque')).toBeVisible()

    // Test pause functionality
    await page.getByTestId('pause-btn').click()
    await expect(page.getByTestId('resume-btn')).toBeVisible()
    await expect(page.locator('span').filter({ hasText: 'PAUSADO' })).toBeVisible()

    // Test resume
    await page.getByTestId('resume-btn').click()
    await expect(page.getByTestId('pause-btn')).toBeVisible()
    await expect(page.locator('span').filter({ hasText: 'ENFOQUE' })).toBeVisible()

    // Test reset
    await page.getByTestId('stop-work-btn').click()
    await expect(page.getByTestId('start-work-btn')).toBeVisible()

    // Verify metrics integration - check that events are being logged
    const hasAnalyticsEvents = await page.evaluate(() => {
      try {
        const events = JSON.parse(localStorage.getItem('analytics_events_v1') || '[]')
        return events.some((e: any) => e?.name?.includes('pomodoro'))
      } catch {
        return false
      }
    })
    expect(hasAnalyticsEvents).toBe(true)
  })

  test('should save settings to localStorage', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss any blocking dialogs first
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Wait for loading to complete
    await page.waitForLoadState('networkidle')

    // Navigate to Pomodoro tab
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings section
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300) // Wait for expansion

    // Change work duration
    const workInput = page.locator('input[type="number"]').nth(0)
    await workInput.fill('30')

    // Change break duration
    const breakInput = page.locator('input[type="number"]').nth(1)
    await breakInput.fill('10')

    // Change checkbox settings
    const autoBreakCheckbox = page.locator('input[type="checkbox"]').nth(0)
    const autoNextCheckbox = page.locator('input[type="checkbox"]').nth(1)

    await autoBreakCheckbox.uncheck()
    await autoNextCheckbox.check()

    // Reload page and verify settings persist
    await page.reload()

    // Dismiss any blocking dialogs after reload
    const closeWelcomeAfterReload = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcomeAfterReload.isVisible().catch(() => false)) {
      await closeWelcomeAfterReload.click()
    }

    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings again to check values
    await page.getByText('⚙️ Configuración').click()
    await page.waitForTimeout(300) // Wait for expansion

    await expect(workInput).toHaveValue('30')
    await expect(breakInput).toHaveValue('10')
    await expect(autoBreakCheckbox).not.toBeChecked()
    await expect(autoNextCheckbox).toBeChecked()
  })
})
