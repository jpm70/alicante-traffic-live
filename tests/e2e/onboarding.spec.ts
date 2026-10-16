import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'alicante_onboarding_v1';

test('onboarding: la primera visita ofrece el tour y "Ahora no" no vuelve a molestar', async ({ page }) => {
  await page.goto('./');
  const welcome = page.getByRole('dialog', { name: 'Bienvenido a Alicante Tráfico en Vivo' });
  await expect(welcome).toBeVisible();

  await page.getByRole('button', { name: 'Ahora no' }).click();
  await expect(welcome).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('dismissed');

  await page.reload();
  await expect(page.getByRole('button', { name: /Ver el tour/ })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(welcome).toHaveCount(0);
});

test('onboarding: el tour recorre la app paso a paso y se puede repetir', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Empezar el tour' }).click();

  const step = page.locator('#onboarding-step-title');
  await expect(step).toHaveText('1. ¿De dónde a dónde vas?');
  const titles: string[] = [];
  for (let i = 0; i < 12; i++) {
    titles.push((await step.textContent()) || '');
    const next = page.getByRole('button', { name: /^(Siguiente|Terminar)$/ });
    const isLast = (await next.textContent())?.includes('Terminar');
    await next.click();
    if (isLast) break;
    await expect(step).not.toHaveText(titles[titles.length - 1]);
  }
  expect(titles[0]).toBe('1. ¿De dónde a dónde vas?');
  expect(titles[titles.length - 1]).toBe('¡Listo para salir!');
  expect(titles.length).toBeGreaterThanOrEqual(6);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('done');

  // The "?" button starts it again; Esc leaves it
  await page.getByRole('button', { name: /Ver el tour/ }).click();
  await expect(step).toHaveText('1. ¿De dónde a dónde vas?');
  await page.keyboard.press('Escape');
  await expect(step).toHaveCount(0);

  // The tour never makes the page wider than the screen
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
