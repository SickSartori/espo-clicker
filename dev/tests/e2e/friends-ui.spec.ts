import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { bootGame } from './helpers';

/**
 * Tab Amici — le quattro segnalazioni QA chiuse in 3.1.
 *
 * Le Edge Functions sono simulate: `bootGame` lascia le chiamate a
 * `**​/functions/v1/**` SOSPESE per non toccare il backend dev condiviso, e qui
 * si registrano route più specifiche (in Playwright vince l'ultima registrata).
 * Così ogni test decide cosa risponde il server e verifica solo la UI.
 *
 * Il token di sessione va messo a mano: l'auto-login di bootGame parte ma il
 * suo login-register non risolve mai, quindi senza questo il polling non
 * chiamerebbe niente.
 */

const AMICI_TAB = '#user-hub-modal .hub-tab[data-hubtab="amici"]';

/** Risponde a un singolo slug Edge Function con il payload dato. */
async function stub(page: Page, slug: string, body: unknown): Promise<void> {
  await page.route(`**/functions/v1/${slug}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
}

async function setToken(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).EspooClicker.setSaveToken('e2e-token', Date.now() + 86_400_000);
  });
}

/** Apre Profilo → tab Amici (il percorso vero, non una chiamata diretta). */
async function openAmici(page: Page): Promise<void> {
  await page.locator('#open-user-hub-btn').click();
  await page.locator(AMICI_TAB).click();
}

const AMICO = (id: string, username: string) => ({
  id, username, equippedSkin: 'default', lastSeenSecondsAgo: 10, unseen: 0,
});

test.describe('Tab Amici', () => {
  test('i suggerimenti mostrano solo sconosciuti, non chi ha già una richiesta in ballo', async ({ page }) => {
    await bootGame(page);
    await setToken(page);
    await stub(page, 'friends-poll', { status: 'success', unseenMessages: 0, pendingRequests: 0 });
    await stub(page, 'friends-list', { status: 'success', friends: [], incoming: [], outgoing: [] });
    // Query vuota → il backend risponde in modalità suggerimenti. Scarta già gli
    // amici accettati ma NON le richieste: quelle le toglie il client.
    await stub(page, 'friends-search', {
      status: 'success',
      mode: 'suggestions',
      results: [
        { user: AMICO('u1', 'Sconosciuta'), relation: 'none' },
        { user: AMICO('u2', 'GiaInvitato'), relation: 'pending_out' },
        { user: AMICO('u3', 'MiHaScritto'), relation: 'pending_in' },
        { user: AMICO('u4', 'GiaAmico'), relation: 'accepted' },
      ],
    });

    await openAmici(page);
    await page.locator('#friend-search-input').click();   // focus a campo vuoto → suggerimenti

    const box = page.locator('#friend-search-result');
    await expect(box.locator('.friend-row')).toHaveCount(1);
    await expect(box).toContainText('Sconosciuta');
    // Era il difetto: un suggerimento che non si può seguire.
    await expect(box).not.toContainText('GiaInvitato');
    await expect(box).not.toContainText('MiHaScritto');
    await expect(box).not.toContainText('GiaAmico');
  });

  test('la ricerca per nome continua a mostrare lo stato della relazione', async ({ page }) => {
    await bootGame(page);
    await setToken(page);
    await stub(page, 'friends-poll', { status: 'success', unseenMessages: 0, pendingRequests: 0 });
    await stub(page, 'friends-list', { status: 'success', friends: [], incoming: [], outgoing: [] });
    await stub(page, 'friends-search', {
      status: 'success',
      mode: 'search',
      results: [{ user: AMICO('u2', 'GiaInvitato'), relation: 'pending_out' }],
    });

    await openAmici(page);
    await page.locator('#friend-search-input').fill('Gia');

    // Cercare una persona apposta deve dire a che punto sei con lei: il filtro
    // vale SOLO per i suggerimenti.
    const box = page.locator('#friend-search-result');
    await expect(box).toContainText('GiaInvitato');
    await expect(box.locator('.friend-pending-tag')).toBeVisible();
  });

  test('il profilo amico mostra le ore vere, non 0.0h', async ({ page }) => {
    await bootGame(page);
    await setToken(page);
    await stub(page, 'friends-poll', { status: 'success', unseenMessages: 0, pendingRequests: 0 });
    await stub(page, 'friends-list', { status: 'success', friends: [AMICO('u1', 'Amica')], incoming: [], outgoing: [] });
    // 36000 SECONDI = 10 ore: è l'unità con cui il gioco accumula totalPlayTime
    // e con cui saveGame lo spedisce. Diviso per 3600000 dava "0.0h".
    await stub(page, 'friend-profile', {
      status: 'success',
      profile: {
        id: 'u1', username: 'Amica', score: '1000', prestige: 2, equippedSkin: 'default',
        totalFormattazioni: 0, lastSeenSecondsAgo: 5, totalClicks: 500,
        totalPlayTime: 36_000, longestCombo: 12, skinsCount: 1, skinsUnlocked: ['default'],
      },
    });

    await openAmici(page);
    await page.locator('#friends-list .friend-row').click();

    await expect(page.locator('#friend-profile-panel .fp-stats')).toContainText('10.0h');
  });

  test('si apre il profilo cliccando la riga, non solo la freccia', async ({ page }) => {
    await bootGame(page);
    await setToken(page);
    await stub(page, 'friends-poll', { status: 'success', unseenMessages: 0, pendingRequests: 0 });
    await stub(page, 'friends-list', { status: 'success', friends: [AMICO('u1', 'Amica')], incoming: [], outgoing: [] });
    await stub(page, 'friend-profile', {
      status: 'success',
      profile: {
        id: 'u1', username: 'Amica', score: '1000', prestige: 0, equippedSkin: 'default',
        totalFormattazioni: 0, lastSeenSecondsAgo: 5, totalClicks: 1,
        totalPlayTime: 60, longestCombo: 1, skinsCount: 1, skinsUnlocked: ['default'],
      },
    });

    await openAmici(page);

    const row = page.locator('#friends-list .friend-row');
    await expect(row).toHaveClass(/is-openable/);
    // Click sul NOME: prima era inerte, l'unico bersaglio era la freccia da 30px.
    await row.locator('.friend-name').click();
    await expect(page.locator('#friend-profile-panel .fp-name')).toHaveText('Amica');

    // Un solo elemento interattivo per riga: la freccia è decorativa, altrimenti
    // il focus da tastiera si fermerebbe due volte sulla stessa azione.
    await expect(row).toHaveAttribute('role', 'button');
    await expect(row.locator('.friend-open-btn')).toHaveAttribute('aria-hidden', 'true');
  });

  test('la riga amico risponde a Invio come un pulsante', async ({ page }) => {
    await bootGame(page);
    await setToken(page);
    await stub(page, 'friends-poll', { status: 'success', unseenMessages: 0, pendingRequests: 0 });
    await stub(page, 'friends-list', { status: 'success', friends: [AMICO('u1', 'Amica')], incoming: [], outgoing: [] });
    await stub(page, 'friend-profile', {
      status: 'success',
      profile: {
        id: 'u1', username: 'Amica', score: '1', prestige: 0, equippedSkin: 'default',
        totalFormattazioni: 0, lastSeenSecondsAgo: 5, totalClicks: 1,
        totalPlayTime: 60, longestCombo: 1, skinsCount: 1, skinsUnlocked: ['default'],
      },
    });

    await openAmici(page);
    await page.locator('#friends-list .friend-row').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#friend-profile-panel .fp-name')).toHaveText('Amica');
  });

  test('la pallina delle notifiche compare appena arriva il token, non al giro dopo', async ({ page }) => {
    await bootGame(page);
    await stub(page, 'friends-poll', { status: 'success', unseenMessages: 1, pendingRequests: 2 });

    const badge = page.locator('#user-hub-badge');
    // Senza token non parte nessuna chiamata: il badge resta giù. È lo stato in
    // cui il gioco si trova nei primi istanti, col login ancora in volo.
    await expect(badge).toBeHidden();

    await setToken(page);

    // Il difetto: il primo controllo (3s) trovava il token mancante e il
    // successivo era a 45s, quindi la pallina arrivava quasi un minuto dopo
    // l'accesso — e nel frattempo l'unico modo di vederla era aprire la tab
    // Amici, che ricarica a mano. Da qui «le notifiche compaiono solo dopo aver
    // cliccato su Profilo». Ora, senza token, si ritenta ogni 2s (nessuna
    // richiesta di rete sprecata) e il badge segue il login da vicino.
    await expect(badge).toBeVisible({ timeout: 12_000 });
    await expect(badge).toHaveText('3');
  });
});
