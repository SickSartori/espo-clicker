import { describe, it, expect, vi } from 'vitest';
import { TabGuard, claimWins, tabChannelName, type TabChannel } from './tab-guard';

/** Bus in memoria con la semantica di BroadcastChannel: consegna asincrona, mai al mittente. */
function makeBus() {
    const rooms = new Map<string, Set<TabChannel>>();
    return (name: string): TabChannel => {
        const room = rooms.get(name) || new Set<TabChannel>();
        rooms.set(name, room);
        const ch: TabChannel = {
            onmessage: null,
            postMessage(msg: unknown) {
                const data = JSON.parse(JSON.stringify(msg)); // come structured clone
                for (const other of room) {
                    if (other === ch) continue;
                    setTimeout(() => other.onmessage && other.onmessage({ data }), 0);
                }
            },
        };
        room.add(ch);
        return ch;
    };
}

// Finestre strette per velocità, ma non troppo: con 20 ms l'ack di un'altra
// "scheda" arrivava a volte in ritardo sotto il carico dell'intera suite.
const fast = { ackWindowMs: 120, releaseTimeoutMs: 1500 };

describe('app/tab-guard', () => {
    it('scheda sola: si annuncia e comanda subito, senza aspettare nessuno', async () => {
        const open = makeBus();
        const g = new TabGuard({ channel: open('k'), flush: () => {}, ...fast });
        expect(g.currentRole).toBe('booting');
        const r = await g.claim();
        expect(r).toEqual({ others: 0, released: 0, yielded: false });
        expect(g.currentRole).toBe('leader');
    });

    it('seconda scheda: la prima salva PRIMA di cedere, la seconda aspetta quel salvataggio', async () => {
        const open = makeBus();
        const log: string[] = [];
        let followerCalls = 0;
        const a = new TabGuard({
            channel: open('k'), ...fast, tabId: 'a',
            flush: async () => { log.push('a:flush-start'); await new Promise((r) => setTimeout(r, 60)); log.push('a:flush-end'); },
            onFollower: () => { followerCalls++; },
        });
        await a.claim();
        const b = new TabGuard({ channel: open('k'), flush: () => { log.push('b:flush'); }, ...fast, tabId: 'b' });
        const r = await b.claim();
        log.push('b:claimed');

        expect(r).toMatchObject({ others: 1, released: 1, yielded: false });
        expect(log).toEqual(['a:flush-start', 'a:flush-end', 'b:claimed']);
        expect(a.currentRole).toBe('follower');
        expect(a.isFollower()).toBe(true);
        expect(b.currentRole).toBe('leader');
        expect(followerCalls).toBe(1);
    });

    it('chi è già in pausa non salva quando un\'altra scheda si annuncia', async () => {
        const open = makeBus();
        let flushes = 0;
        const a = new TabGuard({ channel: open('k'), flush: () => { flushes++; }, ...fast, tabId: 'a' });
        await a.claim();
        await new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'b' }).claim();
        expect(flushes).toBe(1);
        await new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'c' }).claim();
        expect(flushes).toBe(1); // la seconda volta 'a' era già follower
        expect(a.isFollower()).toBe(true);
    });

    it('la scheda in pausa riprende il comando annunciandosi di nuovo', async () => {
        const open = makeBus();
        const a = new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'a' });
        const b = new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'b' });
        await a.claim();
        await b.claim();
        expect(a.isFollower()).toBe(true);
        await a.claim();
        expect(a.currentRole).toBe('leader');
        expect(b.isFollower()).toBe(true);
    });

    it('annunci contemporanei: alla fine comanda una sola scheda', async () => {
        const open = makeBus();
        let t = 1000;
        const a = new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'a', now: () => t });
        const b = new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'b', now: () => t });
        await Promise.all([a.claim(), b.claim()]); // stesso istante: spareggio sull'id
        const roles = [a.currentRole, b.currentRole].sort();
        expect(roles).toEqual(['follower', 'leader']);
        expect(b.currentRole).toBe('leader');
    });

    it('un salvataggio lento non blocca per sempre: dopo il timeout si comanda comunque', async () => {
        const open = makeBus();
        const a = new TabGuard({ channel: open('k'), flush: () => new Promise(() => {}), ...fast, tabId: 'a' });
        await a.claim();
        const started = Date.now();
        const r = await new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'b' }).claim();
        expect(r.others).toBe(1);
        expect(r.released).toBe(0);
        expect(Date.now() - started).toBeGreaterThanOrEqual(fast.releaseTimeoutMs - 60);
    });

    it('salvataggio arrivato DOPO il timeout: lo si segnala una volta sola', async () => {
        const open = makeBus();
        let lateCalls = 0;
        // Margini larghi: sotto il carico dell'intera suite i timer slittano, e con
        // 150 ms il salvataggio arrivava a volte DENTRO l'attesa (test instabile).
        const a = new TabGuard({ channel: open('k'), flush: () => new Promise((r) => setTimeout(r, 600)), ...fast, releaseTimeoutMs: 50, tabId: 'a' });
        await a.claim();
        const b = new TabGuard({ channel: open('k'), flush: () => {}, ...fast, releaseTimeoutMs: 50, tabId: 'b', onLateRelease: () => { lateCalls++; } });
        const r = await b.claim();
        expect(r).toMatchObject({ others: 1, released: 0 });
        expect(lateCalls).toBe(0);
        await vi.waitFor(() => expect(lateCalls).toBe(1), { timeout: 3000, interval: 20 });
        await new Promise((res) => setTimeout(res, 100));
        expect(lateCalls).toBe(1);
    });

    it('salvataggio puntuale: nessuna segnalazione di ritardo', async () => {
        const open = makeBus();
        let lateCalls = 0;
        await new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'a' }).claim();
        await new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'b', onLateRelease: () => { lateCalls++; } }).claim();
        await new Promise((res) => setTimeout(res, 100));
        expect(lateCalls).toBe(0);
    });

    it('canFlush: una scheda nascosta o risvegliata tardi cede senza scrivere', async () => {
        const open = makeBus();
        let flushes = 0; let ages: number[] = [];
        let t = 10_000;
        const a = new TabGuard({ channel: open('k'), ...fast, tabId: 'a', now: () => t,
            flush: () => { flushes++; }, canFlush: (age) => { ages.push(age); return age < 3000; },
            onFollower: ({ claimAgeMs }) => { ages.push(-claimAgeMs); } });
        await a.claim();
        // l'annuncio di b porta at=10000, ma 'a' lo legge a t=15000: era congelata
        const b = new TabGuard({ channel: open('k'), flush: () => {}, ...fast, tabId: 'b', now: () => 10_000 });
        t = 15_000;
        const r = await b.claim();
        expect(flushes).toBe(0);
        expect(r).toMatchObject({ others: 1, released: 1 });
        expect(ages).toEqual([5000, -5000]);
        expect(a.isFollower()).toBe(true);
    });

    it('senza BroadcastChannel la guardia è spenta e la scheda comanda', async () => {
        const g = new TabGuard({ channel: null, flush: () => {} });
        expect(g.enabled).toBe(false);
        await g.claim();
        expect(g.currentRole).toBe('leader');
    });

    it('produzione e /test/ usano canali diversi: non si mettono in pausa a vicenda', async () => {
        const open = makeBus();
        expect(tabChannelName('espotoolClickerSaveV9')).not.toBe(tabChannelName('espotoolClickerSaveV9__dev'));
        const prod = new TabGuard({ channel: open(tabChannelName('espotoolClickerSaveV9')), flush: () => {}, ...fast });
        await prod.claim();
        await new TabGuard({ channel: open(tabChannelName('espotoolClickerSaveV9__dev')), flush: () => {}, ...fast }).claim();
        expect(prod.currentRole).toBe('leader');
    });

    it('claimWins: vince il più recente, a pari istante l\'id maggiore', () => {
        expect(claimWins({ at: 2, from: 'a' }, { at: 1, from: 'z' })).toBe(true);
        expect(claimWins({ at: 1, from: 'z' }, { at: 2, from: 'a' })).toBe(false);
        expect(claimWins({ at: 1, from: 'b' }, { at: 1, from: 'a' })).toBe(true);
    });
});
