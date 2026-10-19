/**
 * Avviso d'inizio evento (3.2) — «È arrivato Halloween!».
 *
 * Senza la skin dell'evento addosso, una stagione aperta non cambiava niente a
 * schermo: l'obiettivo si sbloccava un secondo dopo il caricamento (toast perso
 * sotto la pagina che compariva) e l'unico segno restava l'icona Obiettivi che
 * pulsa. Questo avviso lo dice, una volta per stagione e per anno, e porta
 * dritti agli Obiettivi.
 *
 * Quando: a gioco visibile (dopo login e intro), con qualche secondo di quiete
 * senza finestre a schermo — così si accoda a note di rilascio e popup segnala
 * invece di sovrapporsi. Solo se il premio dell'evento è ancora da riscattare.
 * Il timbro sta nel salvataggio (`gameState.seasonAnnounced`), come
 * feedbackIntroAt: viaggia col cloud e non riparte cambiando dispositivo.
 *
 * La decisione è PURA (seasonAnnounceDue); il resto tocca DOM e window.
 */
import { store } from '../state/store';
import { CALENDAR_SEASONS, ACTIVE_SEASONS, type CalendarSeasonId } from '../data/season';

const w = window as any;

/** PURA. Anno dell'edizione di una stagione: Natale 2026 copre anche l'8 gennaio 2027. */
export function seasonEditionYear(seasonId: CalendarSeasonId, date: Date): number {
    const s = CALENDAR_SEASONS[seasonId];
    const wraps = s.end.month < s.start.month;
    const month = date.getMonth() + 1;
    return wraps && month <= s.end.month ? date.getFullYear() - 1 : date.getFullYear();
}

export interface SeasonAnnounce { seasonId: CalendarSeasonId; key: string; achievementId: string }

/**
 * PURA. Quale stagione annunciare adesso, o null. Una stagione si annuncia se
 * è aperta, ha un obiettivo che regala una skin, quell'obiettivo non è ancora
 * riscattato e l'edizione di quest'anno non è già stata annunciata.
 */
export function seasonAnnounceDue(
    gs: any, active: readonly string[], achievements: Record<string, any>, date: Date,
): SeasonAnnounce | null {
    for (const id of active) {
        if (!Object.prototype.hasOwnProperty.call(CALENDAR_SEASONS, id)) continue;
        const seasonId = id as CalendarSeasonId;
        const achievementId = Object.keys(achievements).find((k) => {
            const a = achievements[k];
            return a && a.season === seasonId && a.reward && a.reward.type === 'skin';
        });
        if (!achievementId) continue;
        const st = gs && gs.achievements && gs.achievements[achievementId];
        if (st && st.claimed) continue;
        const key = seasonId + '-' + seasonEditionYear(seasonId, date);
        if (gs && gs.seasonAnnounced && gs.seasonAnnounced[key]) continue;
        return { seasonId, key, achievementId };
    }
    return null;
}

const TEXTS: Record<CalendarSeasonId, { it: [string, string]; en: [string, string]; accent: string; glow: string }> = {
    halloween: {
        it: ['🎃 È arrivato Halloween!', 'Fino al 2 novembre l\'ufficio si traveste. Il tuo primo travestimento ti aspetta negli Obiettivi: riscattalo e indossalo.'],
        en: ['🎃 Halloween is here!', 'Until November 2 the office dresses up. Your first costume is waiting in Achievements: claim it and put it on.'],
        accent: '#fb923c', glow: 'rgba(249,115,22,0.35)',
    },
    christmas: {
        it: ['🎄 È arrivato il Natale!', 'Fino all\'8 gennaio si festeggia anche in ufficio. Espo Natale ti aspetta negli Obiettivi: riscattalo e indossalo.'],
        en: ['🎄 Christmas is here!', 'Until January 8 the office celebrates too. Espo Claus is waiting in Achievements: claim it and put it on.'],
        accent: '#e74c3c', glow: 'rgba(231,76,60,0.35)',
    },
};

const OVERLAY_ID = 'season-announce-overlay';
/** Quiete richiesta prima di comparire: dopo il reveal, e senza finestre a schermo. */
const QUIET_AFTER_REVEAL_MS = 3000;
const QUIET_NO_MODAL_MS = 2500;
let _lastBusyAt = 0;

function screenIsBusy(): boolean {
    if (w.shouldShowReleaseNotesOnLoad) return true;
    if (document.getElementById('tab-paused-overlay')) return true;
    for (const id of ['christmas-overlay', 'halloween-overlay']) {
        const el = document.getElementById(id);
        if (el && getComputedStyle(el).display !== 'none') return true;
    }
    for (const m of Array.from(document.querySelectorAll('.modal-backdrop'))) {
        if (getComputedStyle(m).display !== 'none') return true;
    }
    return false;
}

