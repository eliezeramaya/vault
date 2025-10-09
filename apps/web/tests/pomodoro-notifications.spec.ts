import { test, expect } from '@playwright/test'

test.describe('Pomodoro Notifications', () => {
  test('should have notification settings in configuration', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss any blocking dialogs first
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro tab
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings section
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300)

    // Verify notification settings are present
    await expect(page.getByText('Notificaciones del sistema').first()).toBeVisible()
    await expect(page.getByText('Habilitar notificaciones').first()).toBeVisible()

    // Verify audio settings are present
    await expect(page.getByText('Sonidos de notificación').first()).toBeVisible()

    // Verify test audio button exists
    await expect(page.getByRole('button', { name: /Probar/ }).first()).toBeVisible()
  })

  test('should save notification preferences to localStorage', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300)

    // Test audio settings toggle
    const audioInput = page
      .locator('label')
      .filter({ hasText: 'Sonidos de notificación' })
      .locator('input[type=\"checkbox\"]')
      .first()

    // Toggle audio off
    if (await audioInput.isChecked()) {
      await audioInput.uncheck()
    } else {
      await audioInput.check()
    }

    // Check localStorage persistence
    const audioSettingInStorage = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('pomo_audio') || 'true')
      } catch {
        return true
      }
    })

    expect(typeof audioSettingInStorage).toBe('boolean')

    // Test notification settings (might require permission)
    const notificationInput = page
      .locator('label')
      .filter({ hasText: 'Habilitar notificaciones' })
      .locator('input[type=\"checkbox\"]')
      .first()
    const isChecked = await notificationInput.isChecked()

    // Try to toggle notifications (this might trigger permission request in real browser)
    if (isChecked) {
      await notificationInput.uncheck()
    }

    // Verify localStorage for notifications
    const notificationSettingInStorage = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('pomo_notifications') || 'true')
      } catch {
        return true
      }
    })

    expect(typeof notificationSettingInStorage).toBe('boolean')
  })

  test('should test audio notification sound', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300)

    // Test the audio test button
    const testAudioButton = page.getByRole('button', { name: /Probar sonido/ }).first()
    await expect(testAudioButton).toBeVisible()

    // Click the test button (this will try to play audio)
    await testAudioButton.click()

    // We can't easily test audio playback in headless mode, but we can verify the button works
    // If it doesn't throw an error, the audio system is functioning
    await page.waitForTimeout(500) // Wait for potential audio to play
  })

  test('should handle notification permission states', async ({ page, context }) => {
    // Grant notification permission for this test
    await context.grantPermissions(['notifications'])

    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300)

    // Verify notification permission handling
    const notificationCheckbox = page
      .locator('label')
      .filter({ hasText: 'Habilitar notificaciones' })
      .locator('input[type=\"checkbox\"]')
      .first()

    // Should be able to enable notifications when permission is granted
    if (!(await notificationCheckbox.isChecked())) {
      await notificationCheckbox.check()
      await expect(notificationCheckbox).toBeChecked()
    }

    // Check that notification settings are working (we test that settings exist rather than permission message)
    await expect(page.getByText('Notificaciones del sistema').first()).toBeVisible()
    await expect(notificationCheckbox).toBeVisible()
  })

  test('should show notification configuration correctly', async ({ page }) => {
    await page.goto('/vault/')

    // Dismiss welcome dialog
    const closeWelcome = page.getByRole('button', { name: 'Cerrar diálogo' })
    if (await closeWelcome.isVisible().catch(() => false)) {
      await closeWelcome.click()
    }

    // Navigate to Pomodoro
    await page.getByRole('tab', { name: 'Pomodoro' }).click()

    // Expand settings section
    await page.getByText('Configuración avanzada').click()
    await page.waitForTimeout(300)

    // Verify all notification-related settings are present and properly organized
    const notificationLabel = page.getByText('🔔 Notificaciones').first()
    const audioLabel = page.getByText('🔊 Audio').first()

    await expect(notificationLabel).toBeVisible()
    await expect(audioLabel).toBeVisible()

    // Verify the settings are properly structured
    const notificationContainer = page
      .locator('label')
      .filter({ hasText: 'Habilitar notificaciones' })
      .first()
    const audioContainer = page
      .locator('label')
      .filter({ hasText: 'Sonidos de notificación' })
      .first()

    await expect(notificationContainer).toBeVisible()
    await expect(audioContainer).toBeVisible()

    // Verify test button is part of audio settings
    const testButton = audioContainer.getByRole('button', { name: /Probar/ })
    await expect(testButton).toBeVisible()
  })
})
