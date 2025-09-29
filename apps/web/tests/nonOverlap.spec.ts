import { test, expect, Page } from '@playwright/test';

const addQuick = async (page: Page, text: string) => {
  const before = await page.locator('.eh-note').count();
  const input = page.getByPlaceholder('Añadir tarea rápida...');
  await input.fill(text);
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.locator('.eh-note')).toHaveCount(before + 1);
};

const boxes = async (page: Page) => {
  const notes = page.locator('.eh-note');
  const count = await notes.count();
  const arr = [] as NonNullable<Awaited<ReturnType<typeof notes.boundingBox>>>[];
  for (let i=0;i<count;i++){
    const b = await notes.nth(i).boundingBox();
    if (b) arr.push(b);
  }
  return arr;
};

const overlaps = (a: {x:number;y:number;width:number;height:number}, b: {x:number;y:number;width:number;height:number}) => {
  const aR = a.x + a.width;
  const aB = a.y + a.height;
  const bR = b.x + b.width;
  const bB = b.y + b.height;
  return !(aR <= b.x || bR <= a.x || aB <= b.y || bB <= a.y);
};

test('crear varias notas no se empalman', async ({ page }) => {
  await page.goto('/');
  // Entrar a la Matriz
  await page.getByRole('button', { name: 'Entrar a la Matriz' }).click();

  // Crear varias notas por entrada rápida
  await addQuick(page, 'A');
  await addQuick(page, 'B');
  await addQuick(page, 'C');
  await addQuick(page, 'D');

  const bxs = await boxes(page);
  expect(bxs.length).toBeGreaterThanOrEqual(4);
  // Checa que ningún par se empalma
  for (let i=0;i<bxs.length;i++){
    for (let j=i+1;j<bxs.length;j++){
      expect(overlaps(bxs[i], bxs[j])).toBeFalsy();
    }
  }
});

test('drag reroutes to non-colliding slot', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar a la Matriz' }).click();

  await addQuick(page, 'A');
  await addQuick(page, 'B');

  const first = page.locator('.eh-note').nth(0);
  const second = page.locator('.eh-note').nth(1);

  const a1 = await first.boundingBox();
  const b1 = await second.boundingBox();
  if (!a1 || !b1) throw new Error('Notes not found');

  // Intenta arrastrar B encima de A
  await page.mouse.move(b1.x + b1.width/2, b1.y + b1.height/2);
  await page.mouse.down();
  await page.mouse.move(a1.x + a1.width/2, a1.y + a1.height/2, { steps: 10 });
  await page.mouse.up();

  // Verifica que no se empalman tras el intento
  const a2 = await first.boundingBox();
  const b2 = await second.boundingBox();
  if (!a2 || !b2) throw new Error('Notes not found after drag');
  expect(overlaps(a2, b2)).toBeFalsy();
});
