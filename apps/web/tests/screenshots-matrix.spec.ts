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
      // Ensure matrix view preference to bypass onboarding
      await page.addInitScript(() => {
        try {
          localStorage.setItem('view', 'matrix')
        } catch {}
      })
      // Load page directly (baseURL already set to /vault/)
      await page.goto('./', { waitUntil: 'networkidle', timeout: 30000 })
      // Wait a bit for React hydration
      await page.waitForTimeout(1000)
      // Click Matrix tab (should be visible now that welcome is bypassed)
      const matrixTab = page.getByRole('tab', { name: /Matriz/i })
      await matrixTab.click({ timeout: 10000 })
      // Wait for panel to be visible
      const panel = page.locator('#panel-matrix')
      await expect(panel).toBeVisible({ timeout: 15_000 })
      // Give D3 layout time to render
      await page.waitForTimeout(1000)
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
