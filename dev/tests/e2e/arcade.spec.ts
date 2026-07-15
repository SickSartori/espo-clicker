import { test, expect } from '@playwright/test';
import { trackConsoleErrors } from './helpers';

/**
 * kill-legacy — arcade.php (pagina standalone).
 *
 * arcade.php NON carica dist/game.modules.js (è aperta via window.open, non
 * da index.php): il modulo ESM src/lib/arcade-loader.ts non le serve a niente,
 * le serve invece dist/arcade-loader.min.js — una build IIFE dello STESSO
 * sorgente, prodotta da scripts/vite-plugin-legacy.ts (closeBundle) apposta per
 * questa pagina. Se quel file manca (404) o non viene servito, window.ArcadeLoader
 * non esiste e js/arcade-page.js:560 (`if (window.ArcadeLoader && ...)`) non fa
 * scattare l'init: l'intera pagina Arcade (5 giochi) resta inerte, senza crash.
 *
 * Guardia: verifica che ArcadeLoader esista DAVVERO sul documento di arcade.php
 * (non basta che esista su index.php — main.ts lo installa solo lì) e che il
 * caricamento della pagina non produca 404 né errori console.
 */
test.describe('kill-legacy — arcade.php standalone', () => {
  test('ArcadeLoader è disponibile e la pagina non ha 404 né errori console', async ({ page }) => {
    const notFound: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 404) notFound.push(`${res.status()} ${res.url()}`);
    });
    const errors = trackConsoleErrors(page);

    // Gate login di arcade.php: senza sessionStorage.espooUser la pagina si
    // sostituisce con lo schermo di blocco (nessuno script di gioco gira).
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('espooUser', 'E2ETester');
        sessionStorage.setItem('espooPass', 'e2e');
      } catch (_) {
        /* no-op */
      }
    });

    await page.goto('/arcade.php', { waitUntil: 'load' });

    // js/arcade-loader.js/arcade-page.js sono <script> classic (non defer/async):
    // eseguono in ordine di documento durante il parsing, quindi a 'load' sono già andati.
    const arcadeLoaderType = await page.evaluate(() => typeof (window as any).ArcadeLoader?.load);
    expect(arcadeLoaderType, 'window.ArcadeLoader.load deve essere una funzione').toBe('function');

    expect(notFound, `richieste 404: ${notFound.join(' | ')}`).toEqual([]);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
