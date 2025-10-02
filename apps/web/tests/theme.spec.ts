import { test, expect } from '@playwright/test';

test('theme toggle persists in localStorage', async ({ page }) => {
  await page.goto('/vault/');
  // Dismiss Welcome dialog if visible to avoid pointer interception
  const closeBtn = page.getByRole('button', { name: 'Cerrar diálogo' });
  if (await closeBtn.count()) {
    await closeBtn.click();
  }

  // Read initial theme from <html data-theme>
  const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(initial === 'light' || initial === 'dark').toBeTruthy();

  // Find the theme toggle button. Its accessible name contains "Cambiar a modo"
  const toggle = page.getByRole('button', { name: /Cambiar a modo/ });
  await expect(toggle).toBeVisible();

  // Toggle theme via keyboard to avoid pointer interception overlays
  await toggle.focus();
  await page.keyboard.press('Enter');

  // Assert theme changed on html attribute
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(after).not.toEqual(initial);

  // Assert localStorage persisted value
  const stored = await page.evaluate(() => localStorage.getItem('theme'));
  expect(stored).toEqual(after);

  // Reload and ensure it remains
  await page.reload();
  const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(afterReload).toEqual(after);
});
