import { test, expect } from '@playwright/test'

test('debug matrix error details', async ({ page }) => {
  page.on('pageerror', (err) => {
    // eslint-disable-next-line no-console
    console.log('\n[pageerror]', err?.message, '\n', err?.stack)
  })
  page.on('console', (msg) => {
    // eslint-disable-next-line no-console
    console.log('[console]', msg.type(), msg.text())
  })
  await page.goto('/vault/')
  await page.getByRole('button', { name: 'Entrar a la Matriz' }).click()
  // If error overlay appears, dump details
  const heading = page.getByRole('heading', { name: '¡Oops! Algo salió mal' })
  if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
    const details = await page.locator('[data-testid="error-details"]').innerText().catch(()=> 'no details found')
    console.log('\n--- ERROR DETAILS START ---\n' + details + '\n--- ERROR DETAILS END ---\n')
    // Ensure test still fails for visibility
    expect(details).toBe('')
  } else {
    // If no overlay, ensure quick input is present
    await expect(page.getByPlaceholder('Añadir tarea rápida...')).toBeVisible()
  }
})
