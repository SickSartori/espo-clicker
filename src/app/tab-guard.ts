/**
 * Guardia anti doppia scheda (3.2) — una sola scheda per volta salva.
 *
 * ─── Il problema ─────────────────────────────────────────────────────────────
 * Due schede dello stesso browser condividono lo STESSO slot di salvataggio
 * locale (IndexedDB + localStorage, per origine) e lo stesso account cloud.
 * Una scheda nascosta è ferma (lo Scheduler si mette in pausa), ma quando torna
 * visibile riparte dal SUO stato, vecchio, e lo salva sopra quello più nuovo
 * dell'altra: in locale lo sovrascrive, sul cloud genera conflitti e
 * riallineamenti a catena. La 3.1.8 li FRENA (tre riallineamenti, poi badge);
 * questa guardia li PREVIENE.
 *
 * ─── La regola ───────────────────────────────────────────────────────────────
 * - Comanda l'ultima scheda che si è annunciata: all'avvio, o quando il
 *   giocatore ci torna sopra.
 * - La scheda che comandava, all'annuncio di un'altra, salva SUBITO (locale e
 *   cloud) e solo dopo risponde `released`: chi si annuncia aspetta quella
 *   risposta prima di leggere il salvataggio, così legge lo stato più nuovo.
 * - Da lì la vecchia scheda è `follower`: non salva più nulla. Per riprendere
 *   si ricarica (dopo essersi annunciata a sua volta): ricaricare è l'unico
 *   modo di adottare lo stato dell'altra senza fondere due partite diverse.
 *
 * Copre solo lo STESSO browser (BroadcastChannel è per origine): fra
 * dispositivi diversi il canale non c'è e resta il freno della 3.1.8. Senza
 * BroadcastChannel la guardia non fa niente e ogni scheda resta `leader`.
 *
 * Il canale porta la chiave di salvataggio nel nome: `/test/` e produzione
 * stanno sulla stessa origine Altervista ma su slot diversi, e non devono
 * mettersi in pausa a vicenda.
 *
 * PURO rispetto al DOM: canale, salvataggio e reazioni arrivano da fuori
 * (boot.ts), così la logica si prova con un canale finto (tab-guard.test.ts).
 */

export type TabRole = 'booting' | 'leader' | 'follower';

export interface TabChannel {
    postMessage(msg: unknown): void;
    // `any`: il BroadcastChannel vero passa un MessageEvent, il canale finto dei test un { data }.
    onmessage: ((ev: any) => void) | null;
}

export interface TabGuardDeps {
    channel: TabChannel | null;
    /** Salva adesso, in locale e sul cloud. Chiamata solo mentre si è leader. */
    flush: () => Promise<void> | void;
    /**
     * Si può salvare cedendo il comando? `claimAgeMs` = quanto è vecchio
     * l'annuncio quando lo leggiamo. Una scheda nascosta ha già salvato quando è
     * andata in secondo piano ed è ferma da allora; un annuncio vecchio vuol dire
     * che siamo stati congelati mentre l'altra giocava. In entrambi i casi il
     * nostro stato non è più nuovo del salvataggio: scriverlo lo peggiorerebbe.
     * Assente = si salva sempre.
     */
    canFlush?: (claimAgeMs: number) => boolean;
    /** Questa scheda ha appena ceduto il comando: pausa e avviso a schermo. */
    onFollower?: (info: { claimAgeMs: number }) => void;
    /**
     * Un'altra scheda ha finito di salvare DOPO che abbiamo smesso di aspettarla
     * (scheda nascosta rallentata o congelata dal browser): lo stato letto nel
     * frattempo può essere più vecchio del suo. Chiamata al massimo una volta
     * per annuncio.
     */
    onLateRelease?: () => void;
    tabId?: string;
    /** Finestra in cui aspettare che le altre schede rispondano `ack`. */
    ackWindowMs?: number;
    /** Tempo massimo per il salvataggio delle altre schede (`released`). */
    releaseTimeoutMs?: number;
    wait?: (ms: number) => Promise<void>;
    now?: () => number;
}

type Msg =
    | { t: 'claim'; from: string; nonce: string; at: number }
    | { t: 'ack' | 'released'; from: string; to: string; nonce: string };

/** PURA. Fra due annunci contemporanei vince il più recente; a pari istante, l'id maggiore. */
export function claimWins(a: { at: number; from: string }, b: { at: number; from: string }): boolean {
    return a.at !== b.at ? a.at > b.at : a.from > b.from;
}

const defaultWait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function tabChannelName(saveKey: string): string {
    return 'espo-tab-guard:' + saveKey;
}

