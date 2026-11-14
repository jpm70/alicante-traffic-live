import { expect, test, Page } from '@playwright/test';

// The first-visit welcome covers the page: these checks start as a returning visitor
// (the onboarding itself is covered in onboarding.spec.ts)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('alicante_onboarding_v1', 'done'));
});

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

test('busca el destino escribiendo la calle (en castellano o en valenciano)', async ({ page }) => {
  await openApp(page);
  // Longest line on the map: the route
  const routeLine = () =>
    page.locator('.leaflet-overlay-pane path').evaluateAll((paths) =>
      paths.map((p) => p.getAttribute('d') || '').sort((a, b) => b.length - a.length)[0]
    );
  const before = await routeLine();
  const destination = page.getByRole('combobox', { name: 'Punto de Llegada (Destino)' });
  await destination.click();
  await destination.fill('alfons el savi');
  const option = page.getByRole('option', { name: /Avenida Alfonso El Sabio.*Alicante/ }).first();
  await expect(option).toBeVisible({ timeout: 20_000 });

  // On a phone the search is full screen, so the map cannot cover the list
  const listbox = page.getByRole('listbox');
  const box = await listbox.boundingBox();
  const viewport = page.viewportSize()!;
  if (viewport.width < 1024) expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);

  await option.click();
  await expect(listbox).toHaveCount(0);
  await expect(destination).toHaveValue('Avenida Alfonso El Sabio, Alicante');
  // The route is calculated again to the new destination
  await expect.poll(routeLine, { timeout: 45_000 }).not.toBe(before);
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });
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

test('un nombre de lugar con HTML en el enlace compartido no ejecuta código', async ({ page }) => {
  const payload = '<img src=x onerror="window.__xss=1">';
  await page.goto(`./?oLat=38.3453&oLng=-0.4891&dLat=38.375&dLng=-0.422&dName=Playa&oName=${encodeURIComponent(payload)}`);
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });

  // Open the tooltip of every marker (origin and destination included)
  const tooltips = await page.evaluate(async () => {
    const seen: string[] = [];
    for (const marker of Array.from(document.querySelectorAll('.leaflet-marker-icon'))) {
      marker.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      document.querySelectorAll('.leaflet-tooltip').forEach((t) => seen.push(t.innerHTML));
      marker.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    }
    return seen;
  });
  const origin = tooltips.find((html) => html.includes('Origen'));
  expect(origin).toBeTruthy();
  // The name is shown as text, not turned into an element
  expect(origin).toContain('&lt;img');
  expect(origin).not.toContain('<img');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('avisa cuando los datos de la DGT son antiguos y no usa esas velocidades', async ({ page }) => {
  // The published files as they are, but dated six hours ago
  const old = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  for (const file of ['alerts', 'traffic']) {
    await page.route(new RegExp(`data/${file}\\.json`), async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      await route.fulfill({ response, json: { ...data, success: true, updatedAt: old } });
    });
  }
  await page.goto(A70_ROUTE);
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });

  await expect(page.getByTestId('stale-data-badge')).toHaveText(/DGT hace 6 h/);
  const stations = await page.evaluate(async () => (await (await fetch('data/traffic.json')).json()).stations.length);
  if (stations > 0) {
    // Every measuring point stays on the map, without a speed
    await expect(page.locator('.dgt-live-station')).toHaveCount(stations);
    expect(await page.locator('.dgt-live-station').allTextContents()).toEqual(new Array(stations).fill('–'));
    await expect(page.getByTestId('stale-speeds-note').first()).toContainText('no se aplican al tiempo del trayecto');
    await expect(page.getByText(/Velocidad real medida por la DGT/)).toHaveCount(0);
  }
  await page.getByRole('button', { name: /Alertas e Incidencias/ }).first().click();
  await expect(page.getByTestId('stale-alerts-note')).toContainText('Datos de hace 6 h');
});

