/**
 * Badge cloud-sync — lo stato di sincronizzazione detto al giocatore.
 *
 * Prima gli stati erano due e impliciti (visibile / nascosto) e l'unica via
 * d'uscita era markCloudSaved(), cioè un push cloud riuscito. Al tap non
 * cambiava nulla finché il salvataggio non andava a buon fine — e se non
 * andava, mai: da qui la segnalazione QA "clicco e non succede niente, il
 * messaggio resta fisso". Ora il ciclo è chiuso dal badge stesso:
 *   problem → syncing → ok (si nasconde da solo) | failed (dice perché)
 * La dismissione è quindi disaccoppiata dal push riuscito.
 *
 * Testi e colori sono PURI (cloudBadgeText / cloudBadgeColor). Il controllore
 * (createCloudBadge) tocca il DOM e riceve da fuori le azioni del tap: la
 * regia del salvataggio resta in app/boot.ts.
 *
 * Estratto da app/boot.ts (3.2, prima estrazione del cloud-sync). La rete che
 * lo protegge: dev/tests/e2e/cloud-badge.spec.ts e cloud-conflict-loop.spec.ts.
 */

export type CloudBadgeState = 'hidden' | 'problem' | 'syncing' | 'ok' | 'failed';

/** Esito di un tentativo di riallineamento, come lo restituiscono _resyncFromCloud / _silentTokenRefresh. */
export interface CloudAttempt { ok: boolean; reason?: string }

// Motivo tecnico -> cosa è successo, detto all'utente. Le chiavi sono gli
// esiti restituiti da _resyncFromCloud / _silentTokenRefresh.
export function cloudBadgeText(state: CloudBadgeState, reason: any, isEn: boolean): string {
    if (state === 'syncing') return isEn ? '⏳ Syncing with the cloud…' : '⏳ Sincronizzazione in corso…';
    if (state === 'ok') return isEn ? '✓ Progress synced' : '✓ Progressi sincronizzati';
    if (state === 'problem') {
        // Conflitto che non si risolve da solo: il cloud viene riadottato e
        // risulta di nuovo avanti al giro dopo. La causa è quasi sempre
        // un'altra sessione dello stesso account, e va detto: "tocca per
        // sincronizzare" da solo rimandava il giocatore nello stesso giro.
        // Classifica e salvataggio cloud disallineati: il locale è la copia buona
        // e non c'è niente da toccare. Si dice cosa succede, senza invitare a un
        // gesto che riporterebbe indietro (vedi loadCloudData, ramo 'cloud-indietro').
        if (reason === 'stale-cloud')
            return isEn ? '✓ Progress safe on this device — the leaderboard catches up shortly'
                        : '✓ Progressi al sicuro su questo dispositivo — la classifica si riallinea a breve';
        // Si dice il FATTO, non la causa. La versione precedente affermava
        // «un'altra scheda sta salvando»: per l'account T3tt3 (10/09/2026) era
        // falso — finestra unica, il cloud era avanti per un difetto nostro —
        // e mandava a caccia di una scheda che non esisteva.
        if (reason === 'conflict-loop')
            return isEn ? '⚠ The cloud stays ahead — close any other tab, then tap'
                        : '⚠ Il cloud resta più avanti — se giochi in un\'altra scheda chiudila, poi tocca';
        return reason === 'conflict'
            ? (isEn ? '⚠ Progress behind the cloud — tap to sync'
                    : '⚠ Progressi dietro al cloud — tocca per sincronizzare')
            : (isEn ? '⚠ Progress not synced — tap to retry'
                    : '⚠ Progressi non salvati — tocca per riprovare');
    }
    // failed: il motivo cambia l'azione utile, quindi va detto.
    switch (reason) {
        case 'stale-cloud':
            return isEn ? '✓ Progress safe on this device — the leaderboard catches up shortly'
                        : '✓ Progressi al sicuro su questo dispositivo — la classifica si riallinea a breve';
        case 'nocreds':
        case 'login':
            return isEn ? '⚠ Sign in again to sync — tap' : '⚠ Rifai il login per sincronizzare — tocca';
        case 'network':
            return isEn ? '⚠ No connection — tap to retry' : '⚠ Connessione assente — tocca per riprovare';
        case 'busy':
            return isEn ? '⏳ Already syncing…' : '⏳ Sincronizzazione già in corso…';
        case 'cheat':
            return isEn ? '⚠ Sync off (dev console)' : '⚠ Sync disattivata (console dev)';
        case 'noapi':
            return isEn ? '⚠ Not ready yet — tap to retry' : '⚠ Non ancora pronto — tocca per riprovare';
        default:
            return isEn ? '⚠ Sync failed — tap to retry' : '⚠ Sincronizzazione fallita — tocca per riprovare';
    }
}

export function cloudBadgeColor(state: CloudBadgeState, reason?: any): string {
    if (state === 'ok') return 'rgba(39,174,96,0.95)';
    if (state === 'syncing') return 'rgba(41,128,185,0.95)';
    // 'stale-cloud' non è un guaio del giocatore: i progressi sono salvi qui e
    // la classifica rientra da sola. Rosso allarme sarebbe una bugia.
    if (reason === 'stale-cloud') return 'rgba(39,174,96,0.95)';
    return 'rgba(192,57,43,0.95)';
}

// Senza credenziali valide non c'è niente da ritentare: l'unica azione utile
// è il login. Vale sia quando lo si sa già (motivo del badge) sia quando lo
// si scopre dall'esito, altrimenti servirebbero DUE tap — il primo per
// scoprire il motivo, il secondo per agire — che è esattamente la sensazione
// di "non succede niente" che questo rifacimento toglie.
export function cloudBadgeNeedsLogin(reason: any): boolean {
    return reason === 'nocreds' || reason === 'login';
}

