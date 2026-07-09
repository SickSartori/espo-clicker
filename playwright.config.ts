import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E — rete di sicurezza della migrazione strangler V3.
 *
 * Gira il gioco REALE (index.php servito da PHP) in un Chromium headless e:
 *  - parity.spec: confronta ogni funzione delegata con V3 acceso vs spento
 *    (window.EspoV3 = null) → deve dare lo STESSO output del legacy;
 *  - smoke.spec: verifica comportamenti chiave (acquisto team, promozione,
 *    golden bug) che sopravvivranno alla F7 quando il legacy verrà rimosso.
 *
 * Richiede i bundle buildati (dist/ + dist-v3/): `npm run build` prima, o il
 * job CI lo fa a monte. Il webServer avvia PHP via scripts/e2e-server.js.
 */
const PORT = process.env.E2E_PORT || '8899';
const HOST = process.env.E2E_HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // un solo gioco per volta: gli spec mutano gameState condiviso per pagina
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    // Il gioco chiama Edge Functions Supabase al boot: in E2E falliranno
    // (best-effort, non bloccano). Nessun mock necessario.
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node scripts/e2e-server.js',
    url: BASE_URL + '/index.php',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
