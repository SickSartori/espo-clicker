import { describe, it, expect } from 'vitest';
import { gameData } from './index';
import { en } from './en/index';
import {
  isChristmasSeason, isHalloweenSeason, isSeasonActive, isSeasonActiveIn, IS_XMAS_TIME, IS_HALLOWEEN_TIME,
  CALENDAR_SEASONS, isInSeasonWindow, activeSeasonsAt, parseSeasonOverride,
  isSeasonReleasedAt, releasedSeasonsAt, isSeasonReleasedIn, isSeasonRewardOpenIn,
} from './season';

describe('data/achievements via store (reorg B4)', () => {
  it('ogni achievement ha una condition funzione', () => {
    expect(Object.keys(gameData.achievements).length).toBeGreaterThan(20);
    for (const [id, a] of Object.entries<any>(gameData.achievements)) {
      expect(typeof a.condition, `condition mancante: ${id}`).toBe('function');
    }
  });
  it('le condition leggono lo stato dallo store (non da globali bare)', async () => {
    const { store } = await import('../state/store');
    store.gameState = { totalClicks: 5, teams: {}, totalScore: { gte: () => false }, totalPlayTime: 0 } as any;
    const runnable = Object.values<any>(gameData.achievements).filter((a) => {
      try { a.condition(); return true; } catch { return false; }
    });
    expect(runnable.length).toBeGreaterThan(0);
    store.gameState = undefined as any; // ripristino (runtime undefined; tipo non-opzionale)
  });
});

