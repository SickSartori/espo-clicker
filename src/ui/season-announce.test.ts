import { describe, it, expect } from 'vitest';
import { seasonAnnounceDue, seasonEditionYear } from './season-announce';
import { gameData } from '../data/index';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('ui/season-announce — seasonEditionYear', () => {
    it('Halloween: l\'anno è quello della data', () => {
        expect(seasonEditionYear('halloween', at(2026, 10, 30))).toBe(2026);
    });
    it('Natale: l\'8 gennaio 2027 appartiene all\'edizione 2026', () => {
        expect(seasonEditionYear('christmas', at(2026, 12, 20))).toBe(2026);
        expect(seasonEditionYear('christmas', at(2027, 1, 8))).toBe(2026);
    });
});

describe('ui/season-announce — seasonAnnounceDue', () => {
    const ach = gameData.achievements;

    it('stagione aperta e premio da riscattare: si annuncia, con la chiave dell\'edizione', () => {
        const due = seasonAnnounceDue({ achievements: {} }, ['halloween'], ach, at(2026, 10, 25));
        expect(due).toEqual({ seasonId: 'halloween', key: 'halloween-2026', achievementId: 'dolcettoScherzetto' });
        expect(seasonAnnounceDue({ achievements: {} }, ['christmas'], ach, at(2027, 1, 3)))
            .toEqual({ seasonId: 'christmas', key: 'christmas-2026', achievementId: 'natale' });
    });
    it('nessuna stagione aperta, o stagione sconosciuta: niente', () => {
        expect(seasonAnnounceDue({ achievements: {} }, [], ach, at(2026, 10, 25))).toBeNull();
        expect(seasonAnnounceDue({ achievements: {} }, ['pasqua'], ach, at(2026, 10, 25))).toBeNull();
    });
    it('premio già riscattato: non serve dirlo', () => {
        const gs = { achievements: { dolcettoScherzetto: { unlocked: true, claimed: true } } };
        expect(seasonAnnounceDue(gs, ['halloween'], ach, at(2026, 10, 25))).toBeNull();
    });
    it('sbloccato ma non riscattato: si annuncia ancora (è proprio il caso da segnalare)', () => {
        const gs = { achievements: { dolcettoScherzetto: { unlocked: true, claimed: false } } };
        expect(seasonAnnounceDue(gs, ['halloween'], ach, at(2026, 10, 25))?.seasonId).toBe('halloween');
    });
    it('già annunciata quest\'anno: no; l\'anno dopo: sì', () => {
        const gs = { achievements: {}, seasonAnnounced: { 'halloween-2026': 1 } };
        expect(seasonAnnounceDue(gs, ['halloween'], ach, at(2026, 10, 30))).toBeNull();
        expect(seasonAnnounceDue(gs, ['halloween'], ach, at(2027, 10, 25))?.key).toBe('halloween-2027');
    });
});
