import { test, expect, devices, Page } from '@playwright/test';

const checkPreloader = async (page: Page) => {
  await page.goto('/vault/');
  const overlay = page.getByRole('status');
  await expect(overlay).toBeVisible();
  // Wait until aria-label includes 100%
  await expect.poll(async () => await overlay.getAttribute('aria-label'), { timeout: 30000 }).toContain('100%');
  // After reaching 100%, the overlay should fade out (opacity 0)
  await expect(overlay).toHaveCSS('opacity', '0', { timeout: 20000 });
};

test.describe('Preloader', () => {
  test('reaches 100% and hides (desktop)', async ({ page }) => {
    await checkPreloader(page);
  });
});

test.use({ ...devices['Pixel 5'] });
test('Preloader reaches 100% and hides (mobile)', async ({ page }) => {
  await checkPreloader(page);
});
