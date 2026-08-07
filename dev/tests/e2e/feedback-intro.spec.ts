import { test, expect } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Popup "come si segnala" — una tantum, subito DOPO le note di rilascio.
 *
 * L'ordine conta: le due finestre non devono mai stare aperte insieme, quindi
 * il popup non parte all'avvio ma si accoda alla chiusura delle note (vedi
 * src/ui/modals). Quando non ci sono note da mostrare parte da solo.
 *
 * Il flag `seenFeedbackIntro` vive nel save e non in localStorage: viaggia col
 * cloud, così non ricompare cambiando dispositivo.
 */

const POPUP = '#feedback-intro-modal';
const NOTE = '#release-notes-modal';

test.describe('Popup segnalazioni', () => {
  test('si apre alla chiusura delle note di rilascio, mai insieme a loro', async ({ page }) => {
    await bootGame(page);

    const r = await page.evaluate(async () => {
      const w = window as any;
      w.shouldShowFeedbackIntro = true;
      w.EspooClicker.getGameState().seenFeedbackIntro = false;

      w.EspooClicker.openReleaseNotes();
      await new Promise((res) => setTimeout(res, 500));
      const noteAperte = getComputedStyle(document.getElementById('release-notes-modal')!).display;
      const popupSotto = getComputedStyle(document.getElementById('feedback-intro-modal')!).display;

      (document.querySelector('#release-notes-modal .modal-close-btn') as HTMLElement).click();
      await new Promise((res) => setTimeout(res, 900));

      return {
        noteAperte,
        popupSotto,
        popupDopo: getComputedStyle(document.getElementById('feedback-intro-modal')!).display,
        seen: w.EspooClicker.getGameState().seenFeedbackIntro,
        flag: w.shouldShowFeedbackIntro,
      };
    });

    expect(r.noteAperte).toBe('flex');
    expect(r.popupSotto, 'il popup non deve stare aperto sotto le note').toBe('none');
    expect(r.popupDopo, 'il popup deve aprirsi quando le note si chiudono').toBe('flex');
    // Segnato come visto all'APERTURA: un reload col popup a schermo non deve
    // ripresentarlo per sempre.
    expect(r.seen, 'deve segnarsi come visto').toBe(true);
    expect(r.flag).toBe(false);
  });

  test('non si ripresenta una seconda volta', async ({ page }) => {
    await bootGame(page);

    const r = await page.evaluate(async () => {
      const w = window as any;
      w.EspooClicker.getGameState().seenFeedbackIntro = false;
      w.shouldShowFeedbackIntro = true;

      w.EspooClicker.openFeedbackIntro();
      await new Promise((res) => setTimeout(res, 400));
      const primaVolta = getComputedStyle(document.getElementById('feedback-intro-modal')!).display;

      // Chiude e prova a riaprire la catena: il flag ora è spento
      (document.querySelector('#feedback-intro-modal .modal-close-btn') as HTMLElement).click();
      await new Promise((res) => setTimeout(res, 500));

      w.EspooClicker.openReleaseNotes();
      await new Promise((res) => setTimeout(res, 400));
      (document.querySelector('#release-notes-modal .modal-close-btn') as HTMLElement).click();
      await new Promise((res) => setTimeout(res, 800));

      return {
        primaVolta,
        secondaVolta: getComputedStyle(document.getElementById('feedback-intro-modal')!).display,
      };
    });

    expect(r.primaVolta).toBe('flex');
    expect(r.secondaVolta, 'il popup è una tantum: non deve tornare').toBe('none');
  });

  test('«Provo subito» porta dritto alla scheda Segnala', async ({ page }) => {
    await bootGame(page);
    await page.evaluate(() => { (window as any).EspooClicker.openFeedbackIntro(); });
    await expect(page.locator(POPUP)).toBeVisible();

    await page.click('#fbintro-open');
    await page.waitForTimeout(700);

    const r = await page.evaluate(() => ({
      popup: getComputedStyle(document.getElementById('feedback-intro-modal')!).display,
      aiuto: getComputedStyle(document.getElementById('help-modal')!).display,
      segnala: getComputedStyle(document.querySelector('[data-hpanel="segnala"]')!).display !== 'none',
      guida: getComputedStyle(document.querySelector('[data-hpanel="guida"]')!).display !== 'none',
    }));

    // Il popup deve CHIUDERSI prima: altrimenti resta davanti al modulo da
    // compilare, con due fondali sovrapposti.
    expect(r.popup).toBe('none');
    expect(r.aiuto).toBe('flex');
    expect(r.segnala, 'deve aprirsi sulla scheda Segnala, non sulla Guida').toBe(true);
    expect(r.guida).toBe(false);
  });

  test('«Ho capito» chiude e basta', async ({ page }) => {
    await bootGame(page);
    await page.evaluate(() => { (window as any).EspooClicker.openFeedbackIntro(); });
    await expect(page.locator(POPUP)).toBeVisible();

    await page.click('#fbintro-ok');
    await page.waitForTimeout(500);

    await expect(page.locator(POPUP)).toBeHidden();
    await expect(page.locator('#help-modal')).toBeHidden();
    await expect(page.locator(NOTE)).toBeHidden();
  });

  test('non disturba il giocatore appena arrivato', async ({ page }) => {
    // Un save nuovo di zecca (zero click) non deve vedersi comparire il popup
    // all'avvio: serve a far scoprire la funzione a chi il gioco ce l'ha già.
    // Chi aggiorna lo vede lo stesso, perché arriva dopo le note di rilascio.
    await bootGame(page);
    await page.waitForTimeout(2500);

    const r = await page.evaluate(() => ({
      popup: getComputedStyle(document.getElementById('feedback-intro-modal')!).display,
      click: (window as any).EspooClicker.getGameState().totalClicks,
    }));

    expect(r.click, 'presupposto del test: save nuovo, nessun click').toBe(0);
    expect(r.popup, 'niente popup a chi non ha ancora cliccato').toBe('none');
  });

  test('cheat «simula primo avvio»: riabbassa la versione senza toccare i progressi', async ({ page }) => {
    await bootGame(page);
    page.on('dialog', (d) => d.accept());

    const prima = await page.evaluate(() => {
      const gs = (window as any).EspooClicker.getGameState();
      gs.seenFeedbackIntro = true;
      gs.totalClicks = 1234;
      return { minor: gs.version.minor, major: gs.version.major };
    });

    // Il cheat ricarica dopo 400ms: si legge PRIMA, o si misura lo stato già
    // ristampato dal caricamento (la versione torna a quella corrente, ed è
    // il comportamento giusto).
    await page.evaluate(() => { (document.getElementById('cb-first-run') as HTMLElement).click(); });
    await page.waitForTimeout(180);

    const dopo = await page.evaluate(() => {
      const gs = (window as any).EspooClicker.getGameState();
      return { minor: gs.version.minor, major: gs.version.major, seen: gs.seenFeedbackIntro, click: gs.totalClicks };
    });

    expect(dopo.minor, 'la minor scende di uno, così le note di rilascio riscattano').toBe(prima.minor - 1);
    expect(dopo.major).toBe(prima.major);
    expect(dopo.seen, 'il popup torna da vedere').toBe(false);
    expect(dopo.click, 'i progressi non si toccano').toBe(1234);
  });
});

