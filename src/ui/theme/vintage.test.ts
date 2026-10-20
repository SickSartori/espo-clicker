import { describe, it, expect } from 'vitest';
import {
    vintageState, skinHasOwnTheme, mascotArt, VINTAGE_THEME, VINTAGE_ART, BASE_SKIN_ID, VINTAGE_UNLOCK_ACHIEVEMENT,
} from './vintage';
import { gameData } from '../../data/index';

const claimed = { achievements: { primoCompleanno: { unlocked: true, claimed: true } } };
const notClaimed = { achievements: { primoCompleanno: { unlocked: true, claimed: false } } };

describe('ui/theme/vintage — skinHasOwnTheme', () => {
    it('una skin con classe o foglio CSS ha un tema suo; senza, no', () => {
        expect(skinHasOwnTheme({ themeConfig: { bodyClass: 'theme-halloween', cssFile: 'x.css' } })).toBe(true);
        expect(skinHasOwnTheme({ themeConfig: { cssFile: 'x.css' } })).toBe(true);
        expect(skinHasOwnTheme({ themeConfig: { goldenBugIcon: 'fa-gift' } })).toBe(false);
        expect(skinHasOwnTheme({})).toBe(false);
        expect(skinHasOwnTheme(undefined)).toBe(false);
    });
    it('sui dati veri: Halloween, Natale, 8bit hanno il tema; default ed espo3 no', () => {
        for (const id of ['espostore', 'frankenespo', 'conteEspocula', 'christmas', 'espobit']) {
            expect(skinHasOwnTheme((gameData.skins as any)[id]), id).toBe(true);
        }
        for (const id of ['default', 'espo3']) expect(skinHasOwnTheme((gameData.skins as any)[id]), id).toBe(false);
    });
});

describe('ui/theme/vintage — vintageState', () => {
    const noTheme = { img: 'skins/espo.webp' };
    const withTheme = { themeConfig: { bodyClass: 'theme-christmas', cssFile: 'christmas-theme.css' } };

    it('premio riscattato + switch acceso + skin senza tema: attivo', () => {
        const gs = { ...claimed, user: { vintageTheme: true } };
        expect(vintageState(gs, noTheme)).toEqual({ unlocked: true, on: true, blockedBySkin: false, active: true });
    });
    it('switch spento: non attivo, ma sbloccato', () => {
        const s = vintageState({ ...claimed, user: { vintageTheme: false } }, noTheme);
        expect(s).toMatchObject({ unlocked: true, on: false, active: false });
    });
    it('la skin con un tema suo vince: switch acceso ma tema non attivo', () => {
        const s = vintageState({ ...claimed, user: { vintageTheme: true } }, withTheme);
        expect(s).toMatchObject({ unlocked: true, on: true, blockedBySkin: true, active: false });
    });
    it('senza premio riscattato lo switch scritto a mano non vale', () => {
        expect(vintageState({ ...notClaimed, user: { vintageTheme: true } }, noTheme).active).toBe(false);
        expect(vintageState({ achievements: {}, user: { vintageTheme: true } }, noTheme).unlocked).toBe(false);
    });
    it('stati vuoti o mancanti non lanciano', () => {
        expect(vintageState(undefined, undefined).active).toBe(false);
        expect(vintageState({}, {}).active).toBe(false);
    });
});

describe('ui/theme/vintage — mascotArt', () => {
    const base = { img: 'skins/espo.webp', imgClick: 'skins/espo-click.webp' };
    const other = { img: 'skins/espo3.webp', imgClick: 'skins/espo3-click.webp' };

    it('tema attivo: la skin base mostra l\'arte v1', () => {
        expect(mascotArt(BASE_SKIN_ID, base, true)).toEqual({ img: VINTAGE_ART.img, imgClick: VINTAGE_ART.imgClick });
    });
    it('tema attivo: le altre skin tengono la propria arte', () => {
        expect(mascotArt('espo3', other, true)).toEqual(other);
    });
    it('tema spento: nessuna sostituzione', () => {
        expect(mascotArt(BASE_SKIN_ID, base, false)).toEqual(base);
    });
});

describe('ui/theme/vintage — coerenza con i dati', () => {
    it('il tema punta a un CSS che esiste e le immagini della mascotte pure', async () => {
        const { existsSync } = await import('node:fs');
        expect(existsSync(`styles/themes/${VINTAGE_THEME.cssFile}`)).toBe(true);
        expect(existsSync(`assets/image/${VINTAGE_ART.img}`)).toBe(true);
        expect(existsSync(`assets/image/${VINTAGE_ART.imgClick}`)).toBe(true);
        expect(existsSync('assets/image/ui/vintage-bg.webp')).toBe(true);
    });
    it('l\'obiettivo che sblocca lo switch esiste e regala il tema', () => {
        const a = (gameData.achievements as any)[VINTAGE_UNLOCK_ACHIEVEMENT];
        expect(a.reward).toEqual({ type: 'theme', id: 'vintage' });
        expect(a.season).toBe('birthday');
    });
    it('la skin base esiste fra i dati', () => {
        expect((gameData.skins as any)[BASE_SKIN_ID]).toBeDefined();
    });
});
