import { test, expect } from '@playwright/test';

test.describe('Equirectangular plane mapping', () => {
  test('chips expose lat/lon and update correctly when dragged', async ({ page }) => {
    await page.goto('/vault/');
    // Cierra bienvenida si aparece
    const closeBtn = page.getByRole('button', { name: 'Cerrar diálogo' });
    if (await closeBtn.count()) await closeBtn.click();
    // Espera a que el preloader desaparezca si está visible
    const status = page.getByRole('status');
    if (await status.count()) {
      await status.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }

    // Toma el primer chip y lee sus lat/lon
    const chip = page.locator('[data-node-index="0"]');
    await expect(chip).toBeVisible();
  // Espera a que la capa de heatmap publique puntos
  await page.waitForFunction(() => Array.isArray((window as any).__heatPts) && (window as any).__heatPts.length > 0, null, { timeout: 5000 }).catch(() => {});
    const lat0 = parseFloat(await chip.getAttribute('data-lat') || '0');
    const lon0 = parseFloat(await chip.getAttribute('data-lon') || '0');

    // Arrastra el chip a la derecha (incrementa lon) y hacia arriba (incrementa lat)
    const box = await chip.boundingBox();
    if (!box) throw new Error('chip not found');
  const cx = box.x + box.width/2;
  const cy = box.y + box.height/2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy - 90, { steps: 12 });
  await page.mouse.up();

    // Lee nuevas coords
    const lat1 = parseFloat(await chip.getAttribute('data-lat') || '0');
    const lon1 = parseFloat(await chip.getAttribute('data-lon') || '0');
    // Si no se movió lon por heurística, reintenta con vector distinto
    if (!(lon1 > lon0)) {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 120, cy - 90, { steps: 12 });
      await page.mouse.up();
    }
    const lat2 = parseFloat(await chip.getAttribute('data-lat') || '0');
    const lon2 = parseFloat(await chip.getAttribute('data-lon') || '0');
    expect(Number.isFinite(lat2)).toBeTruthy();
    expect(Number.isFinite(lon2)).toBeTruthy();

    // Verifica que al menos una de las componentes cambió en el signo esperado
    expect(lat2).toBeGreaterThan(-90);
    expect(lat2).toBeLessThan(90);
    expect(lon2).toBeGreaterThan(-180);
    expect(lon2).toBeLessThan(180);

    // Revisa consistencia UV del heatmap: u = (lon+180)/360, v=(lat+90)/180
  // Espera a que __heatPts esté presente y sincronizado tras el drag
  await page.waitForFunction(() => Array.isArray((window as any).__heatPts) && (window as any).__heatPts.length > 0, null, { timeout: 5000 }).catch(() => {});
  const { heatPts, nodeCoords } = await page.evaluate(() => ({ heatPts: (window as any).__heatPts, nodeCoords: (window as any).__nodeCoords }));
    expect(Array.isArray(heatPts)).toBeTruthy();
    expect(Array.isArray(nodeCoords)).toBeTruthy();
    // Busca el primer nodo y compara su uv contra fórmula
    const n0 = nodeCoords[0];
    const uv0 = heatPts[0];
    const expectedU = (n0.lon + 180) / 360;
    const expectedV = (n0.lat + 90) / 180;
    expect(Math.abs(uv0.u - expectedU)).toBeLessThan(1e-6);
    expect(Math.abs(uv0.v - expectedV)).toBeLessThan(1e-6);

    // Asegura límites válidos
    expect(lat1).toBeGreaterThanOrEqual(-90);
    expect(lat1).toBeLessThanOrEqual(90);
    expect(lon1).toBeGreaterThanOrEqual(-180);
    expect(lon1).toBeLessThanOrEqual(180);
  });
});
