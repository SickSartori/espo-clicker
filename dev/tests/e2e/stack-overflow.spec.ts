import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * STACK OVERFLOW — meccaniche.
 *
 * Interessano soprattutto le due meccaniche PROPRIE, quelle che rendono il
 * gioco non un clone (vincolo in dev/docs/roadmap.md, 3.1):
 *   - una riga completa con un bug NON si chiude finché il bug non è schiacciato;
 *   - il debito tecnico risale dal fondo e spinge su la pila.
 *
 * I test pilotano lo stato via window.__stackDebug, altrimenti non osservabile.
 * Il pezzo in volo viene messo a null: senza, cadrebbe durante il test e
 * modificherebbe la plancia sotto ai piedi delle asserzioni.
 */

async function bootStack(page: Page): Promise<void> {
  // Il gate della sala giochi legge sessionStorage all'analisi della pagina:
  // va impostata PRIMA del caricamento, non dopo.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) {}
  });
  await page.goto('/arcade.php', { waitUntil: 'domcontentloaded' });
  // load() si avvia ma NON si aspetta: la sua promessa include anche la CDN di
  // Phaser, che serve solo a Super Espò. Aspettarla legherebbe questo test a
  // una rete esterna — sospetta causa di un fallimento isolato su 24 giri.
  // Basta attendere che compaia la funzione del gioco.
  await page.evaluate(() => {
    const w = window as any;
    if (w.ArcadeLoader) w.ArcadeLoader.load();
  });
  await page.waitForFunction(() => typeof (window as any).initStackGame === 'function', undefined, { timeout: 15_000 });
  await page.evaluate(() => {
    const w = window as any;
    w.initStackGame();
    w.startStackRun();
    w.__stackDebug.setPiece(null);   // niente pezzo in caduta durante i test
  });
}

/** Plancia vuota con, in fondo, una riga piena (opzionalmente con un bug). */
function boardScript(bugCol: number | null) {
  return `(() => {
    const w = window;
    const g = w.__stackDebug.fieldOrigin();
    const b = [];
    for (let r = 0; r < g.rows; r++) {
      const row = [];
      for (let c = 0; c < g.cols; c++) {
        const ultima = r === g.rows - 1;
        row.push(ultima ? { color: '#00d9ff', bug: ${bugCol === null ? 'false' : `c === ${bugCol}`} } : null);
      }
      b.push(row);
    }
    w.__stackDebug.setBoard(b);
    return g;
  })()`;
}

