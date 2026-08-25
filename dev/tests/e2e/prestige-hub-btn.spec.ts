import { test, expect } from '@playwright/test';
import { bootGame, seedRichState } from './helpers';

/**
 * Bottoni dell'Hub Prestigio — icona e label sulla STESSA riga.
 *
 * La segnalazione: sul bottone «MADE IN HEAVEN» il meteorite finiva a capo
 * sopra il testo, incollato al bordo superiore. Causa: `.hub-btn-ready` va in
 * `flex-direction: column` per appendere il sottotitolo sotto al titolo, e in
 * colonna anche l'`<i>` diventa un flex item per conto suo. Stesso difetto sul
 * bottone oro (Firma Contratto), dove però ci stava e non dava nell'occhio.
 *
 * Sotto c'era una seconda mina: `.buy-btn` impone `height: 40px` +
 * `overflow: hidden`, quindi qualunque contenuto più alto veniva tagliato
 * senza un segnale — è per questo che il test guarda anche scrollHeight.
 *
 * Il test misura la GEOMETRIA renderizzata, non le classi CSS: è l'unica cosa
 * che una regola aggiunta altrove non può far passare per sbaglio.
 */

/**
 * Rettangoli di icona, label e sottotitolo, relativi al bottone.
 *
 * Cerca a partire da `.hub-btn-ready`, non da `.hub-btn-main`: così le misure
 * si prendono anche sul markup vecchio (icona e testo fratelli, senza wrapper)
 * e il test boccia la regressione con un fallimento sulla geometria invece che
 * con un null. Vale sia se qualcuno toglie il wrapper, sia se lo lascia e
 * rompe il CSS.
 */
async function misuraBottone(page: any, id: string) {
  return page.evaluate((btnId: string) => {
    const b = document.getElementById(btnId) as HTMLElement;
    const r = b.getBoundingClientRect();
    const ready = b.querySelector('.hub-btn-ready') as HTMLElement;
    const icona = ready.querySelector('i') as HTMLElement;
    const sub = ready.querySelector('.hub-btn-sub') as HTMLElement | null;

    // La label è un nodo di testo nudo: senza Range non ha un rettangolo.
    // Si scarta quello del sottotitolo, che è l'altra riga.
    const walker = document.createTreeWalker(ready, NodeFilter.SHOW_TEXT);
    let testo: Node | null = null;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent || !n.textContent.trim()) continue;
      if (sub && sub.contains(n)) continue;
      testo = n;
      break;
    }
    if (!testo) throw new Error('label non trovata in .hub-btn-ready');
    const range = document.createRange();
    range.selectNodeContents(testo);

    const rel = (x: DOMRect) => ({ top: x.top - r.top, bottom: x.bottom - r.top, height: x.height });

    return {
      altezzaCssBox: b.offsetHeight,   // NON il rect: il modale ha una scale d'apertura
      tagliato: b.scrollHeight - b.clientHeight,
      icona: rel(icona.getBoundingClientRect()),
      label: rel(range.getBoundingClientRect()),
      sub: sub && getComputedStyle(sub).display !== 'none' ? rel(sub.getBoundingClientRect()) : null,
    };
  }, id);
}

/** Porta entrambe le card in `is-ready` passando dal vero render, non dalle classi. */
async function apriHubPronto(page: any) {
  await page.evaluate(() => {
    const w = window as any;
    const gs = w.EspooClicker.getGameState();
    gs.totalResets = 20;                       // canFormat = resets >= 20
    gs.totalScore = new w.Decimal('1e30');     // ben oltre la soglia a 20 reset
    gs.lifetimePrestigePoints = new w.Decimal('1000000');
    (document.getElementById('prestige-hub-modal') as HTMLElement).style.display = 'flex';
    w.renderPrestigeHubCards();
  });
  await expect(page.locator('#hub-card-format.is-ready')).toHaveCount(1);
  await expect(page.locator('.hub-card-promo.is-ready')).toHaveCount(1);
}

for (const [nome, id] of [
  ['MADE IN HEAVEN (formattazione)', 'btn-confirm-format'],
  ['Firma Contratto (promozione)', 'btn-confirm-prestige'],
] as const) {
  test.describe(`Hub Prestigio — ${nome}`, () => {
    test('icona e label sulla stessa riga, niente contenuto tagliato', async ({ page }) => {
      await bootGame(page);
      await seedRichState(page);
      await apriHubPronto(page);

      const m = await misuraBottone(page, id);

      // Sovrapposizione verticale: se l'icona fosse andata a capo, il suo
      // rettangolo starebbe tutto sopra quello del testo e i due non si
      // toccherebbero. Prima del fix: icona 2.7→16.3, label 18.3→36.3.
      expect(m.icona.bottom).toBeGreaterThan(m.label.top);
      expect(m.icona.top).toBeLessThan(m.label.bottom);

      // `overflow: hidden` non deve star nascondendo niente.
      expect(m.tagliato).toBeLessThanOrEqual(0);

      // Il contenuto sta dentro il bottone, senza toccare i bordi.
      expect(m.icona.top).toBeGreaterThan(3);
      expect(m.altezzaCssBox).toBeGreaterThanOrEqual(52); // touch target
    });
  });
}

test.describe('Hub Prestigio — sottotitolo', () => {
  test('«Formatta l\'universo · NG+» sta sotto al titolo, non di fianco', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);
    await apriHubPronto(page);

    const m = await misuraBottone(page, 'btn-confirm-format');

    expect(m.sub).not.toBeNull();
    // La colonna serve a questo: il sottotitolo è la riga DOPO, non un terzo
    // elemento in fila. 1px di tolleranza per gli arrotondamenti sub-pixel.
    expect(m.sub!.top).toBeGreaterThanOrEqual(m.label.bottom - 1);
    expect(m.sub!.bottom).toBeLessThanOrEqual(m.altezzaCssBox);
  });
});

test.describe('Hub Prestigio — mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('a 375px il bottone regge le due righe senza tagliarle', async ({ page }) => {
    await bootGame(page);
    await seedRichState(page);
    await apriHubPronto(page);

    const m = await misuraBottone(page, 'btn-confirm-format');

    expect(m.icona.bottom).toBeGreaterThan(m.label.top);
    expect(m.icona.top).toBeLessThan(m.label.bottom);
    expect(m.tagliato).toBeLessThanOrEqual(0);
    expect(m.altezzaCssBox).toBeGreaterThanOrEqual(52);
  });
});
