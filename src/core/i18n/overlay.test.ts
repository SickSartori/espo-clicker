import { describe, it, expect } from 'vitest';
import { deepOverlay, overlayById, applyLanguage, I18N_COLLECTIONS } from './overlay';

describe('deepOverlay', () => {
  it('merge profondo dei soli campi presenti', () => {
    const target = { ui: { play: 'Gioca', stop: 'Ferma' }, keep: 'resto' };
    deepOverlay(target, { ui: { play: 'Play' } });
    expect(target.ui.play).toBe('Play');
    expect(target.ui.stop).toBe('Ferma');
    expect(target.keep).toBe('resto');
  });

  it('array sostituiti interi, non mergiati (semantica legacy)', () => {
    const target = { tips: ['a', 'b', 'c'] };
    deepOverlay(target, { tips: ['x'] });
    expect(target.tips).toEqual(['x']);
  });

  it('crea rami mancanti nel target', () => {
    const target: Record<string, unknown> = {};
    deepOverlay(target, { nuovo: { k: 'v' } });
    expect(target).toEqual({ nuovo: { k: 'v' } });
  });

  it('target/src assenti → no-op senza throw', () => {
    expect(() => deepOverlay(undefined, { a: 1 })).not.toThrow();
    expect(() => deepOverlay({ a: 1 }, undefined)).not.toThrow();
  });
});

describe('overlayById', () => {
  it('sovrascrive solo i campi forniti degli id esistenti', () => {
    const target = { dev: { name: 'Sviluppatore', desc: 'IT desc', cost: 100 } };
    overlayById(target, { dev: { name: 'Developer' } });
    expect(target.dev).toEqual({ name: 'Developer', desc: 'IT desc', cost: 100 });
  });

  it('id assenti nel target vengono saltati (restano IT)', () => {
    const target: Record<string, unknown> = { dev: { name: 'Sviluppatore' } };
    overlayById(target, { ghost: { name: 'Ghost' } });
    expect(target.ghost).toBeUndefined();
  });
});

describe('applyLanguage', () => {
  const mkGameData = () => ({
    texts: { ui: { play: 'Gioca' }, toasts: { saved: 'Salvato!' } },
    teams: { dev: { name: 'Sviluppatore', baseCost: 10 } },
    skins: { gold: { name: 'Dorata' } },
    i18n: {
      en: {
        texts: { ui: { play: 'Play' } },
        teams: { dev: { name: 'Developer' } },
        skins: { gold: { name: 'Golden' } },
      },
    },
  });

  it('applica overlay texts + collezioni per-id', () => {
    const gd = mkGameData();
    applyLanguage(gd, 'en');
    expect(gd.texts.ui.play).toBe('Play');
    expect(gd.texts.toasts.saved).toBe('Salvato!'); // non toccato
    expect(gd.teams.dev.name).toBe('Developer');
    expect(gd.teams.dev.baseCost).toBe(10); // dati numerici intatti
    expect(gd.skins.gold.name).toBe('Golden');
  });

  it('lingua senza dizionario → no-op', () => {
    const gd = mkGameData();
    const snapshot = JSON.stringify(gd);
    applyLanguage(gd, 'it');
    applyLanguage(gd, 'de');
    expect(JSON.stringify(gd)).toBe(snapshot);
  });

  it('elenco collezioni identico al legacy', () => {
    expect([...I18N_COLLECTIONS]).toEqual([
      'teams',
      'clickUpgrades',
      'prestigeUpgrades',
      'buildingEnhancements',
      'superUpgrades',
      'skins',
      'achievements',
      'events',
    ]);
  });
});