test('el estado del tráfico se escribe bien y con su color, y los plurales concuerdan', async ({ page }) => {
  await page.goto(A70_ROUTE);
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });

  const status = page.getByTestId('route-status').first();
  const value = await status.getAttribute('data-status');
  const expected: Record<string, { label: string; color: string }> = {
    fluido: { label: 'Fluido', color: 'emerald' },
    moderado: { label: 'Moderado', color: 'amber' },
    concurrido: { label: 'Concurrido', color: 'orange' },
    critico: { label: 'Crítico', color: 'rose' },
  };
  await expect(status).toHaveText(expected[value!].label);
  await expect(status).toHaveClass(new RegExp(`text-${expected[value!].color}-400`));

  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\b1 cámaras\b/i);
  expect(text).not.toMatch(/\b1 activas\b/i);
  expect(text).not.toMatch(/Critico|Retencion\b/);
});

test('sin conexión conserva las últimas incidencias de la DGT y el estilo del mapa', async ({ page, context, browserName }) => {
  await openApp(page);
  const alerts = await page.evaluate(async () => (await (await fetch('data/alerts.json')).json()).alerts.length);
  test.skip(alerts === 0, 'La DGT no publicó incidencias en esta ejecución');
  // The service worker must control the page and have stored the data files
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByText(/Tiempo base: motor de rutas/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: new RegExp(`Alertas.*${alerts}`) }).first()).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  // The incidents come from the copy kept by the service worker, asked for with a new "?t="
  await expect(page.getByRole('button', { name: new RegExp(`Alertas.*${alerts}`) }).first()).toBeVisible({ timeout: 45_000 });
  expect(await page.evaluate(async () => (await (await fetch(`data/alerts.json?t=${Date.now()}`)).json()).alerts.length)).toBe(alerts);
  // No routing server: the app says so instead of failing. (Playwright's offline mode
  // does not cut requests to other sites in Firefox, so this part is checked in Chromium.)
  if (browserName === 'chromium') await expect(page.getByText('Trazado aproximado').first()).toBeVisible({ timeout: 45_000 });
  // Leaflet's stylesheet ships with the app: the map keeps its layout
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.leaflet-container')!).position)).toBe('relative');
  await context.setOffline(false);
});

test('los fotogramas de las cámaras no se recargan con la pestaña oculta', async ({ page }) => {
  await openApp(page);
  const countdown = () => page.evaluate(() => (document.querySelector('header')?.textContent || '').match(/(\d+)s/)?.[1]);
  const setHidden = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);

  await setHidden(true);
  const frozen = await countdown();
  await page.waitForTimeout(3200);
  expect(await countdown()).toBe(frozen);

  // Back on screen: refreshed at once and counting again
  await setHidden(false);
  await expect.poll(countdown).toMatch(/^1[45]$/);
  await expect.poll(countdown, { timeout: 8000 }).toMatch(/^1[0-2]$/);
});

test('accesibilidad: controles táctiles de 44 px, texto legible y diálogos con rol, foco y Escape', async ({ page }) => {
  await openApp(page);

  // Smallest text on screen
  const tiny = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el.children.length || !el.textContent?.trim()) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < 11) out.push(el.textContent.trim().slice(0, 20));
    }
    return out;
  });
  expect(tiny).toEqual([]);

  // On a touch screen (the phone project) every button is at least 44 x 44 px
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, select, .leaflet-control-zoom a'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5))
        .map(({ el, r }) => `${(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().slice(0, 25)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small).toEqual([]);
    // The header tools stay in one row on a phone
    const header = await page.locator('header').boundingBox();
    expect(header!.height).toBeLessThan(200);
  }

  // The GPS is a modal dialog: named, takes the focus, closes with Escape and gives the focus back
  const open = page.getByRole('button', { name: /^Navegador GPS$/ }).first();
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Navegador GPS' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  // Tab never leaves the dialog
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
});

