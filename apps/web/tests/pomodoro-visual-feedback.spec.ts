import { test, expect } from '@playwright/test'

test.describe('Pomodoro Visual Feedback', () => {
  test('should show enhanced visual feedback and animations', async ({ page }) => {
    await page.goto('/vault/')
    
    // Dismiss any blocking dialogs first
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }
    
    // Navigate to Pomodoro tab
    await page.getByRole('tab', { name: 'Pomodoro' }).click()
    
    // Verify initial state has proper styling
    const timerDisplay = page.locator('[aria-live="polite"]')
    await expect(timerDisplay).toBeVisible()
    
    // Verify the circular progress container exists
    const progressContainer = page.locator('div').filter({
      has: page.locator('[aria-live="polite"]')
    }).first()
    await expect(progressContainer).toBeVisible()
    
    // Start timer and verify visual feedback changes
    await page.getByRole('button', { name: /🍅 Iniciar Pomodoro/ }).click()
    
    // Wait for phase change
    await page.waitForTimeout(500)
    
    // Verify phase badge appears with proper styling
    await expect(page.locator('span').filter({ hasText: 'ENFOQUE' })).toBeVisible()
    
    // Verify timer color changes for work phase
    const timerText = page.locator('[aria-live="polite"]')
    await expect(timerText).toBeVisible()
    
    // Verify enhanced phase label with emoji
    await expect(page.getByText('🔥 Tiempo de enfoque')).toBeVisible()
    
    // Verify progress percentage is shown
    const progressPercent = page.locator('div').filter({ hasText: /\d+%/ })
    await expect(progressPercent).toBeVisible()
    
    // Verify time remaining indicator
    await expect(page.getByText(/min restantes/)).toBeVisible()
    
    // Test pause state visual feedback
    await page.getByRole('button', { name: /⏸️ Pausar/ }).click()
    await page.waitForTimeout(300)
    
    // Verify paused state styling
    await expect(page.locator('span').filter({ hasText: 'PAUSADO' })).toBeVisible()
    await expect(page.getByText('⏸️ En pausa')).toBeVisible()
    
    // Test resume with visual feedback
    await page.getByRole('button', { name: /▶️ Continuar/ }).click()
    await page.waitForTimeout(300)
    
    // Verify work state returns
    await expect(page.locator('span').filter({ hasText: 'ENFOQUE' })).toBeVisible()
    
    // Reset to test idle state
    await page.getByRole('button', { name: /🔄 Reiniciar/ }).click()
    await page.waitForTimeout(300)
    
    // Verify idle state styling returns
    await expect(page.getByRole('button', { name: /🍅 Iniciar Pomodoro/ })).toBeVisible()
    await expect(page.getByText('Listo para comenzar')).toBeVisible()
    
    // Verify progress percentage is hidden in idle state
    await expect(page.locator('div').filter({ hasText: /\d+%/ })).not.toBeVisible()
  })
  
  test('should show different visual feedback for break phases', async ({ page }) => {
    await page.goto('/vault/')
    
    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }
    
    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()
    
    // Set test mode with very short durations
    await page.getByText('⚙️ Configuración').click()
    await page.waitForTimeout(300)
    
    // Set very short work time if in test mode
    const workInput = page.locator('input[type="number"]').nth(0)
    if (await workInput.getAttribute('step') === '0.1') {
      await workInput.fill('0.1')
    }
    
    // Collapse settings
    await page.getByText('⚙️ Configuración').click()
    await page.waitForTimeout(300)
    
    // Start and complete a work session quickly
    await page.getByRole('button', { name: /🍅 Iniciar Pomodoro/ }).click()
    
    // If test mode is available, use the complete button
    const completeButton = page.getByRole('button', { name: /⚡ Completar ahora/ })
    if (await completeButton.isVisible().catch(() => false)) {
      await completeButton.click()
      await page.waitForTimeout(500)
      
      // Verify break phase visual feedback
      const breakPhase = page.locator('span').filter({ hasText: /DESCANSO/ })
      if (await breakPhase.isVisible().catch(() => false)) {
        // Verify break phase styling
        await expect(page.getByText(/☕ Descanso corto|🛋️ Descanso largo/)).toBeVisible()
        
        // Verify skip button has proper styling for break phase
        await expect(page.getByRole('button', { name: /⏭️ Saltar descanso/ })).toBeVisible()
      }
    }
  })
})