export class TabGuard {
    readonly tabId: string;
    private role: TabRole = 'booting';
    private readonly deps: TabGuardDeps;
    private pending: { nonce: string; at: number; acks: Set<string>; released: Set<string>; yielded: boolean } | null = null;
    /** Annuncio chiuso senza tutti i `released`: se arrivano dopo, lo si dice (onLateRelease). */
    private late: { nonce: string; waiting: Set<string> } | null = null;

    constructor(deps: TabGuardDeps) {
        this.deps = deps;
        this.tabId = deps.tabId || Math.random().toString(36).slice(2) + Date.now().toString(36);
        if (deps.channel) deps.channel.onmessage = (ev) => { void this.handle(ev && ev.data); };
    }

    get currentRole(): TabRole { return this.role; }
    isFollower(): boolean { return this.role === 'follower'; }
    get enabled(): boolean { return !!this.deps.channel; }

    /**
     * Si annuncia e aspetta che le altre schede abbiano salvato. Alla fine
     * questa scheda è `leader`. Risolve subito se non c'è nessun'altra scheda
     * (nessun `ack` entro la finestra) o se il canale non esiste.
     */
    async claim(): Promise<{ others: number; released: number; yielded: boolean }> {
        const ch = this.deps.channel;
        if (!ch) { this.role = 'leader'; return { others: 0, released: 0, yielded: false }; }
        const wait = this.deps.wait || defaultWait;
        const nonce = Math.random().toString(36).slice(2);
        const at = (this.deps.now || Date.now)();
        const pending = { nonce, at, acks: new Set<string>(), released: new Set<string>(), yielded: false };
        this.pending = pending;
        this.late = null;
        ch.postMessage({ t: 'claim', from: this.tabId, nonce, at } satisfies Msg);

        await wait(this.deps.ackWindowMs ?? 250);
        if (pending.acks.size > 0) {
            const step = 50;
            let left = this.deps.releaseTimeoutMs ?? 2500;
            while (left > 0 && [...pending.acks].some((id) => !pending.released.has(id))) {
                await wait(step);
                left -= step;
            }
        }
        if (this.pending === pending) this.pending = null;
        const missing = [...pending.acks].filter((id) => !pending.released.has(id));
        this.late = missing.length > 0 && !pending.yielded ? { nonce, waiting: new Set(missing) } : null;
        // Un annuncio più recente è arrivato mentre aspettavamo: comanda l'altra.
        this.role = pending.yielded ? 'follower' : 'leader';
        if (pending.yielded && this.deps.onFollower) this.deps.onFollower({ claimAgeMs: 0 });
        return { others: pending.acks.size, released: pending.released.size, yielded: pending.yielded };
    }

    private async handle(msg: Msg | null | undefined): Promise<void> {
        if (!msg || typeof msg !== 'object' || (msg as any).from === this.tabId) return;
        const ch = this.deps.channel;
        if (!ch) return;

        if (msg.t === 'claim') {
            const p = this.pending;
            if (p) {
                // Stiamo annunciando anche noi: l'annuncio più vecchio non risponde
                // e lascia il posto, il più recente lo ignora (vince lui).
                if (!claimWins(msg, { at: p.at, from: this.tabId })) return;
                p.yielded = true;
            }
            const reply = (t: 'ack' | 'released') =>
                ch.postMessage({ t, from: this.tabId, to: msg.from, nonce: msg.nonce } satisfies Msg);
            reply('ack');
            const wasLeader = this.role === 'leader';
            const claimAgeMs = Math.max(0, (this.deps.now || Date.now)() - (Number(msg.at) || 0));
            if (wasLeader && (!this.deps.canFlush || this.deps.canFlush(claimAgeMs))) {
                // Salva PRIMA di cedere: il flush passa dalle guardie di saveGame,
                // che da follower non scriverebbe più niente.
                try { await this.deps.flush(); } catch (e) { /* si cede comunque */ }
            }
            this.role = 'follower';
            reply('released');
            if (wasLeader && this.deps.onFollower) this.deps.onFollower({ claimAgeMs });
            return;
        }

        const late = this.late;
        if (late && msg.t === 'released' && msg.to === this.tabId && msg.nonce === late.nonce && late.waiting.has(msg.from)) {
            this.late = null;
            if (this.role === 'leader' && this.deps.onLateRelease) this.deps.onLateRelease();
            return;
        }

        const p = this.pending;
        if (!p || msg.to !== this.tabId || msg.nonce !== p.nonce) return;
        if (msg.t === 'ack') p.acks.add(msg.from);
        else if (msg.t === 'released') p.released.add(msg.from);
    }
}
