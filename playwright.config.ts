import { defineConfig, devices } from '@playwright/test';

// End-to-end checks on the production build, as a phone (Chromium) and in Firefox.
// They use the real public services (OSRM, map tiles, OpenStreetMap), so CI retries
// a failed test before reporting it.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'movil-chromium',
      use: {
        ...devices['Pixel 7'],
        // WebGL without a GPU (CI machines) needs SwiftShader
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
    {
      // Firefox is where the "straight line" routing bug showed up
      name: 'firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 390, height: 844 },
        // CI machines have no GPU: allow Firefox's software WebGL (llvmpipe)
        launchOptions: { firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false } },
      },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