/** Chiamata dal tick lento (1/s). Mostra l'avviso quando è il momento, una volta. */
export function maybeShowSeasonAnnounce(now = Date.now()): boolean {
    const gs = store.gameState;
    if (!gs || !store.gameData || document.getElementById(OVERLAY_ID)) return false;
    if (!w._gameRevealedAt || now - w._gameRevealedAt < QUIET_AFTER_REVEAL_MS) return false;
    if (document.visibilityState !== 'visible') return false;
    if (screenIsBusy()) { _lastBusyAt = now; return false; }
    if (now - _lastBusyAt < QUIET_NO_MODAL_MS) return false;

    const due = seasonAnnounceDue(gs, ACTIVE_SEASONS, store.gameData.achievements, new Date(now));
    if (!due) return false;

    // Timbro all'APERTURA (come feedbackIntroAt): un reload con l'avviso aperto
    // non deve riproporlo subito.
    gs.seasonAnnounced = Object.assign({}, gs.seasonAnnounced, { [due.key]: now });
    if (w.EspooClicker && typeof w.EspooClicker.saveGame === 'function') w.EspooClicker.saveGame();
    showSeasonAnnounce(due.seasonId, due.achievementId);
    return true;
}

// Aperti gli Obiettivi, l'obiettivo dell'evento può stare in fondo alla lista
// (sotto altri premi da ritirare): ci si scorre e lo si evidenzia un attimo.
function focusAchievementRow(achievementId: string, accent: string, glow: string) {
    const data = store.gameData && store.gameData.achievements[achievementId];
    if (!data) return;
    const row = Array.from(document.querySelectorAll('#achievement-list > *'))
        .find((r) => (r.textContent || '').indexOf(data.name) !== -1) as HTMLElement | undefined;
    if (!row) return;
    try { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { row.scrollIntoView(); }
    const prev = row.style.boxShadow;
    row.style.transition = 'box-shadow 0.3s ease';
    row.style.boxShadow = `0 0 0 2px ${accent}, 0 0 18px ${glow}`;
    setTimeout(() => { row.style.boxShadow = prev; }, 2200);
}

function showSeasonAnnounce(seasonId: CalendarSeasonId, achievementId: string): void {
    const t = TEXTS[seasonId];
    const isEn = w.APP_LANG === 'en';
    const [title, body] = isEn ? t.en : t.it;

    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', OVERLAY_ID + '-title');
    el.style.cssText = 'position:fixed;inset:0;z-index:11500;display:flex;align-items:center;justify-content:center;' +
        'padding:16px;background:rgba(3,6,10,0.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);';

    const box = document.createElement('div');
    box.style.cssText = 'max-width:440px;width:100%;text-align:center;color:#d6eef7;font-family:Rajdhani,system-ui,sans-serif;' +
        `background:#0a1018;border:1px solid ${t.accent};border-radius:14px;padding:26px 22px;box-shadow:0 0 32px ${t.glow};`;

    const h = document.createElement('div');
    h.id = OVERLAY_ID + '-title';
    h.style.cssText = `font-size:1.6rem;font-weight:700;color:${t.accent};margin-bottom:10px;`;
    h.textContent = title;

    const p = document.createElement('div');
    p.style.cssText = 'font-size:1.05rem;line-height:1.4;margin-bottom:20px;opacity:0.92;';
    p.textContent = body;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
    document.addEventListener('keydown', onKey);

    const go = document.createElement('button');
    go.type = 'button';
    go.id = OVERLAY_ID + '-go';
    go.style.cssText = `font:inherit;font-size:1.05rem;font-weight:700;cursor:pointer;color:#03060a;background:${t.accent};` +
        'border:none;border-radius:10px;padding:10px 20px;min-height:44px;';
    go.textContent = isEn ? 'Go to Achievements' : 'Vai agli Obiettivi';
    go.addEventListener('click', () => {
        close();
        const btn = document.getElementById('open-achievements-btn');
        if (btn) btn.click();
        setTimeout(() => focusAchievementRow(achievementId, t.accent, t.glow), 450);
    });

    const later = document.createElement('button');
    later.type = 'button';
    later.style.cssText = 'font:inherit;font-size:1.05rem;cursor:pointer;color:#d6eef7;background:transparent;' +
        'border:1px solid rgba(214,238,247,0.35);border-radius:10px;padding:10px 20px;min-height:44px;';
    later.textContent = isEn ? 'Later' : 'Più tardi';
    later.addEventListener('click', close);

    row.append(go, later);
    box.append(h, p, row);
    el.append(box);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    document.body.appendChild(el);
    try { go.focus(); } catch (e) { /* ignore */ }
}
