import { test, expect } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

// From apps/web working dir to repo docs/screenshots
const outDir = path.resolve(process.cwd(), '../../docs/screenshots')

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

test.describe('Matrix screenshots @smoke', () => {
  test('capture dark and light variants @smoke', async ({ page, viewport }) => {
    await ensureDir(outDir)

    // Use a consistent desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // Helper to navigate directly to Matrix via hash
    const gotoMatrix = async () => {
      // Load page with matrix hash under configured baseURL
      await page.goto('./#matrix', { waitUntil: 'networkidle' })
      // Wait for app root to hydrate
      await page.locator('#root').first().waitFor({ timeout: 15000 })
      // If welcome dialog is present, click "Entrar a la Matriz"
      const welcomeMatrixBtn = page.getByRole('button', { name: /Entrar a la Matriz/i })
      if (await welcomeMatrixBtn.isVisible().catch(() => false)) {
        await welcomeMatrixBtn.click()
      }
      // Switch to Matrix via visible tab
      const tab = page.getByRole('tab', { name: /^Matriz$/ })
      await tab
        .first()
        .click({ trial: false })
        .catch(() => {})
      const panel = page.locator('#panel-matrix')
      await panel.first().waitFor({ timeout: 15000 })
      await expect(panel).toBeVisible({ timeout: 15_000 })
      // Give D3 layout a tick to settle and fonts to load
      await page.waitForTimeout(600)
    }

    // DARK
    await page.addInitScript(() => {
      try {
        localStorage.setItem('vault-theme-preference', 'dark')
      } catch {}
    })
    await gotoMatrix()
    await page.screenshot({ path: path.join(outDir, 'matrix-dark.png'), fullPage: true })

    // LIGHT
    await page.evaluate(() => {
      try {
        localStorage.setItem('vault-theme-preference', 'light')
      } catch {}
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await gotoMatrix()
    await page.screenshot({ path: path.join(outDir, 'matrix-light.png'), fullPage: true })
  })
})
