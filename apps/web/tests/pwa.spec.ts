import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('registers SW and works offline', async ({ page, context }) => {
    // Go to the app (preview server baseURL is configured to /vault/)
    await page.goto('/vault/');
    await page.waitForLoadState('load');

    // Ensure manifest link exists
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);

    // Service worker should register (wait up to 30s for activation)
    await expect.poll(async () => {
      return await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return 'no-sw';
        const reg = await navigator.serviceWorker.getRegistration();
        return reg?.active?.state ?? 'none';
      });
    }, { timeout: 30000, intervals: [250, 500, 1000] }).toBe('activated');

    // Reload so the page is controlled by the SW
    await page.reload();
    await expect.poll(async () => {
      return await page.evaluate(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));
    }, { timeout: 30000, intervals: [250, 500, 1000] }).toBe(true);

    // sw.js should be reachable via HTTP
    const swResp = await page.request.get('/vault/sw.js');
    expect(swResp.ok()).toBeTruthy();

    // Go offline and ensure app shell still loads from cache
    await context.setOffline(true);
    await page.reload();

    // Root element should still be present (index.html is precached)
    await expect(page.locator('#root')).toHaveCount(1);
    // The SW should still control the page while offline
    const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker && navigator.serviceWorker.controller));
    expect(controlled).toBeTruthy();

    // Restore online for subsequent tests
    await context.setOffline(false);
  });
});
