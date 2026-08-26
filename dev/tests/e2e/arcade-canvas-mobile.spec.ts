import { test, expect } from '@playwright/test';

/**
 * SALA GIOCHI SU TELEFONO — geometria del canvas.
 *
 * Due difetti trovati dal check del 07/08/2026, entrambi invisibili a un test
 * funzionale (il gioco "gira", solo che non si puo' giocare):
 *
 * 1. TELEFONO RUOTATO (812x375). Girare il telefono davanti a un cabinato e' il
 *    gesto piu' naturale che ci sia. Restavano 58px di area di gioco e il canvas
 *    finiva a 6x6 px: i 232px riservati in basso al flipper erano tarati sul
 *    verticale (un quinto di 812) e in orizzontale valgono due terzi di 375.
 *    Ora il flipper sta ai LATI e l'area torna a 314px.
 *
 * 2. CANVAS STIRATO. Asteroids/Invaders/Centipede avevano il canvas a
 *    width:100%/height:100%: riempiva il riquadro qualunque forma avesse, con
 *    una deformazione fino a 2,12x in verticale — cerchi ovali e mira sballata,
 *    visto che il colpo si calcola sul rettangolo reale.
 *
 * Il test misura il rettangolo REALE del canvas e lo confronta col rapporto
 * logico (canvas.width/canvas.height): la distorsione deve restare ~1,00.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

const GIOCHI = [
  { key: 'asteroids', canvas: '#asteroids-canvas' },
  { key: 'invaders',  canvas: '#invaders-canvas' },
  { key: 'centipede', canvas: '#centipede-canvas' },
  { key: 'stack',     canvas: '#stack-canvas' },   // controllo: era gia' corretto
];

async function apriEAvvia(page: any, key: string, sel: string) {
  await page.route('**/functions/v1/**', () => {});
  await page.addInitScript(() => { try { sessionStorage.setItem('espooUser', 'E2ETester'); } catch (e) {} });
  await page.goto('/arcade.php', { waitUntil: 'domcontentloaded' });
  // I giochi sono lazy: si chiede il caricamento ma NON si aspetta la promise
  // (dentro c'e' la CDN di Phaser, che serve solo a Super Espo').
  await page.evaluate(() => { const w = window as any; if (w.ArcadeLoader) w.ArcadeLoader.load(); });
  await page.waitForFunction(() => {
    const w = window as any;
    return ['startAsteroidsGame', 'startInvadersGame', 'startCentipedeGame', 'initStackGame']
      .every((f) => typeof w[f] === 'function');
  }, undefined, { timeout: 30000 });
  await page.evaluate((k: string) => {
    const w = window as any;
    w._arcadeSelectedGame = k;
    w.launchArcadeGame();
  }, key);
  await page.waitForSelector(sel, { state: 'attached', timeout: 15000 });
  // Il wrapper .crt-turn-on parte da scale(1, 0.001): misurare prima della fine
  // dell'animazione da numeri sbagliati di un fattore ~6.
  await page.evaluate(async () => {
    const el = document.querySelector('#arcade-active-game-container .crt-turn-on') as HTMLElement | null;
    if (el) await Promise.all(el.getAnimations().map((a: any) => a.finished.catch(() => {})));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function misura(page: any, sel: string) {
  return page.evaluate((s: string) => {
    const c = document.querySelector(s) as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    // il bordo (stack ne ha 3px) non fa parte del campo disegnato: va tolto,
    // altrimenti falsa il rapporto sui canvas piccoli.
    const bx = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const by = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const w = r.width - bx, h = r.height - by;
    const pad = document.getElementById('arcade-virtual-pad') as HTMLElement;
    let overlap = 0;
    if (getComputedStyle(pad).display !== 'none') {
      pad.querySelectorAll('.vp-dpad, .vp-actions').forEach((el) => {
        const s2 = el.getBoundingClientRect();
        const ox = Math.min(s2.right, r.right) - Math.max(s2.left, r.left);
        const oy = Math.min(s2.bottom, r.bottom) - Math.max(s2.top, r.top);
        if (ox > 0 && oy > 0) overlap += ox * oy;
      });
    }
    return { w, h, distorsione: (w / h) / (c.width / c.height), overlap };
  }, sel);
}

for (const g of GIOCHI) {
  test(`${g.key}: il canvas mantiene il rapporto in verticale`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await apriEAvvia(page, g.key, g.canvas);
    const m = await misura(page, g.canvas);
    expect(m.h, 'il canvas deve avere un\'altezza utile').toBeGreaterThan(150);
    expect(m.distorsione, `${g.key} verticale: rapporto d'aspetto`).toBeGreaterThan(0.98);
    expect(m.distorsione, `${g.key} verticale: rapporto d'aspetto`).toBeLessThan(1.02);
  });

  test(`${g.key}: il canvas resta giocabile col telefono ruotato`, async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await apriEAvvia(page, g.key, g.canvas);
    const m = await misura(page, g.canvas);
    expect(m.distorsione, `${g.key} orizzontale: rapporto d'aspetto`).toBeGreaterThan(0.98);
    expect(m.distorsione, `${g.key} orizzontale: rapporto d'aspetto`).toBeLessThan(1.02);
    // il flipper spostato ai lati non deve finire sopra al campo
    expect(m.overlap, 'i tasti non devono coprire il canvas').toBe(0);
  });
}

test('telefono ruotato: area di gioco e flipper ai lati', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await apriEAvvia(page, 'asteroids', '#asteroids-canvas');
  const m = await page.evaluate(() => {
    const body = document.getElementById('arcade-fs-body') as HTMLElement;
    const cs = getComputedStyle(body);
    const area = body.getBoundingClientRect().height
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    // ogni gioco spegne i tasti che non usa (arcade-page.js): si misurano i vivi
    const tasti = Array.from(document.querySelectorAll('#arcade-virtual-pad .vp-btn, #arcade-virtual-pad .vp-action-btn'))
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    return {
      area,
      padVisibile: getComputedStyle(document.getElementById('arcade-virtual-pad') as HTMLElement).display !== 'none',
      minLato: Math.min(...tasti.map((r) => Math.min(r.width, r.height))),
      fuoriSchermo: tasti.filter((r) => r.bottom > 375 || r.right > 812 || r.left < 0).length,
    };
  });
  // prima del fix: 58px (canvas 6x6 px)
  expect(m.area, 'area di gioco in orizzontale').toBeGreaterThan(250);
  expect(m.padVisibile, 'il flipper deve restare disponibile').toBe(true);
  expect(m.minLato, 'bersaglio minimo 44px (WCAG 2.5.8)').toBeGreaterThanOrEqual(44);
  expect(m.fuoriSchermo, 'nessun tasto fuori dallo schermo').toBe(0);
});

test('telefono ruotato: vale anche senza la classe di fallback touch-device', async ({ page }) => {
  // Il layout orizzontale si accende in due modi (pointer:coarse e la classe JS
  // html.touch-device). Qui si toglie la classe: deve reggere la sola media query.
  await page.setViewportSize({ width: 812, height: 375 });
  await apriEAvvia(page, 'centipede', '#centipede-canvas');
  const area = await page.evaluate(() => {
    document.documentElement.classList.remove('touch-device');
    const body = document.getElementById('arcade-fs-body') as HTMLElement;
    const cs = getComputedStyle(body);
    return body.getBoundingClientRect().height
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  });
  expect(area).toBeGreaterThan(250);
});

/**
 * 3. CAMPO DISEGNATO OLTRE IL BORDO (difetto vecchio, non del 5d5f1ba).
 *
 *    Invaders costruisce la formazione con numeri fissi — 9 colonne ogni 38px —
 *    invece di ricavarli dalla larghezza LOGICA del canvas, che sul telefono in
 *    verticale e' 315px (innerWidth-60) contro i 1100 del desktop. La formazione
 *    ne chiede 328 piu' i bordi: l'ultima colonna cade oltre il riquadro e resta
 *    invisibile.
 *
 *    Non e' solo estetica. Lo sciame nasce gia' oltre il bordo destro, quindi il
 *    controllo del rimbalzo scatta a ogni tick: inverte e scende, inverte e
 *    scende. Misurato prima del fix: 162px di discesa (9 scalini) in 61
 *    fotogrammi, cioe' addosso al giocatore in pochi secondi.
 *
 *    Il test prende in mano il loop del gioco (rAF) e misura i pixel davvero
 *    disegnati: e' l'unico modo di vedere una colonna che esce dal riquadro.
 */