test.describe('Popup segnalazioni su mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('a schermo pieno come le altre, ma col contenuto centrato', async ({ page }) => {
    // Su mobile TUTTE le finestre sono a schermo pieno: coerenza voluta.
    // Per un messaggio breve però il contenuto restava incollato sotto
    // l'intestazione con mezzo schermo vuoto. Si centra il CORPO dentro la
    // finestra piena, senza rimpicciolire la finestra.
    // Il `display: flex` nella regola CSS non è decorativo: .settings-content
    // è solo un flex ITEM (flex:1 + overflow), e senza renderlo CONTAINER
    // `justify-content` non ha effetto.
    await bootGame(page);
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach((e) => ((e as HTMLElement).style.display = 'none'));
      (window as any).EspooClicker.openFeedbackIntro();
    });
    await page.waitForTimeout(700);

    const r = await page.evaluate(() => {
      const c = document.querySelector('#feedback-intro-modal .modal-content') as HTMLElement;
      const body = document.querySelector('#feedback-intro-modal .settings-content') as HTMLElement;
      const rc = c.getBoundingClientRect();
      const rb = body.getBoundingClientRect();
      const primo = body.firstElementChild!.getBoundingClientRect();
      const ultimo = body.lastElementChild!.getBoundingClientRect();
      const ok = document.getElementById('fbintro-ok')!.getBoundingClientRect();
      return {
        w: Math.round(rc.width),
        h: Math.round(rc.height),
        sopraContenuto: Math.round(primo.top - rb.top),
        sottoContenuto: Math.round(rb.bottom - ultimo.bottom),
        bottoniDentro: ok.bottom <= window.innerHeight && ok.top >= 0,
      };
    });

    // Schermo pieno, come tutte le altre finestre
    expect(r.w, 'larghezza piena').toBeGreaterThanOrEqual(374);
    expect(r.h, 'altezza piena').toBeGreaterThanOrEqual(810);
    // ...ma il contenuto centrato nello spazio disponibile
    expect(Math.abs(r.sopraContenuto - r.sottoContenuto), 'corpo centrato').toBeLessThanOrEqual(4);
    expect(r.sopraContenuto, "non incollato sotto l'intestazione").toBeGreaterThan(20);
    expect(r.bottoniDentro, 'i pulsanti restano nello schermo').toBe(true);
  });
});