test.describe('Stack Overflow', () => {
  test('il gioco si avvia dal menu e disegna il campo', async ({ page }) => {
    await bootStack(page);

    const info = await page.evaluate(() => {
      const c = document.getElementById('stack-canvas') as HTMLCanvasElement;
      const ctx = c.getContext('2d')!;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let disegnati = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (!(d[i] === 5 && d[i + 1] === 10 && d[i + 2] === 16)) disegnati++;
      }
      return { w: c.width, h: c.height, disegnati };
    });

    expect(info.w).toBe(760);
    expect(info.h).toBe(540);
    expect(info.disegnati).toBeGreaterThan(10_000); // cornice, griglia, pannelli
  });

  test('una riga piena senza bug si chiude e dà punti', async ({ page }) => {
    await bootStack(page);
    await page.evaluate(boardScript(null));

    const dopo = await page.evaluate(() => {
      const w = window as any;
      w.__stackDebug.clearRows();
      const s = w.__stackDebug.state();
      const g = w.__stackDebug.fieldOrigin();
      // Nessuna cella deve essere rimasta
      let piene = 0;
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (s.board[r][c]) piene++;
      return { lines: s.lines, score: s.score, piene, righe: s.board.length };
    });

    expect(dopo.lines).toBe(1);
    expect(dopo.score).toBe(100);   // 1 riga × livello 1
    expect(dopo.piene).toBe(0);
    expect(dopo.righe).toBe(18);    // la plancia mantiene l'altezza
  });

  test('MECCANICA PROPRIA: un bug tiene aperta la riga completa', async ({ page }) => {
    await bootStack(page);
    await page.evaluate(boardScript(4));

    const dopo = await page.evaluate(() => {
      const w = window as any;
      w.__stackDebug.clearRows();
      const s = w.__stackDebug.state();
      const g = w.__stackDebug.fieldOrigin();
      let piene = 0;
      for (let c = 0; c < g.cols; c++) if (s.board[g.rows - 1][c]) piene++;
      return { lines: s.lines, score: s.score, pieneUltimaRiga: piene };
    });

    // La riga è completa ma NON si chiude: è il cuore della meccanica.
    expect(dopo.lines).toBe(0);
    expect(dopo.score).toBe(0);
    expect(dopo.pieneUltimaRiga).toBe(10);
  });

  test('MECCANICA PROPRIA: schiacciare il bug col click sblocca la riga', async ({ page }) => {
    await bootStack(page);
    const g = await page.evaluate(boardScript(4)) as any;

    // Click VERO sul canvas, non una chiamata diretta: verifica anche la
    // conversione delle coordinate, che è il punto fragile perché il canvas
    // è scalato dal CSS rispetto alla sua dimensione logica.
    const box = await page.locator('#stack-canvas').boundingBox();
    const scaleX = box!.width / 760;
    const scaleY = box!.height / 540;
    const cx = box!.x + (g.x + (4 + 0.5) * g.cell) * scaleX;
    const cy = box!.y + (g.y + (g.rows - 1 + 0.5) * g.cell) * scaleY;
    await page.mouse.click(cx, cy);

    const dopo = await page.evaluate(() => {
      const s = (window as any).__stackDebug.state();
      const g2 = (window as any).__stackDebug.fieldOrigin();
      let piene = 0;
      for (let c = 0; c < g2.cols; c++) if (s.board[g2.rows - 1][c]) piene++;
      return { lines: s.lines, bugs: s.bugs, score: s.score, pieneUltimaRiga: piene };
    });

    expect(dopo.bugs).toBe(1);              // bug schiacciato
    expect(dopo.lines).toBe(1);             // e la riga si è chiusa subito dopo
    expect(dopo.pieneUltimaRiga).toBe(0);
    expect(dopo.score).toBe(150);           // 50 (bug) + 100 (riga)
  });

  test('MECCANICA PROPRIA: il debito tecnico risale e spinge su la pila', async ({ page }) => {
    await bootStack(page);
    await page.evaluate(boardScript(null));

    const dopo = await page.evaluate(() => {
      const w = window as any;
      const g = w.__stackDebug.fieldOrigin();
      w.__stackDebug.raiseDebt();
      const s = w.__stackDebug.state();

      const ultima = s.board[g.rows - 1];
      const penultima = s.board[g.rows - 2];
      let buchiUltima = 0, bugUltima = 0, pieneUltima = 0;
      for (let c = 0; c < g.cols; c++) {
        if (!ultima[c]) buchiUltima++;
        else { pieneUltima++; if (ultima[c].bug) bugUltima++; }
      }
      // La riga che prima era in fondo è salita di una posizione
      let pienePenultima = 0;
      for (let c = 0; c < g.cols; c++) if (penultima[c]) pienePenultima++;

      return { buchiUltima, bugUltima, pieneUltima, pienePenultima, righe: s.board.length };
    });

    expect(dopo.righe).toBe(18);
    expect(dopo.buchiUltima).toBe(1);      // la riga di debito ha sempre un varco
    expect(dopo.bugUltima).toBe(1);        // e porta con sé un bug
    expect(dopo.pieneUltima).toBe(9);
    expect(dopo.pienePenultima).toBe(10);  // la vecchia riga piena è salita
  });

  test('la pila che tocca il tetto è game over', async ({ page }) => {
    await bootStack(page);

    const esito = await page.evaluate(() => {
      const w = window as any;
      const g = w.__stackDebug.fieldOrigin();
      // Prima riga occupata: non c'è più spazio per far salire il debito.
      const b = [];
      for (let r = 0; r < g.rows; r++) {
        const row = [];
        for (let c = 0; c < g.cols; c++) row.push(r === 0 ? { color: '#00d9ff', bug: false } : null);
        b.push(row);
      }
      w.__stackDebug.setBoard(b);
      w.__stackDebug.raiseDebt();
      return {
        running: w.__stackDebug.state().running,
        overlay: (document.getElementById('stack-overlay') as HTMLElement).textContent || '',
      };
    });

    expect(esito.running).toBe(false);
    expect(esito.overlay).toContain('STACK OVERFLOW');
  });

  test('il badge IN GIOCO non copre né tronca il nome del gioco', async ({ page }) => {
    // Regressione: il badge è in position:absolute, quindi non occupa spazio e
    // finiva SOPRA i nomi lunghi (25px su SNAKE PROTOCOL, 23 su STACK
    // OVERFLOW). Riservargli spazio sulla riga del nome non era una soluzione:
    // i nomi più lunghi riempiono già tutta la larghezza disponibile, quindi
    // sarebbero stati troncati. Ora sta sulla riga sotto.
    //
    // Qui NON si usa bootStack: quello avvia il gioco direttamente, mentre la
    // classe .running la mette la shell, e solo per un gioco lanciato da lei.
    await page.addInitScript(() => {
      try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) {}
    });
    await page.goto('/arcade.php', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { const w = window as any; if (w.ArcadeLoader) w.ArcadeLoader.load(); });
    await page.waitForFunction(() => typeof (window as any).initStackGame === 'function', undefined, { timeout: 15_000 });
    await page.evaluate(() => {
      const w = window as any;
      w._arcadeSelectedGame = 'stack';
      w.launchArcadeGame();
    });
    await page.waitForFunction(
      () => document.querySelector('.arcade-menu-item[data-game="stack"]')!.classList.contains('running'),
      undefined, { timeout: 8_000 },
    );

    const r = await page.evaluate(() => {
      const voci = Array.from(document.querySelectorAll('.arcade-menu-item[data-game]'));
      const troncati: string[] = [];
      const collisioni: string[] = [];
      const altezze = new Set<number>();

      for (const v of voci) {
        const nome = v.querySelector('.item-name') as HTMLElement;
        altezze.add(Math.round(v.getBoundingClientRect().height));
        // Nessun nome deve essere tagliato dai puntini, in nessuno stato
        if (nome.scrollWidth > nome.clientWidth + 1) troncati.push(v.getAttribute('data-game')!);

        if (v.classList.contains('running')) {
          const rn = nome.getBoundingClientRect();
          const rv = v.getBoundingClientRect();
          const badge = getComputedStyle(v, '::after');
          // La posizione del badge va LETTA, non data per scontata: dando per
          // buono "sta in basso" il test passava anche col badge rimesso in
          // alto, cioè proprio nel caso che deve bocciare. Chrome risolve
          // `top` in pixel anche quando il CSS dichiara solo `bottom`.
          const badgeTop = rv.top + (parseFloat(badge.top) || 0);
          const badgeBottom = badgeTop + (parseFloat(badge.height) || 0);
          const badgeLeft = rv.right - (parseFloat(badge.right) || 0) - (parseFloat(badge.width) || 0);
          // Si sovrappongono se i due rettangoli si intersecano su entrambi gli assi
          const incrocioX = rn.right > badgeLeft + 1;
          const incrocioY = rn.bottom > badgeTop + 1 && rn.top < badgeBottom - 1;
          if (incrocioX && incrocioY) collisioni.push(v.getAttribute('data-game')!);
        }
      }

      return {
        troncati, collisioni,
        inGioco: voci.filter((v) => v.classList.contains('running')).map((v) => v.getAttribute('data-game')),
        altezzeDistinte: [...altezze],
      };
    });

    expect(r.inGioco, 'il gioco avviato non risulta in esecuzione nel menu').toContain('stack');
    expect(r.troncati, 'nomi troncati dai puntini').toEqual([]);
    expect(r.collisioni, 'il badge copre il nome').toEqual([]);
    // Il badge non deve far sobbalzare l'altezza delle righe
    expect(r.altezzeDistinte.length, 'righe di altezze diverse fra loro').toBe(1);
  });

  test('la rotazione resta nel campo e non perde celle', async ({ page }) => {
    await bootStack(page);

    const r = await page.evaluate(() => {
      const w = window as any;
      // PIPELINE orizzontale: ruotata deve diventare verticale, 4 celle sempre.
      const orizz = [[0, 0], [1, 0], [2, 0], [3, 0]];
      const ruotato = w.__stackDebug.rotateCells(orizz);
      const larghezza = Math.max(...ruotato.map((c: number[]) => c[0])) + 1;
      const altezza = Math.max(...ruotato.map((c: number[]) => c[1])) + 1;
      // Quattro rotazioni tornano al punto di partenza
      let giro = orizz;
      for (let i = 0; i < 4; i++) giro = w.__stackDebug.rotateCells(giro);
      return {
        celle: ruotato.length,
        larghezza, altezza,
        minX: Math.min(...ruotato.map((c: number[]) => c[0])),
        minY: Math.min(...ruotato.map((c: number[]) => c[1])),
        giroCompleto: JSON.stringify(giro) === JSON.stringify(orizz),
      };
    });

    expect(r.celle).toBe(4);
    expect(r.larghezza).toBe(1);      // verticale
    expect(r.altezza).toBe(4);
    expect(r.minX).toBe(0);           // normalizzata sull'origine
    expect(r.minY).toBe(0);
    expect(r.giroCompleto).toBe(true);
  });

  test('i tasti muovono, ruotano e tuffano il pezzo', async ({ page }) => {
    await bootStack(page);

    const r = await page.evaluate(async () => {
      const w = window as any;
      // Un pezzo controllabile al centro, plancia vuota
      const g = w.__stackDebug.fieldOrigin();
      const b = [];
      for (let i = 0; i < g.rows; i++) {
        const row = [];
        for (let c = 0; c < g.cols; c++) row.push(null);
        b.push(row);
      }
      w.__stackDebug.setBoard(b);
      w.__stackDebug.setPiece({ id: 'PIPELINE', color: '#00d9ff', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], bugAt: -1, x: 3, y: 0 });

      const premi = (code: string) => document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));

      premi('ArrowLeft');
      const dopoSinistra = w.__stackDebug.state().piece.x;
      premi('ArrowRight'); premi('ArrowRight');
      const dopoDestra = w.__stackDebug.state().piece.x;
      premi('ArrowUp');
      const altezzaDopoRotazione = Math.max(...w.__stackDebug.state().piece.cells.map((c: number[]) => c[1])) + 1;
      premi('ArrowDown');
      const yDopoGiu = w.__stackDebug.state().piece.y;
      premi('Space');
      // Il tuffo fissa il pezzo: la plancia in fondo non è più vuota
      const s = w.__stackDebug.state();
      let celleInFondo = 0;
      for (let rr = 0; rr < g.rows; rr++) for (let c = 0; c < g.cols; c++) if (s.board[rr][c]) celleInFondo++;

      return { dopoSinistra, dopoDestra, altezzaDopoRotazione, yDopoGiu, celleInFondo };
    });

    expect(r.dopoSinistra).toBe(2);
    expect(r.dopoDestra).toBe(4);
    expect(r.altezzaDopoRotazione).toBe(4);   // diventato verticale
    expect(r.yDopoGiu).toBe(1);
    expect(r.celleInFondo).toBe(4);           // il tuffo ha fissato le 4 celle
  });
});
