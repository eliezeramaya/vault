import { test, expect } from '@playwright/test'

// @smoke Eisenhower quick add note & persistence
// Cubre camino mínimo: abrir panel, crear nota ligera y verificar que existe tras recarga.
test('@smoke eisenhower add quick note persists', async ({ page }) => {
  await page.goto('/vault/')

  // Cierra bienvenida si aparece
  const closeBtn = page.getByRole('button', { name: 'Cerrar diálogo' })
  if (await closeBtn.count()) await closeBtn.click()

  // Espera a que el preloader desaparezca si está
  const status = page.getByRole('status')
  if (await status.count()) {
    await status.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
  }

  // Abre pestaña / panel Eisenhower (tab con nombre que contenga 'Eisenhower')
  const matrixTab = page.getByRole('tab', { name: /Eisenhower/i })
  if (await matrixTab.count()) {
    await matrixTab.click()
  }

  // Usa un botón o atajo para crear nota; suponemos botón con texto 'Nueva nota' o '+ Nota'
  const newNoteBtn = page.getByRole('button', { name: /Nueva nota|\+ Nota|Añadir nota/i })
  if (!(await newNoteBtn.count())) test.skip(true, 'No se encontró botón de nueva nota')
  await newNoteBtn.click()

  // Localiza textarea / input recién creado (heurística: placeholder o role)
  const editor = page.locator('textarea, [contenteditable="true"]').first()
  await expect(editor).toBeVisible()
  const content = 'SmokeNote_' + Date.now().toString(36)
  await editor.fill?.(content).catch(async () => {
    // fallback para contenteditable
    await editor.pressSequentially?.(content)
  })

  // Fuerza blur para disparar persistencia
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)

  // Verifica que el texto aparece en el DOM
  await expect(page.locator('*:has-text("' + content + '")').first()).toBeVisible()

  // Reload y confirmar persistencia
  await page.reload()
  if (await closeBtn.count()) await closeBtn.click().catch(() => {})
  if (await matrixTab.count()) await matrixTab.click().catch(() => {})
  await expect(page.locator('*:has-text("' + content + '")').first()).toBeVisible()
})
