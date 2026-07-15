import { Page, expect } from '@playwright/test';

/**
 * Helper di boot per i test E2E.
 *
 * Il gioco mostra il login se manca sessionStorage.espooUser; con la sessione
 * iniettata PRIMA del load, initializeGame() boota direttamente nel gioco
 * (script.js: hasSession → startGameRoutines). Nessun backend reale è coinvolto:
 * le chiamate cloud falliscono in silenzio (best-effort) e il save resta locale.
 */
export async function bootGame(page: Page): Promise<void> {
  // Silenzia il rumore di rete atteso (Supabase EF non raggiungibili in E2E).
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('espooUser', 'E2ETester');
      sessionStorage.setItem('espooPass', 'e2e');
    } catch (_) {
      /* no-op */
    }
  });

  await page.goto('/index.php', { waitUntil: 'domcontentloaded' });

  // Attende che il bundle legacy abbia costruito il god-object e lo stato,
  // e che V3 sia pronto (contratto Fase 0: EspoV3 presente prima del boot).
  await page.waitForFunction(
    () =>
      !!(window as any).EspooClicker &&
      typeof (window as any).EspooClicker.getGameState === 'function' &&
      !!(window as any).EspooClicker.getGameState() &&
      !!(window as any).EspoV3 &&
      !!(window as any).EspoV3.economy,
    undefined,
    { timeout: 15_000 },
  );
}

/**
 * Popola gameState con uno stato "ricco" per esercitare i rami non banali delle
 * formule (team posseduti, prestigio, score sopra soglia). Deterministico.
 * Poi risincronizza i global derivati (bps, prestigeBonus).
 */
export async function seedRichState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    const D = w.Decimal;
    const gs = w.EspooClicker.getGameState();

    gs.score = new D('1e9');
    gs.totalScore = new D('2.5e8'); // sopra la soglia base (50M) → prestige gain > 0
    gs.lifetimeScore = new D('5e9');
    gs.prestigePoints = new D('5000');
    gs.lifetimePrestigePoints = new D('150');
    gs.totalResets = 2;
    gs.baseClickValue = new D('12');
    if (gs.qBits !== undefined) gs.qBits = new D('3');

    // Qualche team posseduto (guardato: solo se la chiave esiste nel save).
    const setTeam = (k: string, n: number) => {
      if (gs.teams && gs.teams[k]) gs.teams[k].count = n;
    };
    setTeam('assistenteQa', 50);
    setTeam('jiraTicket', 30);
    setTeam('teamQa', 10);

    // Risincronizza i global derivati con lo stato appena impostato.
    if (typeof w.calculatePrestigeBonus === 'function') w.calculatePrestigeBonus();
    if (typeof w.recalculateCPS === 'function') w.recalculateCPS();
  });
}

/** Asserisce che non ci siano errori console rossi dopo un'azione. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // Rumore atteso: fetch verso Supabase EF non raggiungibili in E2E.
      if (/supabase|Failed to fetch|net::ERR|friends-|ERR_CONNECTION/i.test(t)) return;
      errors.push(t);
    }
  });
  return errors;
}
