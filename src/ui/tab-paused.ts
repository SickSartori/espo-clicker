/**
 * Avviso della guardia anti doppia scheda (app/tab-guard.ts): copre il gioco
 * nella scheda che ha ceduto il comando e offre di riprendere da qui.
 *
 * Due stati: `paused` (si gioca altrove, bottone «Gioca qui») e `resuming`
 * (ci si sta riprendendo il comando e la pagina sta per ricaricarsi).
 * Stile inline come il badge cloud: deve funzionare anche se un tema o un CSS
 * non è ancora caricato.
 */

const OVERLAY_ID = 'tab-paused-overlay';

export interface TabPausedOptions {
    isEn: boolean;
    onResume: () => void;
}

export function showTabPaused(opts: TabPausedOptions): void {
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
        el = document.createElement('div');
        el.id = OVERLAY_ID;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', OVERLAY_ID + '-title');
        el.style.cssText = 'position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;' +
            'padding:16px;background:rgba(3,6,10,0.88);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
        document.body.appendChild(el);
    }

    const box = document.createElement('div');
    box.style.cssText = 'max-width:420px;width:100%;text-align:center;color:#d6eef7;font-family:Rajdhani,system-ui,sans-serif;' +
        'background:#0a1018;border:1px solid rgba(34,211,238,0.45);border-radius:14px;padding:26px 22px;' +
        'box-shadow:0 0 32px rgba(34,211,238,0.18);';

    const title = document.createElement('div');
    title.id = OVERLAY_ID + '-title';
    title.style.cssText = 'font-size:1.35rem;font-weight:700;color:#5cf3ff;margin-bottom:8px;letter-spacing:0.5px;';
    title.textContent = opts.isEn ? 'You are playing in another tab' : 'Stai giocando in un\'altra scheda';

    const text = document.createElement('div');
    text.style.cssText = 'font-size:1rem;line-height:1.4;margin-bottom:18px;opacity:0.9;';
    text.textContent = opts.isEn
        ? 'Progress is saved there. This tab is paused so the two don\'t overwrite each other.'
        : 'I progressi si salvano lì. Questa scheda è in pausa, così le due non si sovrascrivono.';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = OVERLAY_ID + '-resume';
    btn.style.cssText = 'font:inherit;font-size:1.05rem;font-weight:700;cursor:pointer;color:#03060a;background:#22d3ee;' +
        'border:none;border-radius:10px;padding:10px 22px;min-height:44px;';
    btn.textContent = opts.isEn ? 'Play here' : 'Gioca qui';
    btn.addEventListener('click', () => opts.onResume());

    box.append(title, text, btn);
    el.replaceChildren(box);
    el.style.display = 'flex';
    try { btn.focus(); } catch (e) { /* ignore */ }
}

/** Il comando sta tornando a questa scheda: niente bottone, la pagina si ricarica. */
export function showTabResuming(isEn: boolean): void {
    const el = document.getElementById(OVERLAY_ID);
    const btn = document.getElementById(OVERLAY_ID + '-resume') as HTMLButtonElement | null;
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'default';
        btn.textContent = isEn ? 'Picking up from the other tab…' : 'Riprendo da dove eri nell\'altra scheda…';
    } else if (!el) {
        // Ripresa senza avviso già a schermo (scheda tornata visibile): basta la scritta.
        showTabPaused({ isEn, onResume: () => {} });
        showTabResuming(isEn);
    }
}
