import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import { decideConflict, formatConflictTrace, CLOUD_MAX_AUTO_RESYNC, CLOUD_AUTO_RESYNC_THROTTLE_MS, type ConflictInput } from './conflict';
import { cloudBadgeText, cloudBadgeColor, cloudBadgeNeedsLogin } from './badge';
import { snapshotCloudMeta } from './snapshot';

const base: ConflictInput = {
    streak: 1, launchPhase: false, staleServer: false,
    canResync: true, resyncing: false, now: 100_000, lastAutoResyncAt: 0,
};

describe('cloud/conflict — decideConflict', () => {
    it('ordine delle uscite: lancio prima di tutto, poi cloud indietro, poi freno', () => {
        expect(decideConflict({ ...base, launchPhase: true, staleServer: true, streak: 99 }).action).toBe('ignore-launch');
        expect(decideConflict({ ...base, staleServer: true, streak: 99 }).action).toBe('stale-cloud');
        expect(decideConflict({ ...base, streak: CLOUD_MAX_AUTO_RESYNC + 1 }).action).toBe('brake');
    });
    it('il freno scatta oltre il terzo conflitto, e firstBrake solo la prima volta', () => {
        expect(decideConflict({ ...base, streak: CLOUD_MAX_AUTO_RESYNC }).action).toBe('auto-resync');
        expect(decideConflict({ ...base, streak: CLOUD_MAX_AUTO_RESYNC + 1 })).toEqual({ action: 'brake', firstBrake: true });
        expect(decideConflict({ ...base, streak: CLOUD_MAX_AUTO_RESYNC + 2 })).toEqual({ action: 'brake', firstBrake: false });
    });
    it('auto-resync solo se possibile, non già in corso e fuori dal throttle di 15 s', () => {
        expect(decideConflict({ ...base, canResync: false }).action).toBe('unsynced');
        expect(decideConflict({ ...base, resyncing: true }).action).toBe('unsynced');
        expect(decideConflict({ ...base, lastAutoResyncAt: base.now - CLOUD_AUTO_RESYNC_THROTTLE_MS }).action).toBe('unsynced');
        expect(decideConflict({ ...base, lastAutoResyncAt: base.now - CLOUD_AUTO_RESYNC_THROTTLE_MS - 1 }).action).toBe('auto-resync');
    });
});

describe('cloud/conflict — formatConflictTrace', () => {
    const sent = { score: '5000', prestige: 2, totalFormattazioni: 0, season: 1 };
    it('senza numeri del server (EF vecchia) la riga è quella della 3.1.8', () => {
        expect(formatConflictTrace({ streak: 2, message: 'Cloud save is newer (Score). Please reload.', sent, now: 0 }))
            .toBe('[Save✗ CONFLICT #2] Cloud save is newer (Score). Please reload. | inviato: score=5000 prestige=2 format=0 season=1 | nessun cloud adottato in questa sessione');
    });
    it('con server e ultimo cloud adottato riporta tutte e tre le parti', () => {
        const now = Date.parse('2026-09-30T12:00:42Z');
        const line = formatConflictTrace({
            streak: 1, message: 'm', sent, now,
            server: { score: '987654321', prestige: 7, totalFormattazioni: 1, season: 1, updatedAt: '2026-09-30T12:00:00Z' },
            adopted: { at: now - 10_000, score: '1', prestige: 0, totalFormattazioni: 0, season: 1 },
        });
        expect(line).toContain('| server: score=987654321 prestige=7 format=1 season=1 (aggiornato 42s fa)');
        expect(line).toContain('| ultimo cloud adottato 10s fa: score=1 prestige=0 format=0 season=1');
    });
});

describe('cloud/badge — testi e colori', () => {
    it('ogni stato ha il suo testo, in entrambe le lingue', () => {
        expect(cloudBadgeText('syncing', null, false)).toContain('Sincronizzazione in corso');
        expect(cloudBadgeText('ok', null, true)).toBe('✓ Progress synced');
        expect(cloudBadgeText('problem', 'conflict-loop', false)).toContain('Il cloud resta più avanti');
        expect(cloudBadgeText('problem', 'conflict', false)).toContain('tocca per sincronizzare');
        expect(cloudBadgeText('problem', 'token', false)).toContain('tocca per riprovare');
        expect(cloudBadgeText('failed', 'network', true)).toContain('No connection');
        expect(cloudBadgeText('failed', 'boh', false)).toContain('Sincronizzazione fallita');
    });
    it("'stale-cloud' è un avviso rassicurante: testo verde, mai rosso", () => {
        expect(cloudBadgeText('problem', 'stale-cloud', false)).toContain('Progressi al sicuro su questo dispositivo');
        expect(cloudBadgeColor('problem', 'stale-cloud')).toBe(cloudBadgeColor('ok'));
        expect(cloudBadgeColor('problem', 'conflict')).toBe('rgba(192,57,43,0.95)');
    });
    it('senza credenziali l\'unica azione è il login', () => {
        expect(cloudBadgeNeedsLogin('nocreds')).toBe(true);
        expect(cloudBadgeNeedsLogin('login')).toBe(true);
        expect(cloudBadgeNeedsLogin('network')).toBe(false);
    });
});

describe('cloud/snapshot — snapshotCloudMeta', () => {
    const gs = {
        lifetimeScore: new Decimal('1e400'), totalResets: 3.7, totalFormattazioni: 2, season: 1,
        skins: { current: 'frankenespo', unlocked: ['default', 'frankenespo'] },
        totalClicks: 10.9, totalPlayTime: 61.2, longestCombo: 4, totalGoldenBugsClicked: 1,
    };
    it('score è l\'espansione decimale completa, esatta oltre il range double', () => {
        const s = snapshotCloudMeta(gs, Decimal);
        expect(s.score.length).toBe(401);
        expect(s.score.startsWith('1')).toBe(true);
        expect(s.prestige).toBe(3);
        expect(s.equippedSkin).toBe('frankenespo');
        expect(s.profile).toEqual({ totalClicks: 10, totalPlayTime: 61, longestCombo: 4, totalGolden: 1, season: 1, skinsUnlocked: ['default', 'frankenespo'] });
    });
    it('score negativo → 0; season assente → 1; la lista skin è una copia', () => {
        const g2 = { ...gs, lifetimeScore: new Decimal(-5), season: undefined };
        const s = snapshotCloudMeta(g2, Decimal);
        expect(s.score).toBe('0');
        expect(s.season).toBe(1);
        s.profile.skinsUnlocked.push('x');
        expect(gs.skins.unlocked).toHaveLength(2);
    });
});
