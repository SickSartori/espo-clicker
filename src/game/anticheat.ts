/**
 * Anticheat lato client (3.2) — PURO: tempo e Decimal arrivano da fuori.
 *
 * Il gioco gira nel browser, quindi chi è deciso può sempre riscriversi lo
 * stato dalla console: questo modulo non pretende di fermarlo. Toglie invece
 * gli strumenti pronti all'uso, che erano i buchi veri:
 *
 *  - autoclicker esterni (click "veri" ma a ritmo da macchina) → ClickGuard;
 *  - premio della Sala Giochi gonfiato scrivendo il localStorage → capArcadeClaim.
 *
 * I click sintetici da script (isTrusted=false) e la ripetizione del tasto
 * tenuto premuto si filtrano a monte, nei listener (game/logic.ts, app/boot.ts).
 * Il controllo lato server (crescita implausibile del punteggio) è rimandato
 * alla 3.3: lì un errore bloccherebbe i salvataggi di tutti.
 */

/** Click contati al massimo in un secondo. Nessun umano li regge a lungo. */
export const CLICK_CAP_PER_SEC = 20;
/** Quanti intervalli fra click esamina la rilevazione del ritmo da macchina. */
export const MACHINE_WINDOW = 30;
/** Il ritmo si giudica solo se veloce: intervallo medio sotto questa soglia (≈ 7 click/s). */
export const MACHINE_MAX_MEAN_MS = 150;
/** Scarto quadratico degli intervalli sotto il quale il ritmo è da macchina. */
export const MACHINE_MAX_STDDEV_MS = 4;
/** Pausa dei click dopo un ritmo da macchina. */
export const MACHINE_PAUSE_MS = 10_000;

export type ClickVerdict =
    /** Click valido: si conta. */
    | 'ok'
    /** Oltre il tetto di click al secondo: non si conta, in silenzio. */
    | 'cap'
    /** Ritmo da macchina appena rilevato: parte la pausa (si avvisa una volta). */
    | 'machine'
    /** In pausa dopo un ritmo da macchina: non si conta. */
    | 'paused';

/** PURA. Scarto quadratico medio. */
export function stddev(xs: readonly number[]): number {
    if (xs.length === 0) return 0;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / xs.length);
}

/**
 * Decide se un click conta. Stato: istanti dei click accettati nell'ultimo
 * secondo (per il tetto) e degli ultimi MACHINE_WINDOW+1 click grezzi (per il
 * ritmo). I tempi vanno in millisecondi, meglio ad alta risoluzione
 * (performance.now / event.timeStamp): un autoclicker a 50 ms esatti si
 * distingue da un umano proprio sui millisecondi.
 */
export class ClickGuard {
    private accepted: number[] = [];
    private raw: number[] = [];
    private pausedUntil = 0;

    accept(t: number): ClickVerdict {
        if (t < this.pausedUntil) return 'paused';

        this.raw.push(t);
        if (this.raw.length > MACHINE_WINDOW + 1) this.raw.shift();
        if (this.raw.length === MACHINE_WINDOW + 1) {
            const gaps: number[] = [];
            for (let i = 1; i < this.raw.length; i++) gaps.push(this.raw[i]! - this.raw[i - 1]!);
            const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            if (mean < MACHINE_MAX_MEAN_MS && stddev(gaps) < MACHINE_MAX_STDDEV_MS) {
                this.pausedUntil = t + MACHINE_PAUSE_MS;
                this.raw = [];
                this.accepted = [];
                return 'machine';
            }
        }

        while (this.accepted.length && t - this.accepted[0]! >= 1000) this.accepted.shift();
        if (this.accepted.length >= CLICK_CAP_PER_SEC) return 'cap';
        this.accepted.push(t);
        return 'ok';
    }

    /** Millisecondi di pausa che restano (0 se non in pausa). */
    pauseLeft(t: number): number {
        return Math.max(0, this.pausedUntil - t);
    }
}