// tier 3 / 2 / 1: sono colori esclusivi degli alieni (bunker, colpi, particelle
// e giocatore usano altro), quindi bastano a isolare la formazione.
async function sciameInvaders(page: any, fotogrammi: number) {
  return page.evaluate((n: number) => {
    const c = document.querySelector('#invaders-canvas') as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const w = window as any;

    function riquadro() {
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1, n = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (!((r === 168 && g === 85 && b === 247) ||
                (r === 16 && g === 185 && b === 129) ||
                (r === 251 && g === 191 && b === 36))) continue;
          n++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      return { n, minX, maxX, minY, maxY };
    }

    // Il loop e' un rAF privato del gioco: qui lo si guida a mano, cosi' la
    // misura non dipende da quanto il browser decide di disegnare.
    const raf = window.requestAnimationFrame;
    let atteso: any = null;
    (window as any).requestAnimationFrame = (cb: any) => { atteso = cb; return 1; };
    try {
      w.startInvadersRun();
      let t = performance.now();
      const passo = () => { const cb = atteso; atteso = null; if (cb) { t += 20; cb(t); } };
      passo();
      const nascita = riquadro();
      for (let i = 0; i < n; i++) passo();
      return { larghezza: c.width, nascita, dopo: riquadro() };
    } finally {
      (window as any).requestAnimationFrame = raf;
    }
  }, fotogrammi);
}