export interface CloudBadgeDeps {
    isEn: () => boolean;
    /** Push immediato (ramo 'stale-cloud': l'unica mossa utile è ritentare). */
    saveGame: () => Promise<void>;
    /** Dopo il push del ramo 'stale-cloud': la classifica è ancora avanti? */
    isStaleServer: () => boolean;
    // Cercati AL MOMENTO del tocco, non alla creazione: li pubblica ui/modals
    // su window dopo l'avvio del badge. `null` = non (ancora) disponibile.
    /** Adotta il cloud autoritativo. */
    getResync: () => (() => Promise<CloudAttempt>) | null;
    /** Rinnova il token in silenzio. */
    getTokenRefresh: () => (() => Promise<CloudAttempt>) | null;
    /** Apre il modale di login. */
    getShowLogin: () => (() => void) | null;
    /** Il tocco riapre i tentativi automatici: azzera la serie di conflitti. */
    resetConflictStreak: () => void;
}

export interface CloudBadge {
    /** `false`/`true` = i due chiamanti storici (hidden / problem). */
    set(state: CloudBadgeState | boolean, reason?: any): void;
    retry(): Promise<void>;
    readonly state: CloudBadgeState;
}

export function createCloudBadge(deps: CloudBadgeDeps): CloudBadge {
    let _reason: any = null;
    let _state: CloudBadgeState = 'hidden';
    let _hideTimer: any = null;

    function goToLogin(reason: any) {
        const showLogin = deps.getShowLogin();
        if (showLogin) {
            set('hidden');
            showLogin();
            return true;
        }
        // Senza il modale di login non si può fare nulla: meglio dirlo che
        // lasciare il badge fermo su "sincronizzo…" per sempre.
        set('failed', reason);
        return false;
    }

    // Il tap sceglie l'azione in base al motivo, aspetta l'esito e lo mostra.
    async function retry() {
        if (_state === 'syncing') return;
        const wasReason = _reason;
        set('syncing');

        if (cloudBadgeNeedsLogin(wasReason)) { goToLogin(wasReason); return; }

        let res: CloudAttempt | null = null;
        try {
            // Conflitto → adotta il cloud autoritativo; altrimenti (token/rete)
            // → rinnova il token e ritenta. Il tocco è una scelta del giocatore
            // (ha chiuso l'altra scheda?): riapre anche i tentativi automatici.
            if (wasReason === 'stale-cloud') {
                // Niente da riallineare: il cloud è indietro. L'unica mossa utile è
                // ritentare il push — se nel frattempo la produzione ha superato la
                // classifica, passa e tutto rientra.
                await deps.saveGame();
                res = deps.isStaleServer() ? { ok: false, reason: 'stale-cloud' } : { ok: true, reason: 'push' };
            } else if ((wasReason === 'conflict' || wasReason === 'conflict-loop') && deps.getResync()) {
                deps.resetConflictStreak();
                res = await deps.getResync()!();
            } else if (deps.getTokenRefresh()) {
                res = await deps.getTokenRefresh()!();
            }
        } catch (e) {
            res = { ok: false, reason: 'network' };
        }

        if (res && res.ok) { set('ok'); return; }

        const reason = (res && res.reason) || 'error';
        if (cloudBadgeNeedsLogin(reason)) { goToLogin(reason); return; }
        set('failed', reason);
    }

    function set(stateIn: CloudBadgeState | boolean, reason?: any) {
        // Compatibilità con i due chiamanti storici: set(false) e set(true, reason).
        let state: CloudBadgeState;
        if (stateIn === false) state = 'hidden';
        else if (stateIn === true) state = 'problem';
        else state = stateIn;

        let badge = document.getElementById('cloud-sync-badge');
        if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }

        _state = state;
        if (state === 'hidden') {
            _reason = null;
            if (badge) badge.style.display = 'none';
            return;
        }
        // 'syncing' e 'ok' sono transitori: non sovrascrivono il motivo, che
        // serve ancora se poi il tentativo fallisce e si torna a 'problem'.
        if (state === 'problem' || state === 'failed') _reason = reason || null;

        const isEn = deps.isEn();
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'cloud-sync-badge';
            badge.style.cssText = 'position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:11000;color:#fff;font:600 12px/1.2 system-ui,sans-serif;padding:8px 14px;border-radius:20px;box-shadow:0 4px 14px rgba(0,0,0,0.45);max-width:90vw;text-align:center;';
            badge.addEventListener('click', () => { retry(); });
            document.body.appendChild(badge);
        }

        const motivoMostrato = state === 'failed' ? reason : _reason;
        badge.textContent = cloudBadgeText(state, motivoMostrato, isEn);
        badge.style.background = cloudBadgeColor(state, motivoMostrato);
        // Durante il sync il tap non deve accodare un secondo tentativo. Con
        // 'stale-cloud' non c'è nessun gesto utile: è un avviso, non un pulsante.
        badge.style.cursor = (state === 'syncing' || state === 'ok' || motivoMostrato === 'stale-cloud') ? 'default' : 'pointer';
        badge.title = _reason ? ('cloud: ' + _reason) : '';
        badge.style.display = 'block';

        // Riuscito: si toglie da solo. È il punto della segnalazione — la
        // scomparsa non dipende più da un push andato a buon fine.
        if (state === 'ok') {
            _hideTimer = setTimeout(() => set('hidden'), 2500);
        }
    }

    return {
        set,
        retry,
        get state() { return _state; },
    };
}
