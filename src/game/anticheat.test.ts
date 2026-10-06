import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import {
    ClickGuard, CLICK_CAP_PER_SEC, MACHINE_WINDOW, MACHINE_PAUSE_MS, stddev,
    capArcadeClaim, ARCADE_REWARD_RATE,
} from './anticheat';

/** Generatore pseudo-casuale deterministico (i test non devono ballare). */
function rng(seed: number) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

describe('game/anticheat — ClickGuard', () => {
    it('click umani normali (8/s, irregolari): contano tutti', () => {
        const g = new ClickGuard(); const r = rng(1); let t = 0; const out: string[] = [];
        for (let i = 0; i < 200; i++) { t += 125 + (r() - 0.5) * 60; out.push(g.accept(t)); }
        expect(out.every((v) => v === 'ok')).toBe(true);
    });

    it('butterfly clicking umano (~16/s, scarto ~15 ms): conta tutto, niente pausa', () => {
        const g = new ClickGuard(); const r = rng(7); let t = 0; const out: string[] = [];
        for (let i = 0; i < 300; i++) { t += 62 + (r() - 0.5) * 50; out.push(g.accept(t)); }
        expect(out.filter((v) => v === 'machine' || v === 'paused')).toHaveLength(0);
    });

    it('tetto: oltre 20 click nello stesso secondo, i successivi non contano', () => {
        const g = new ClickGuard(); const r = rng(3); let t = 0; const out: string[] = [];
        // 30 click irregolari in ~600 ms (troppo veloci per un umano, ma non regolari)
        for (let i = 0; i < 30; i++) { t += 10 + r() * 30; out.push(g.accept(t)); }
        expect(out.filter((v) => v === 'ok')).toHaveLength(CLICK_CAP_PER_SEC);
        expect(out.slice(CLICK_CAP_PER_SEC).every((v) => v === 'cap')).toBe(true);
        // passato il secondo si torna a contare
        expect(g.accept(t + 1000)).toBe('ok');
    });

    it('autoclicker a ritmo fisso (50 ms ± 1): rilevato dopo 30 intervalli, poi 10 s di pausa', () => {
        const g = new ClickGuard(); const r = rng(5); let t = 0; const out: string[] = [];
        for (let i = 0; i <= MACHINE_WINDOW; i++) { t += 50 + (r() - 0.5) * 2; out.push(g.accept(t)); }
        expect(out[MACHINE_WINDOW]).toBe('machine');
        expect(out.slice(0, MACHINE_WINDOW).every((v) => v === 'ok' || v === 'cap')).toBe(true);
        expect(g.accept(t + 100)).toBe('paused');
        expect(g.pauseLeft(t + 100)).toBe(MACHINE_PAUSE_MS - 100);
        expect(g.accept(t + MACHINE_PAUSE_MS)).toBe('ok');
    });

    it('un ritmo regolare ma LENTO (1 click al secondo) non è giudicato', () => {
        const g = new ClickGuard(); let t = 0; const out: string[] = [];
        for (let i = 0; i < 100; i++) { t += 1000; out.push(g.accept(t)); }
        expect(out.every((v) => v === 'ok')).toBe(true);
    });

    it('stddev: casi base', () => {
        expect(stddev([])).toBe(0);
        expect(stddev([5, 5, 5])).toBe(0);
        expect(stddev([1, 3])).toBe(1);
    });
});

describe('game/anticheat — capArcadeClaim', () => {
    it('premio normale entro il tetto: si incassa tutto', () => {
        const c = capArcadeClaim<any>(Decimal, '5000', new Decimal(100), 5)!;
        expect(c.grant.toString()).toBe('5000');
        expect(c.rest.toString()).toBe('0');
    });
    it('premio gonfiato: incassa solo il tetto, il resto resta in attesa', () => {
        const c = capArcadeClaim<any>(Decimal, '1e100', new Decimal(100), 5)!;
        expect(c.grant.toNumber()).toBe(100 * ARCADE_REWARD_RATE * 5);
        expect(c.rest.gt(new Decimal('9.99e99'))).toBe(true);
    });
    it('BPS a zero: si conta almeno 1, come fa Super Espò', () => {
        const c = capArcadeClaim<any>(Decimal, '1000000', new Decimal(0), 10)!;
        expect(c.grant.toNumber()).toBe(ARCADE_REWARD_RATE * 10);
    });
    it('numeri oltre il range double restano leggibili', () => {
        const c = capArcadeClaim<any>(Decimal, '1e400', new Decimal('1e398'), 1)!;
        expect(c.grant.eq(new Decimal('1e398').mul(ARCADE_REWARD_RATE))).toBe(true);
    });
    it('valori illeggibili, zero o negativi: scartati', () => {
        expect(capArcadeClaim(Decimal, 'abc', new Decimal(10), 5)).toBeNull();
        expect(capArcadeClaim(Decimal, '0', new Decimal(10), 5)).toBeNull();
        expect(capArcadeClaim(Decimal, '-50', new Decimal(10), 5)).toBeNull();
        expect(capArcadeClaim(Decimal, undefined, new Decimal(10), 5)).toBeNull();
    });
});
