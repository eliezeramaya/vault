import { test, expect } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

const outDir = path.resolve(__dirname, '..', '..', '..', 'docs', 'screenshots')

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

test.describe('Matrix screenshots', () => {
  test('capture dark and light variants', async ({ page, viewport }) => {
    await ensureDir(outDir)

    // Use a consistent desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    // Helper to navigate directly to Matrix via hash
    const gotoMatrix = async () => {
      await page.goto('/#matrix', { waitUntil: 'domcontentloaded' })
      const panel = page.locator('#panel-matrix')
      await expect(panel).toBeVisible({ timeout: 10_000 })
      // Give D3 layout a tick to settle and fonts to load
      await page.waitForTimeout(400)
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
