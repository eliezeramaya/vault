import { test, expect } from '@playwright/test'

test('keyboard shortcuts: create, edit, move, delete, zoom', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar a la Matriz' }).click()

  // Create via N
  await page.keyboard.press('KeyN')
  // Composer should appear
  await expect(page.locator('.eh-composer textarea')).toBeVisible()
  await page.keyboard.type('Nota via N')
  await page.keyboard.press('Enter')
  await expect(page.locator('.eh-note')).toHaveCount(1)

  // Select the note and move with arrows
  // Select the note
  const note = page.locator('.eh-note').first()
  await note.click()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  const srMove = page.locator('[data-testid="sr"]')
  await expect(srMove).toContainText('Nota movida', { timeout: 2000 })

  // Edit with E, then cancel with Esc (composer closes)
  await page.keyboard.press('KeyE')
  await expect(page.locator('.eh-composer textarea')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.eh-composer')).toHaveCount(0)

  // Delete with Delete
  await page.keyboard.press('Delete')
  await expect(page.locator('.eh-note')).toHaveCount(0)

  // Zoom shortcuts should update the percent control
  const pct = page.locator('button:has-text("%")').first()
  const pct1 = await pct.innerText()
  await page.keyboard.press('=')
  const pct2 = await pct.innerText()
  expect(pct2).not.toEqual(pct1)
  await page.keyboard.press('0') // zoom-to-fit
  await page.keyboard.press('-')
})

test('live region announces key events', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar a la Matriz' }).click()

  // Quick create via input
  await page.getByPlaceholder('Añadir tarea rápida...').fill('X')
  await page.getByRole('button', { name: 'Añadir' }).click()
  // Live region exists and contains some text soon after
  const sr = page.locator('[data-testid="sr"]')
  await expect(sr).toContainText('Nota creada', { timeout: 2000 })
})