const MARGINE = 6;              // il bordo su cui lo sciame rimbalza
const SCATTO = 8;               // di quanto si sposta a ogni tick

test('invaders: lo sciame nasce dentro la larghezza del canvas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await apriEAvvia(page, 'invaders', '#invaders-canvas');
  const m = await sciameInvaders(page, 0);

  expect(m.nascita.n, 'gli alieni devono essere disegnati').toBeGreaterThan(0);
  // il bordo destro della colonna piu' a destra e' maxX+1
  expect(m.nascita.maxX + 1, 'colonna piu\' a destra dentro il riquadro')
    .toBeLessThanOrEqual(m.larghezza - MARGINE);
  expect(m.nascita.minX, 'colonna piu\' a sinistra dentro il riquadro')
    .toBeGreaterThanOrEqual(MARGINE);
  // e con spazio per oscillare: se la formazione riempie tutto, lo sciame
  // rimbalza al primo scatto e scende senza sosta
  expect(m.nascita.minX - MARGINE, 'spazio per oscillare a sinistra')
    .toBeGreaterThanOrEqual(SCATTO);
  expect(m.larghezza - MARGINE - (m.nascita.maxX + 1), 'spazio per oscillare a destra')
    .toBeGreaterThanOrEqual(SCATTO);
});

test('invaders: lo sciame non precipita appena nato', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await apriEAvvia(page, 'invaders', '#invaders-canvas');
  const m = await sciameInvaders(page, 60);
  const sceso = m.dopo.minY - m.nascita.minY;
  expect(sceso, 'discesa in 61 fotogrammi (prima del fix: 162px, 9 scalini)')
    .toBeLessThanOrEqual(54);
});

/**
 * 4. BUNKER OLTRE IL BORDO — stesso difetto della formazione, altra funzione.
 *
 *    spawnBunkers() fissava quattro bunker da 70px e dalla larghezza del canvas
 *    ricavava soltanto il varco: (larghezza - 280) / 5. Sotto i 280px di canvas,
 *    cioe' da un telefono di 340px di viewport in giu', il varco diventava
 *    NEGATIVO: i bunker si sovrapponevano e i due esterni uscivano dal riquadro.
 *    Misurato a 320x740 prima del fix: un unico blocco verde da 0 a 259, tutta
 *    la larghezza bordo a bordo, varco -4.
 *
 *    Il bunker non e' uno sprite scalabile (cupola e tacca hanno offset fissi nel
 *    disegno), quindi la scelta e' togliere un bunker invece di stringerlo: tre
 *    ripari veri battono quattro monconi. Il test non fissa il numero, fissa le
 *    proprieta' che devono valere a qualunque larghezza.
 */

// rgb(46,204,113) e' il verde esclusivo del bunker a vita piena: alieni, colpi e
// giocatore usano altri colori, quindi basta a isolarli sulla riga scansionata.
async function bunkerInvaders(page: any) {
  return page.evaluate(() => {
    const c = document.querySelector('#invaders-canvas') as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const w = window as any;

    // Come per lo sciame: il loop e' un rAF privato, qui lo si guida a mano.
    const raf = window.requestAnimationFrame;
    let atteso: any = null;
    (window as any).requestAnimationFrame = (cb: any) => { atteso = cb; return 1; };
    try {
      w.startInvadersRun();
      const cb = atteso; atteso = null;
      if (cb) cb(performance.now() + 20);
    } finally {
      (window as any).requestAnimationFrame = raf;
    }

    // Riga nel corpo del bunker: sopra la tacca scura, che parte a y + h - 10.
    const rowY = c.height - 100 + 16;
    const d = ctx.getImageData(0, rowY, c.width, 1).data;
    const acceso = (x: number) =>
      d[x * 4] === 46 && d[x * 4 + 1] === 204 && d[x * 4 + 2] === 113;

    const segmenti: { da: number; a: number; w: number }[] = [];
    let s = -1;
    for (let x = 0; x <= c.width; x++) {
      if (x < c.width && acceso(x)) { if (s < 0) s = x; }
      else if (s >= 0) { segmenti.push({ da: s, a: x - 1, w: x - s }); s = -1; }
    }

    const varchi: number[] = [];
    if (segmenti.length) {
      varchi.push(segmenti[0].da);
      for (let i = 1; i < segmenti.length; i++) varchi.push(segmenti[i].da - segmenti[i - 1].a - 1);
      varchi.push(c.width - 1 - segmenti[segmenti.length - 1].a);
    }
    return { larghezza: c.width, segmenti, varchi };
  });
}

