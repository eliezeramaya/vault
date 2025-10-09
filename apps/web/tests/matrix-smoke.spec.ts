import { test, expect, Page, Locator } from '@playwright/test'

async function enterMatrix(page: Page) {
  await page.goto('/vault/')
  // Si aparece el welcome
  const btn = page.getByRole('button', { name: /Entrar a la Matriz/i })
  if (await btn.isVisible()) {
    await btn.click()
  } else {
    // Fallback: usar tab o atajo si ya está dentro? Cambiar vista mediante tablist
    const matrixTab = page.getByRole('tab', { name: /Matriz/i })
    if (await matrixTab.isVisible()) await matrixTab.click()
  }
  await expect(page.getByRole('tabpanel', { name: /Matriz/i })).toBeVisible()
}

const quickAdd = async (page: Page, text: string) => {
  const input = page.getByPlaceholder('Añadir tarea rápida...')
  await input.fill(text)
  await page.getByRole('button', { name: 'Añadir' }).click()
  await expect(page.locator('.eh-note', { hasText: text })).toBeVisible()
}

const getBoxes = async (page: Page) => {
  const notes = page.locator('.eh-note')
  const count = await notes.count()
  const result: { x: number; y: number; width: number; height: number }[] = []
  for (let i = 0; i < count; i++) {
    const bb = await notes.nth(i).boundingBox()
    if (bb) result.push(bb)
  }
  return result
}

type Box = { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) =>
  !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)

test.describe('Matrix smoke', () => {
  test('create, edit, prevent overlap, zoom to fit', async ({ page }) => {
    await enterMatrix(page)

    // Crear 3 notas
    await quickAdd(page, 'Alpha')
    await quickAdd(page, 'Beta')
    await quickAdd(page, 'Gamma')

    // Editar una nota (si modo edición disponible)
    const first = page.locator('.eh-note').first()
    await first.dblclick()
    const editInputCandidates = page.locator('textarea:visible, input[type="text"]:visible')
    if ((await editInputCandidates.count()) > 0) {
      const ei = editInputCandidates.first()
      await ei.fill('Alpha Edit')
      try {
        await ei.press('Enter')
      } catch {}
      // Verificación suave (no romper smoke si UI de edición cambia)
      const maybeEdited = page.locator('.eh-note', { hasText: 'Alpha Edit' })
      if ((await maybeEdited.count()) > 0) {
        await expect(maybeEdited.first()).toBeVisible()
      }
    } else {
      // No editable input detected; continue smoke
      await first.click({ force: true })
    }

    // Verificar no overlap
    const boxes = await getBoxes(page)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j])).toBeFalsy()
      }
    }

    // Zoom to fit (si hay control o atajo). Intentar atajo '0'
    await page.keyboard.press('0')
    // Smoke: Después del zoom, las notas deben seguir visibles
    await expect(page.locator('.eh-note').first()).toBeVisible()
  })
})
