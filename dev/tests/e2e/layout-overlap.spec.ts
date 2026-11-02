import { test, expect, Page } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Nessuna sovrapposizione fra i controlli, a più dimensioni di finestra.
 *
 * Il caso che l'ha fatto nascere: con Espo Fury acquistato, su finestre basse il
 * bottone rosso finiva sotto il badge «Novità» e il link GitHub, che sono FISSI sul
 * viewport (bottom: 58px e 22px) mentre il bottone sta in flusso in fondo alla
 * colonna — su ≤ 720px d'altezza i due si incontravano. Sui telefoni stretti il
 * bottone (210px minimi) toccava il pulsante mute, e col tema 8-bit il contenitore
 * (`calc(100vh - 70px)` pensato per il desktop) scendeva sotto la barra di navigazione.
 *
 * Il test fa girare gli stessi controlli di un giocatore con Fury sbloccato: legge i
 * rettangoli di tutti i controlli visibili e boccia ogni coppia che si sovrappone di
 * più di 3px per lato (escluso chi contiene l'altro). Verificato al contrario
 * togliendo il padding-bottom di #clicker-section: il caso 800×600 fallisce.
 */

const CONTROLLI = [
  'button', 'a[href]', '[role="button"]', '#version-display', '#github-link-container',
  '#quick-mute-btn', '#skill-crunchTime', '#clicker-btn', '#cps-display',
  '#event-multiplier-display', '#prestige-bonus-display', '#golden-bug',
  '.nav-item', '.tab-btn', '.mobile-nav-btn',
].join(', ');

async function preparaFury(page: Page, skin: string | null): Promise<void> {
  await page.evaluate((id) => {
    const w = window as any;
    const gs = w.EspooClicker.getGameState();
    gs.feedbackIntroAt = Date.now();
    gs.prestigeUpgrades.crunchTime = Object.assign({}, gs.prestigeUpgrades.crunchTime, { purchased: true, count: 1 });
    document.querySelectorAll('.modal-backdrop').forEach((m) => { (m as HTMLElement).style.display = 'none'; });
    document.body.classList.remove('modal-open');
    if (id) {
      if (!gs.skins.unlocked.includes(id)) gs.skins.unlocked.push(id);
      w.equipSkin(id);
    }
    w.updateUI();
    const t = document.getElementById('toast-container');
    if (t) t.style.display = 'none';
  }, skin);
  await page.waitForTimeout(1200);
}

async function sovrapposizioni(page: Page): Promise<string[]> {
  return page.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll(sel)).filter((e) => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || r.width < 6 || r.height < 6) return false;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
      if (e.closest('#cheatboard-container, #cheatboard-handle')) return false; // strumento di sviluppo
      return true;
    });
    const nome = (e: Element) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '');
    const out: string[] = [];
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i], b = els[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 3 && iy > 3) out.push(`${nome(a)} ∩ ${nome(b)} (${Math.round(ix)}×${Math.round(iy)}px)`);
      }
    }
    return out;
  }, CONTROLLI);
}

const CASI: Array<{ w: number; h: number; skin: string | null; nome: string }> = [
  { w: 800, h: 600, skin: null, nome: 'desktop basso 800×600' },
  { w: 900, h: 700, skin: null, nome: 'desktop 900×700' },
  { w: 1280, h: 720, skin: null, nome: 'laptop 1280×720' },
  { w: 1440, h: 900, skin: null, nome: 'desktop 1440×900' },
  { w: 320, h: 568, skin: null, nome: 'telefono stretto 320×568' },
  { w: 360, h: 640, skin: null, nome: 'telefono 360×640' },
  { w: 375, h: 667, skin: 'espobit', nome: '8-bit su telefono 375×667' },
  { w: 360, h: 640, skin: 'espobit', nome: '8-bit su telefono 360×640' },
  { w: 320, h: 568, skin: 'espobit', nome: '8-bit su telefono 320×568' },
];

test.describe('Layout — nessuna sovrapposizione fra i controlli', () => {
  for (const c of CASI) {
    test(c.nome, async ({ page }) => {
      await page.setViewportSize({ width: c.w, height: c.h });
      await bootGame(page);
      await preparaFury(page, c.skin);
      expect(await sovrapposizioni(page)).toEqual([]);
    });
  }
});
