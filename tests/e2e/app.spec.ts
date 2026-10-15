import { expect, test, Page } from '@playwright/test';

// Waits until the route panel shows a calculated route
async function openApp(page: Page) {
  await page.goto('./');
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });
}

test('calcula una ruta real por calles (no una línea recta)', async ({ page }) => {
  await openApp(page);
  const summary = await page.getByText(/Tiempo base: motor de rutas/).first().textContent();
  expect(summary).toMatch(/OSRM/);
  await expect(page.getByText('Trazado aproximado')).toHaveCount(0);

  // The selected route on the map is a polyline with many vertices, not 2 points
  const vertices = await page.locator('.leaflet-overlay-pane path').evaluateAll((paths) =>
    Math.max(...paths.map((p) => ((p.getAttribute('d') || '').match(/[LM]/g) || []).length))
  );
  expect(vertices).toBeGreaterThan(10);
});

test('la página cabe en el ancho del móvil', async ({ page }) => {
  await openApp(page);
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

test('muestra las incidencias y los radares oficiales de la DGT', async ({ page }) => {
  await openApp(page);
  const alerts = await page.evaluate(async () => (await (await fetch('data/alerts.json')).json()).alerts.length);
  const radars = await page.evaluate(async () => (await (await fetch('data/radars.json')).json()).radars.length);

  await expect(page.getByRole('button', { name: new RegExp(`Alertas.*${alerts}`) }).first()).toBeVisible();
  // Every camera of the inventory is drawn on the map
  await expect(page.locator('.dgt-radar-icon')).toHaveCount(radars);
});

test('muestra la velocidad medida por los detectores de la DGT', async ({ page }) => {
  await openApp(page);
  const traffic = await page.evaluate(async () => (await (await fetch('data/traffic.json')).json()));
  expect(Array.isArray(traffic.stations)).toBe(true);
  // One label per measuring point, showing its speed (or "–" without vehicles)
  await expect(page.locator('.dgt-live-station')).toHaveCount(traffic.stations.length);
});

test('el vuelo 3D arranca (o avisa si el dispositivo no tiene WebGL)', async ({ page }) => {
  await openApp(page);
  const hasWebGL = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  });
  // "2. Vuelo 3D" in the route panel opens the tour directly on the 3D flight
  await page.getByRole('button', { name: /^2\. Vuelo 3D$/ }).first().click();

  if (!hasWebGL) {
    // e.g. Firefox on CI machines without a GPU: the app must explain it, not break
    await expect(page.getByText(/no tiene WebGL activado/)).toBeVisible();
    return;
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText(/Velocidad sim/i)).toBeVisible();
  // The car moves along the route
  const progress = page.getByLabel('Posición en la ruta');
  await expect.poll(async () => Number(await progress.inputValue()), { timeout: 30_000 }).toBeGreaterThan(0);
});

test('el navegador GPS da instrucciones reales', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /^Navegador GPS$/ }).first().click();
  await expect(page.getByText(/^(Sal desde|Gira|Continúa|En la rotonda|Toma|Incorpórate)/).first()).toBeVisible();
  // Distance to the next maneuver
  await expect(page.getByText(/^(En [\d.,]+ k?m|Ahora)$/).first()).toBeVisible();

  // North up by default; heading up rotates the map, and the choice is remembered
  const map = page.locator('[data-orientation]');
  await expect(map).toHaveAttribute('data-orientation', 'north-up');
  await page.getByRole('button', { name: /norte arriba: pulsa/i }).click();
  await expect(map).toHaveAttribute('data-orientation', 'heading-up');
  // The rotated map still covers the whole screen
  const box = await map.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeGreaterThan(viewport.width);
  await page.getByRole('button', { name: /rumbo arriba: pulsa/i }).click();
  await expect(map).toHaveAttribute('data-orientation', 'north-up');
  expect(await page.evaluate(() => localStorage.getItem('alicante_gps_orientation'))).toBe('north-up');
});

// Route along the A-70 ring road, where the DGT has detectors and speed cameras
const A70_ROUTE = './?oLat=38.396&oLng=-0.525&oName=Sant%20Vicent&dLat=38.31&dLng=-0.60&dName=A-70%20aeropuerto';

test('modo coche: en horizontal muestra el panel del conductor', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(A70_ROUTE);
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: /Android Auto/i }).first().click();
  await page.getByRole('button', { name: /Abrir en modo coche/ }).click();

  const panel = page.getByRole('complementary', { name: 'Panel del conductor' });
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel('Finalizar navegación')).toBeVisible();
  await expect(panel.getByText(/llegada/)).toBeVisible();
  // Map and panel side by side, nothing wider than the screen
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

test('histórico real de velocidad en una ruta con detectores DGT', async ({ page }) => {
  await page.goto(A70_ROUTE);
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });
  const stations = await page.evaluate(async () => (await (await fetch('data/traffic.json')).json()).stations.length);
  test.skip(stations === 0, 'La DGT no publicó medidas en esta ejecución');
  await expect(page.getByTestId('real-history')).toBeVisible();
  await expect(page.getByText('Velocidad real: habitual vs ahora')).toBeVisible();
});