describe('data/season (fix B2)', () => {
  it('IS_XMAS_TIME coerente con isChristmasSeason e isSeasonActive', () => {
    expect(IS_XMAS_TIME).toBe(isChristmasSeason());
    expect(isSeasonActive('christmas')).toBe(IS_XMAS_TIME);
    expect(isSeasonActive('')).toBe(true);
    expect(isSeasonActive('sconosciuta')).toBe(false);
    expect(IS_HALLOWEEN_TIME).toBe(isHalloweenSeason());
    expect(isSeasonActive('halloween')).toBe(IS_HALLOWEEN_TIME);
  });
  it('finestre a calendario: estremi inclusi, Natale scavalca il capodanno', () => {
    const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
    const { halloween, christmas } = CALENDAR_SEASONS;
    expect(isInSeasonWindow(halloween, at(2026, 10, 23))).toBe(false);
    expect(isInSeasonWindow(halloween, at(2026, 10, 24))).toBe(true);
    expect(isInSeasonWindow(halloween, at(2026, 10, 31))).toBe(true);
    expect(isInSeasonWindow(halloween, at(2026, 11, 2))).toBe(true);
    expect(isInSeasonWindow(halloween, at(2026, 11, 3))).toBe(false);
    expect(isInSeasonWindow(christmas, at(2026, 11, 30))).toBe(false);
    expect(isInSeasonWindow(christmas, at(2026, 12, 1))).toBe(true);
    expect(isInSeasonWindow(christmas, at(2026, 12, 31))).toBe(true);
    expect(isInSeasonWindow(christmas, at(2027, 1, 8))).toBe(true);
    expect(isInSeasonWindow(christmas, at(2027, 1, 9))).toBe(false);
    // estremi del giorno: conta la data locale, non l'ora
    expect(isInSeasonWindow(halloween, new Date(2026, 9, 24, 0, 0, 0))).toBe(true);
    expect(isInSeasonWindow(halloween, new Date(2026, 10, 2, 23, 59, 59))).toBe(true);
  });
  it('activeSeasonsAt: nessuna, una, e mai due insieme nel calendario attuale', () => {
    const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
    expect(activeSeasonsAt(at(2026, 9, 29))).toEqual([]);
    expect(activeSeasonsAt(at(2026, 10, 31))).toEqual(['halloween']);
    expect(activeSeasonsAt(at(2026, 12, 25))).toEqual(['christmas']);
    for (let t = new Date(2026, 0, 1); t.getFullYear() === 2026; t.setDate(t.getDate() + 1)) {
      expect(activeSeasonsAt(t).length).toBeLessThanOrEqual(1);
    }
  });
  it('isSeasonActiveIn: vuoto = non stagionale, id sconosciuto = spento', () => {
    expect(isSeasonActiveIn('', [])).toBe(true);
    expect(isSeasonActiveIn('halloween', ['halloween'])).toBe(true);
    expect(isSeasonActiveIn('christmas', ['halloween'])).toBe(false);
    expect(isSeasonActiveIn('sconosciuta', ['halloween'])).toBe(false);
  });
  it('parseSeasonOverride: auto/assente = calendario, nessuna = tutto spento, id ignoti scartati', () => {
    expect(parseSeasonOverride(null)).toBeNull();
    expect(parseSeasonOverride('')).toBeNull();
    expect(parseSeasonOverride('auto')).toBeNull();
    expect(parseSeasonOverride('nessuna')).toEqual([]);
    expect(parseSeasonOverride('none')).toEqual([]);
    expect(parseSeasonOverride('Halloween')).toEqual(['halloween']);
    expect(parseSeasonOverride('halloween, christmas')).toEqual(['halloween', 'christmas']);
    expect(parseSeasonOverride('pasqua,christmas')).toEqual(['christmas']);
  });
  it('ogni skin gatata da una stagione esiste in skins', () => {
    for (const s of Object.values(CALENDAR_SEASONS)) {
      for (const id of s.skins) expect(gameData.skins[id], `skin ${id} di ${s.id}`).toBeDefined();
    }
  });
  it('unlockHint natalizio EN valorizzato (non undefined)', () => {
    expect(en.skins.christmas.unlockHint).toBe("Redeem the 'Merry Christmas' achievement!");
  });
  it('rarità festive: ogni skin di stagione è festive con la sua season, e viceversa', () => {
    for (const s of Object.values(CALENDAR_SEASONS)) {
      for (const id of s.skins) {
        expect(gameData.skins[id].rarity, `rarità di ${id}`).toBe('festive');
        expect(gameData.skins[id].season, `season di ${id}`).toBe(s.id);
      }
    }
    for (const [id, skin] of Object.entries<any>(gameData.skins)) {
      if (skin.rarity !== 'festive') continue;
      expect(CALENDAR_SEASONS[skin.season as keyof typeof CALENDAR_SEASONS]?.skins, `stagione di ${id}`).toContain(id);
    }
  });
  it('skin festive: ottenibili sempre — obiettivo stagionale in finestra, negozio fuori', () => {
    const rewarded = new Set(Object.values<any>(gameData.achievements)
      .filter((a) => a.reward && a.reward.type === 'skin').map((a) => a.reward.id));
    for (const [id, skin] of Object.entries<any>(gameData.skins)) {
      if (skin.rarity !== 'festive') continue;
      const open = isSeasonActive(skin.season);
      if (skin.cost === undefined) {
        expect(open, `${id} senza prezzo fuori stagione`).toBe(true);
        expect(rewarded.has(id), `${id} senza prezzo né obiettivo`).toBe(true);
      }
    }
    const trick = (gameData.achievements as any).dolcettoScherzetto;
    expect(trick.season).toBe('halloween');
    expect(trick.reward).toEqual({ type: 'skin', id: 'espostore' });
    expect(trick.condition()).toBe(IS_HALLOWEEN_TIME);
  });
  it('tema Halloween: le skin della stagione lo portano, il CSS esiste e il Bug Maledetto ha i testi', async () => {
    const { existsSync } = await import('node:fs');
    for (const id of CALENDAR_SEASONS.halloween.skins) {
      const theme = gameData.skins[id].themeConfig;
      expect(theme?.bodyClass, `tema di ${id}`).toBe('theme-halloween');
      expect(existsSync(`styles/themes/${theme.cssFile}`), `css di ${id}`).toBe(true);
      expect(gameData.texts.toasts[theme.goldenBugToast], `toast IT di ${id}`).toContain('{amount}');
      expect(en.texts.toasts[theme.goldenBugToast], `toast EN di ${id}`).toContain('{amount}');
    }
  });
  it('compleanno: edizione unica, finestra 17-30/11/2026, premio che non scade', () => {
    const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
    const b = CALENDAR_SEASONS.birthday;
    expect(b.year).toBe(2026);
    expect(b.keepsReward).toBe(true);
    expect(isInSeasonWindow(b, at(2026, 11, 16))).toBe(false);
    expect(isInSeasonWindow(b, at(2026, 11, 17, 0))).toBe(true);
    expect(isInSeasonWindow(b, at(2026, 11, 30, 23))).toBe(true);
    expect(isInSeasonWindow(b, at(2026, 12, 1))).toBe(false);
    // edizione unica: l'anno dopo la finestra non riapre
    expect(isInSeasonWindow(b, at(2027, 11, 20))).toBe(false);
    // mai insieme a Natale o Halloween nel 2026
    for (let t = new Date(2026, 0, 1); t.getFullYear() === 2026; t.setDate(t.getDate() + 1)) {
      expect(activeSeasonsAt(t).length).toBeLessThanOrEqual(1);
    }
    expect(activeSeasonsAt(at(2026, 11, 20))).toEqual(['birthday']);
  });
  it('soglia di prima edizione: prima del 17/11/2026 la stagione non è uscita, dopo sì per sempre', () => {
    const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
    const b = CALENDAR_SEASONS.birthday;
    expect(isSeasonReleasedAt(b, at(2026, 10, 20))).toBe(false);
    expect(isSeasonReleasedAt(b, at(2026, 11, 16, 23))).toBe(false);
    expect(isSeasonReleasedAt(b, at(2026, 11, 17, 0))).toBe(true);
    expect(isSeasonReleasedAt(b, at(2027, 11, 20))).toBe(true);
    expect(isSeasonReleasedAt(b, at(2030, 1, 1))).toBe(true);
    // le stagioni ricorrenti non hanno soglia: sono sempre uscite
    expect(isSeasonReleasedAt(CALENDAR_SEASONS.halloween, at(2020, 1, 1))).toBe(true);
    expect(releasedSeasonsAt(at(2026, 10, 20))).toEqual(['halloween', 'christmas']);
    expect(releasedSeasonsAt(at(2026, 11, 17))).toEqual(['halloween', 'christmas', 'birthday']);
    expect(isSeasonReleasedIn('', [])).toBe(true);
    expect(isSeasonReleasedIn('birthday', ['halloween'])).toBe(false);
  });
  it('premio stagionale: il compleanno resta aperto a finestra chiusa, Halloween no', () => {
    const released = ['halloween', 'christmas', 'birthday'];
    expect(isSeasonRewardOpenIn('birthday', [], released)).toBe(true);
    expect(isSeasonRewardOpenIn('birthday', [], ['halloween', 'christmas'])).toBe(false);
    expect(isSeasonRewardOpenIn('halloween', [], released)).toBe(false);
    expect(isSeasonRewardOpenIn('halloween', ['halloween'], released)).toBe(true);
    expect(isSeasonRewardOpenIn('', [], [])).toBe(true);
    expect(isSeasonRewardOpenIn('sconosciuta', ['sconosciuta'], ['sconosciuta'])).toBe(false);
  });
  it('compleanno: nessuna skin, il premio è lo switch del tema Vintage; obiettivo senza scadenza', async () => {
    const { existsSync } = await import('node:fs');
    // Nessuna skin del compleanno: il tema non appartiene a una skin.
    expect(CALENDAR_SEASONS.birthday.skins).toEqual([]);
    expect((gameData.skins as any).espoV1).toBeUndefined();
    for (const skin of Object.values<any>(gameData.skins)) expect(skin.season).not.toBe('birthday');
    const ach = (gameData.achievements as any).primoCompleanno;
    expect(ach.season).toBe('birthday');
    expect(ach.reward).toEqual({ type: 'theme', id: 'vintage' });
    expect(en.achievements.primoCompleanno?.name).toBe('First Birthday');
    expect(existsSync('styles/themes/vintage-theme.css')).toBe(true);
    // i testi del toast di riscatto esistono nelle due lingue
    expect(gameData.texts.toasts.themeVintage).toBeTruthy();
    expect(en.texts.toasts.themeVintage).toBeTruthy();
  });
  it('ogni skin ha i suoi file immagine (normale e click) su disco', async () => {
    const { existsSync } = await import('node:fs');
    for (const [id, skin] of Object.entries<any>(gameData.skins)) {
      expect(existsSync(`assets/image/${skin.img}`), `img di ${id}`).toBe(true);
      expect(existsSync(`assets/image/${skin.imgClick}`), `imgClick di ${id}`).toBe(true);
    }
  });
  it('skin della 3.3: Ingegnespo, Espostronauta ed Espoleon — prezzo in Token, rarità e overlay EN', () => {
    const attese: Array<[string, string, number, string]> = [
      ['ingegnespo', 'common', 6, 'Espogineer'],
      ['espostronauta', 'epic', 28, 'Espostronaut'],
      ['espoleon', 'legendary', 65, 'Espoleon Bonaparte'],
    ];
    const skins: Record<string, any> = gameData.skins;
    for (const [id, rarita, costo, nomeEn] of attese) {
      const s = skins[id];
      expect(s, id).toBeDefined();
      expect(s.rarity, `rarità di ${id}`).toBe(rarita);
      expect(Number(s.cost.toString()), `costo di ${id}`).toBe(costo);
      expect(s.themeConfig, `${id} non porta un tema: il Vintage si vede`).toBeUndefined();
      expect(s.season, `${id} non è stagionale`).toBeUndefined();
      expect((en.skins as any)[id]?.name ?? s.name, `nome EN di ${id}`).toBe(nomeEn);
      expect((en.skins as any)[id]?.desc, `desc EN di ${id}`).toBeTruthy();
    }
    // La scala dei prezzi regge: ogni rarità costa più della precedente nel suo gruppo di Token.
    const prezzo = (id: string) => Number(skins[id].cost.toString());
    expect(prezzo('ingegnespo')).toBeLessThan(prezzo('espostronauta'));
    expect(prezzo('espostronauta')).toBeLessThan(prezzo('espoleon'));
  });
  it('ogni evento video è cablato: asset, file, tag creato all\'avvio e classe CSS', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const boot = readFileSync('src/app/boot.ts', 'utf8');
    const css = readFileSync('styles/base/clicker.css', 'utf8');
    const sounds = Object.values<any>((gameData as any).assets.videos);
    for (const [key, ev] of Object.entries<any>(gameData.events)) {
      if (ev.type !== 'video') continue;
      for (const vid of ev.videos as string[]) {
        const asset = sounds.find((s) => s.id === vid);
        expect(asset, `asset audio/video di ${key}/${vid}`).toBeDefined();
        expect(existsSync(`assets/video/${asset.file}`), `file video di ${vid}`).toBe(true);
        // il tag <video> si crea in injectVideosLazily e il suo file si precarica da R2
        expect(boot.includes(`id: '${vid}'`), `injectVideosLazily di ${vid}`).toBe(true);
        expect(boot.includes(`assets/video/${asset.file}'`), `prefetch di ${vid}`).toBe(true);
        // il video sta a schermo intero grazie a una classe con lo stesso nome (trattini → underscore)
        expect(css.includes(`.${vid.replace(/-/g, '_')}`), `classe CSS di ${vid}`).toBe(true);
      }
    }
  });
  it('skin della 3.3 dai bozzetti: Albert Wespo (leggendaria, 80 Token) e Dio Efespo (divina, 150 Token)', () => {
    const skins: Record<string, any> = gameData.skins;
    const attese: Array<[string, string, number, string]> = [
      ['wesker', 'legendary', 80, 'Albert Wespo'],
      ['efesto', 'divine', 150, 'Hephaespo'],
    ];
    for (const [id, rarita, costo, nomeEn] of attese) {
      const s = skins[id];
      expect(s, id).toBeDefined();
      expect(s.rarity, `rarità di ${id}`).toBe(rarita);
      expect(Number(s.cost.toString()), `costo di ${id}`).toBe(costo);
      expect(s.requiresFormatting, `${id} richiede una Formattazione`).toBe(true);
      expect(s.unlockHint, `hint di ${id}`).toContain(String(costo));
      expect((en.skins as any)[id]?.name, `nome EN di ${id}`).toBe(nomeEn);
      expect((en.skins as any)[id]?.unlockHint, `hint EN di ${id}`).toContain(String(costo));
    }
  });
  it('evento «7 Ticket»: video da 12,2 s con un moltiplicatore più alto degli altri video, a parità di resa', () => {
    const ev: any = (gameData.events as any).wesker;
    expect(ev.type).toBe('video');
    expect(ev.videos).toEqual(['albert-wespo-video']);
    expect(ev.duration).toBe(12200);
    const altri = ['rickRoll', 'ricardo', 'britneyEspears'].map((k) => (gameData.events as any)[k]);
    for (const o of altri) {
      expect(ev.minMult, `più alto del minimo di ${o.name}`).toBeGreaterThan(o.minMult);
      expect(ev.maxMult, `più alto del massimo di ${o.name}`).toBeGreaterThan(o.maxMult);
    }
    // resa attesa (moltiplicatore medio × secondi) paragonabile: almeno il 50% di quella di un video da 60 s
    const resa = (e: any) => ((e.minMult + e.maxMult) / 2) * (e.duration / 1000);
    expect(resa(ev)).toBeGreaterThan(0.5 * resa((gameData.events as any).rickRoll));
    expect((en.events as any).wesker?.toast).toContain('{mult}');
    expect((gameData.events as any).wesker.toast).toContain('{mult}');
  });
  it('ogni skin, obiettivo e rarità festive ha il suo overlay EN', () => {
    for (const id of CALENDAR_SEASONS.halloween.skins) expect(en.skins[id]?.name, `EN ${id}`).toBeTruthy();
    expect(en.achievements.dolcettoScherzetto?.name).toBe('Trick or Treat');
    expect(en.texts.rarities.festive).toBe('FESTIVE');
    expect(gameData.texts.rarities.festive).toBe('FESTIVA');
  });
});