const BUNKER_W_MAX = 70;   // larghezza piena: non deve mai crescere oltre
const BUNKER_MIN = 3;      // sotto questo il campo resta troppo scoperto

for (const vp of [
  { w: 320, h: 740 },   // il caso rotto: canvas logico 260
  { w: 375, h: 812 },   // canvas 315, il difetto non si vedeva a occhio
  { w: 430, h: 932 },   // canvas 370: qui i quattro bunker tornano a entrare
]) {
  test(`invaders: i bunker restano dentro il riquadro a ${vp.w}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await apriEAvvia(page, 'invaders', '#invaders-canvas');
    const m = await bunkerInvaders(page);

    expect(m.segmenti.length, 'bunker disegnati').toBeGreaterThanOrEqual(BUNKER_MIN);
    // nessun varco negativo o nullo: e' esattamente il difetto di partenza
    // (a 320px erano quattro bunker fusi in un blocco solo, varco -4)
    for (const v of m.varchi) {
      expect(v, `varchi a ${vp.w}px: ${JSON.stringify(m.varchi)}`).toBeGreaterThan(0);
    }
    // nessun bunker fuori dal riquadro
    expect(m.segmenti[0].da, 'primo bunker dentro il bordo sinistro').toBeGreaterThanOrEqual(0);
    expect(m.segmenti[m.segmenti.length - 1].a, 'ultimo bunker dentro il bordo destro')
      .toBeLessThan(m.larghezza);
    // e nessuno piu' largo del bunker pieno (il tondeggiamento dei pixel vale 1px)
    for (const s of m.segmenti) {
      expect(s.w, `larghezze a ${vp.w}px: ${JSON.stringify(m.segmenti.map((x) => x.w))}`)
        .toBeLessThanOrEqual(BUNKER_W_MAX + 1);
    }
  });
}

test('invaders: su desktop i quattro bunker restano dove erano', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await apriEAvvia(page, 'invaders', '#invaders-canvas');
  const m = await bunkerInvaders(page);
  // canvas 1100: la formula vecchia dava varco 164 e x = 164/398/632/866.
  // Il fix non deve spostare di un pixel il caso che gia' funzionava.
  expect(m.segmenti.map((s: any) => s.da)).toEqual([164, 398, 632, 866]);
  expect(m.varchi).toEqual([164, 164, 164, 164, 164]);
});

/**
 * 5. RISERVA SOTTO AL CAMPO — un numero fisso per pad di forme diverse.
 *
 *    Lo spazio riservato in basso al flipper era un valore scritto a mano
 *    (210px), tarato sul D-pad a tre righe di uno schermo da 375. Ma la
 *    griglia del D-pad e' 3x3 anche quando il gioco usa due tasti soli: chi
 *    non ha su' e giu' si portava dietro due righe di celle vuote, e sotto al
 *    campo restava una fascia nera che non conteneva niente. Misurato prima
 *    del fix: BUG INVADERS lasciava 71px vuoti a 375x812 e 89 a 320x568; e a
 *    320, dove i tasti si rimpiccioliscono, i 210px erano 31 di troppo per
 *    TUTTI i giochi.
 *
 *    Ora la riserva E' l'altezza del pad: righe reali x cella piu' i gap,
 *    oppure il tasto azione se e' piu' alto, piu' lo stacco dal bordo. Il test
 *    misura la fascia fra il fondo del telaio e il primo tasto: e' quella la
 *    fascia che prima era vuota.
 */
async function telaioPad(page: any, sel: string) {
  return page.evaluate((s: string) => {
    const pad = document.getElementById('arcade-virtual-pad') as HTMLElement;
    const dpad = pad.querySelector('.vp-dpad') as HTMLElement;
    const box = (b: Element) => b.getBoundingClientRect();
    const tasti = (Array.from(pad.querySelectorAll('button')) as HTMLElement[])
      .filter((b) => { const r = box(b); return r.width > 1 && r.height > 1; });
    const dir = tasti.filter((b) => b.classList.contains('vp-btn')).map(box);
    const azi = tasti.filter((b) => b.classList.contains('vp-action-btn')).map(box);
    const cella = dir.length ? dir[0].height : 0;
    const telaio = box(document.querySelector('.arcade-screen-container') as HTMLElement);
    const c = document.querySelector(s) as HTMLCanvasElement;
    const rc = box(c);

    let overlap = 0;
    pad.querySelectorAll('.vp-dpad, .vp-actions').forEach((el) => {
      const r = box(el);
      const ox = Math.min(r.right, rc.right) - Math.max(r.left, rc.left);
      const oy = Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top);
      if (ox > 0 && oy > 0) overlap += ox * oy;
    });

    return {
      forma: document.body.dataset.dpad || '',
      // altezza della griglia diviso il passo di una cella: quante righe occupa
      righeDpad: cella ? Math.round((box(dpad).height + 4) / (cella + 4)) : 0,
      // la fascia fra il fondo del telaio e il primo tasto: quella che prima
      // restava vuota
      spazioMorto: Math.min.apply(null, tasti.map((b) => box(b).top)) - telaio.bottom,
      // quanto passa fra l'ultimo tasto direzione e il primo tasto azione: ora
      // stanno sulla stessa riga, e a 320px si sfioravano (2px)
      stacco: (azi.length && dir.length)
        ? Math.min.apply(null, azi.map((r) => r.left)) - Math.max.apply(null, dir.map((r) => r.right))
        : Infinity,
      minTasto: Math.min.apply(null, tasti.map((b) => Math.min(box(b).width, box(b).height))),
      overlap,
    };
  }, sel);
}

const FORME = [
  { key: 'invaders',  canvas: '#invaders-canvas',  forma: 'lr',  righe: 1 },  // sinistra/destra
  { key: 'asteroids', canvas: '#asteroids-canvas', forma: 'ulr', righe: 2 },  // su' + sinistra/destra
  { key: 'snake',     canvas: '#snake-canvas',     forma: '',    righe: 3 },  // quattro direzioni: invariato
];

for (const g of FORME) {
  for (const vp of [{ w: 375, h: 812 }, { w: 320, h: 568 }]) {
    test(`${g.key}: sotto al campo si riserva il pad che c'e' davvero (${vp.w}x${vp.h})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await apriEAvvia(page, g.key, g.canvas);
      const m = await telaioPad(page, g.canvas);

      expect(m.forma, 'forma del D-pad pubblicata da configurePad').toBe(g.forma);
      expect(m.righeDpad, 'righe di griglia occupate').toBe(g.righe);
      // il difetto di partenza: 71-89px di fascia vuota su invaders, 31 su
      // tutti gli altri a 320. Sotto i 12px c'e' solo lo stacco dal bordo.
      expect(m.spazioMorto, 'fascia vuota fra il campo e i tasti').toBeLessThanOrEqual(12);
      expect(m.spazioMorto, 'i tasti non devono risalire sul telaio').toBeGreaterThanOrEqual(0);
      // e la riserva piu' stretta non deve portare i tasti sul campo
      expect(m.overlap, 'i tasti non coprono il canvas').toBe(0);
      expect(m.minTasto, 'WCAG 2.5.8: 44px minimi').toBeGreaterThanOrEqual(44);
    });
  }
}

test('a 320px i tasti direzione non si sfiorano con quelli azione', async ({ page }) => {
  // Con il D-pad ridotto alle sue righe, direzione e azione finiscono sulla
  // STESSA riga in fondo: in larghezza pero' a 320 non avanza niente, e fra
  // destra e FIRE restavano 2px. START cede gli 8px che servono, e resta
  // comunque sopra i 44 di WCAG.
  await page.setViewportSize({ width: 320, height: 568 });
  await apriEAvvia(page, 'invaders', '#invaders-canvas');
  const m = await telaioPad(page, '#invaders-canvas');
  expect(m.stacco, 'stacco fra destra e FIRE (prima del fix: 2px)').toBeGreaterThanOrEqual(10);
  expect(m.minTasto, 'WCAG 2.5.8: 44px minimi').toBeGreaterThanOrEqual(44);
});
