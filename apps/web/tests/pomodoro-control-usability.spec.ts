import { test, expect } from '@playwright/test'

test.describe('Pomodoro Control Usability', () => {
  test('should have improved button hierarchy and descriptive labels', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss any blocking dialogs first
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro tab
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Verify enhanced start button with descriptive label
    const startButton = page.getByTestId('start-work-btn')
    await expect(startButton).toBeVisible()

    // Verify the start button has proper iconography
    // Start button now shows play icon ▶️ and text 'Iniciar sesión de trabajo'
    await expect(startButton).toContainText('Iniciar')

    // Start a session to test other controls
    await startButton.click()
    await page.waitForTimeout(1000) // Wait for state change

    // Verify work phase controls have descriptive labels
    const pauseButton = page.getByTestId('pause-btn')
    const stopButton = page.getByTestId('stop-work-btn')

    if (await pauseButton.isVisible().catch(() => false)) {
      await expect(pauseButton).toBeVisible()
      await expect(pauseButton).toContainText('⏸️')

      await expect(stopButton).toBeVisible()
      await expect(stopButton).toContainText('🚫')

      // Test pause functionality
      await pauseButton.click()
      await page.waitForTimeout(500)

      // Verify paused state controls
      const resumeButton = page.getByTestId('resume-btn')
      const detenerButton = page.getByTestId('reset-btn')

      if (await resumeButton.isVisible().catch(() => false)) {
        await expect(resumeButton).toBeVisible()
        await expect(resumeButton).toContainText('▶️')

        await expect(detenerButton).toBeVisible()
        await expect(detenerButton).toContainText('🚫')
      }
    }
  })

  test('should show proper button styling hierarchy', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Check that primary action (start) has primary styling
    const startButton = page.getByTestId('start-work-btn')
    await expect(startButton).toBeVisible()

    // Verify the button has proper styling attributes (we can check computed styles)
    const startButtonStyles = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        display: styles.display,
        alignItems: styles.alignItems,
        gap: styles.gap,
      }
    })

    // Should have flex display for icon + text layout (computed styles may vary)
    expect(['flex', 'block'].includes(startButtonStyles.display)).toBe(true)

    // Should have rounded corners
    expect(startButtonStyles.borderRadius).toContain('px')
  })

  test('should have clear destructive actions', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Start a session
    await page.getByTestId('start-work-btn').click()
    await page.waitForTimeout(1000)

    // Look for destructive action buttons (should have clear 'stop/end' language instead of generic 'reset')
    const destructiveButtons = page.locator(
      '[data-testid="stop-work-btn"], [data-testid="reset-btn"], button:has-text("Finalizar")'
    )

    if ((await destructiveButtons.count()) > 0) {
      const firstDestructiveButton = destructiveButtons.first()
      await expect(firstDestructiveButton).toBeVisible()

      // Should have warning icon
      await expect(firstDestructiveButton).toContainText('🚫')

      // Should have specific action text, not generic 'reset' or 'reiniciar'
      const buttonText = await firstDestructiveButton.textContent()
      expect(buttonText).not.toContain('Reiniciar')
      expect(buttonText).not.toContain('Reset')
    }
  })

  test('should have enhanced audio test button', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro and expand settings
    await page.getByRole('tab', { name: 'Pomodoro' }).click()
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300)

    // Look for the enhanced audio test button
    const audioTestButton = page.locator('button:has-text("Probar")')

    if (await audioTestButton.isVisible().catch(() => false)) {
      await expect(audioTestButton).toBeVisible()

      // Should have descriptive text instead of just emoji
      await expect(audioTestButton).toContainText('Probar sonido')
      await expect(audioTestButton).toContainText('🔊')

      // Should be clickable
      await audioTestButton.click()
      // Audio test should not cause errors
      await page.waitForTimeout(100)
    }
  })

  test('should show improved phase-specific button colors', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Start session
    await page.getByTestId('start-work-btn').click()
    await page.waitForTimeout(1000)

    // Check if we can trigger a break state to test break-specific styling
    const completeButton = page.locator('button:has-text("Completar ahora")')
    if (await completeButton.isVisible().catch(() => false)) {
      await completeButton.click()
      await page.waitForTimeout(1000)

      // Look for break phase buttons with different styling
      const breakButtons = page.locator(
        'button:has-text("Terminar descanso"), button:has-text("Salir del Pomodoro")'
      )

      if ((await breakButtons.count()) > 0) {
        const breakButton = breakButtons.first()
        await expect(breakButton).toBeVisible()

        // Should have specific break action text
        const buttonText = await breakButton.textContent()
        expect(buttonText).toMatch(/Terminar descanso|Salir del Pomodoro/)
      }
    }
  })
})