describe('data/index (reorg filone B)', () => {
  it('espone texts con la struttura consumata dal gioco', () => {
    expect(gameData.texts.format.suffixes.length).toBeGreaterThan(40); // scala fino a Qag
    expect(gameData.texts.format.time.s).toBeTypeOf('string');
    expect(gameData.texts.toasts).toBeTypeOf('object');
    expect(gameData.texts.ui).toBeTypeOf('object');
  });
  it('espone events e assets', () => {
    expect(Object.keys(gameData.events).length).toBeGreaterThan(0);
    expect(gameData.assets.sounds).toBeTypeOf('object');
  });
  it('teams/upgrades hanno costi Decimal-like e skins ha default (B3)', () => {
    const t = Object.values<any>(gameData.teams)[0];
    expect(typeof t.baseCost.mul).toBe('function');
    expect(Object.keys(gameData.skins)).toContain('default');
    expect(Object.keys(gameData.clickUpgrades).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.prestigeUpgrades).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.buildingEnhancements).length).toBeGreaterThan(0);
    expect(Object.keys(gameData.superUpgrades).length).toBeGreaterThan(0);
  });
});

describe('data/en overlay (reorg filone B)', () => {
  it('gli id dei dizionari en esistono nelle collezioni base (niente chiavi orfane)', () => {
    for (const id of Object.keys(en.teams ?? {})) {
      // le collezioni base arrivano in B3: finché mancano, il check è sui texts
      if (gameData.teams) expect(gameData.teams[id], `team en orfano: ${id}`).toBeTruthy();
    }
    expect(en.texts).toBeTypeOf('object');
  });
  it('gameData.i18n.en è cablato', () => {
    expect(gameData.i18n.en).toBe(en);
  });
});
