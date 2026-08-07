/**
 * Boot / god-object / save-load-cloud / game-loop.
 *
 * Migrato da js/script.js (classic script) a modulo ESM — Blocco #1 kill-legacy (ultimo monolite).
 * Struttura come modals: quasi tutto il file è dentro UN `DOMContentLoaded`, quindi serve
 * `initBoot()` chiamato da main.ts (un import side-effect non basterebbe). main.ts è un modulo
 * deferred → gira PRIMA di DOMContentLoaded, quindi quando l'evento scatta il bundle legacy
 * residuo (gamestate.js + periferici) ha già ESEGUITO: stato e global sono a posto.
 *
 * ⚠️ ORDINE DEI LISTENER — CAMBIATO rispetto al legacy. Leggere prima di migrare i periferici:
 * prima `script.js` era l'ULTIMO di JS_FILES, quindi il suo handler `DOMContentLoaded` veniva
 * registrato DOPO quelli di podio/social/arcade-loader e girava per ULTIMO. Ora `initBoot()` lo
 * registra dal modulo → l'handler di boot gira PRIMA dei loro. È benigno solo perché `podio.js`
 * e `social.js` fanno `if (window.EspooClicker) init(); else <poll 50ms>`: prima prendevano il
 * ramo polling, ora prendono il ramo immediato. Quella guardia è ciò che li tiene
 * order-independent — non rimuoverla finché non sono migrati anche loro.
 *
 * I riferimenti a global legacy passano da `window.*` (alias `w`) perché un modulo strict non
 * li vede. Le assegnazioni `window.X = …` (EspooClicker, buyMultiplier, _espoScheduler, i 4
 * DOM-ref PREP) restano identiche: sono la superficie che il legacy residuo e i test consumano.
 *
 * NB: src/state/interop.ts è stato rimosso (Blocco #3, Fase C): tutti i moduli V3 leggono/scrivono
 * `store.<key>` direttamente. Il solo consumatore rimasto di accessor `window.*` bare è
 * js/cheatboard.js (dev-only), servito da state/cheatboard-bridge.ts.
 */
const w = window as any;
import { store } from '../state/store';

// --------- RIFERIMENTI HTML (Globali) ---------
let clickerButton: any, scoreDisplay: any, cpsDisplay: any, feedbackContainer: any, achievementList: any;
let toastContainer: any, goldenBug: any, soundBluescreen: any, prestigeSection: any, prestigePointsDisplay: any;
let prestigeGainDisplay: any, prestigeBonusDisplay: any, eventMultiplierDisplay: any;
let enhancementStoreSection: any, enhancementList: any, clickUpgradeList: any, leftColumn: any, rightColumn: any;
let statsList: any, gameContainer: any, prestigeStore: any;
w.buyMultiplier = 1;
let currentUserPassword: any = null;
let currentSaveToken: any = null;
let tokenExpiresAt = 0;


async function generateHash(message: any) {
    // 1. Tenta API Nativa (Veloce, richiede HTTPS o Localhost)
    if (window.crypto && window.crypto.subtle) {
        try {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn("Crypto API nativa fallita, passo al fallback JS.");
        }
    }

    // 2. Fallback JS Puro (Per connessioni HTTP non sicure)
    return sha256_fallback(message);
}
function sha256_fallback(ascii: any) {
    function rightRotate(value: any, amount: any) {
        return (value >>> amount) | (value << (32 - amount));
    }

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var i, j;
    var result = '';
    var words: any[] = [];
    var asciiBitLength = ascii.length * 8;

    var hash = (sha256_fallback as any).h = (sha256_fallback as any).h || [];
    var k = (sha256_fallback as any).k = (sha256_fallback as any).k || [];
    var primeCounter = k.length;

    var isComposite: any = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';

    for (i = 0; i < ascii.length; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return ''; // Fallback supporta solo ASCII base
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);

    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        var oldHash = hash;
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var w15 = w[i - 15], w2 = w[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0
                );
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}


export function initBoot(): void {
  document.addEventListener('DOMContentLoaded', () => {
    // --------- Assegnazione Variabili ---------
    clickerButton = document.getElementById('clicker-btn');
    scoreDisplay = document.getElementById('score-display');
    cpsDisplay = document.getElementById('cps-display');
    feedbackContainer = document.getElementById('click-feedback-container');
    achievementList = document.getElementById('achievement-list');
    toastContainer = document.getElementById('toast-container');
    goldenBug = document.getElementById('golden-bug');
    // soundBluescreen ora gestito da AudioManager (Howler.js)

    prestigeSection = document.getElementById('prestige-section');
    prestigePointsDisplay = document.getElementById('prestige-points-display');
    prestigeGainDisplay = document.getElementById('prestige-gain-display');
    prestigeBonusDisplay = document.getElementById('prestige-bonus-display');
    eventMultiplierDisplay = document.getElementById('event-multiplier-display');
    prestigeStore = document.getElementById('prestige-store');

    enhancementStoreSection = document.getElementById('enhancement-store');
    enhancementList = document.getElementById('enhancement-list');
    clickUpgradeList = document.getElementById('click-upgrade-list');

    leftColumn = document.getElementById('left-column');
    rightColumn = document.getElementById('right-column');
    statsList = document.getElementById('stats-list');
    gameContainer = document.getElementById('game-container');

    // === PREP kill-legacy: espone i DOM-ref lessicali su window (TEMPORANEO) ===
    w.goldenBug = goldenBug;
    w.feedbackContainer = feedbackContainer;
    w.toastContainer = toastContainer;
    w.statsList = statsList;

    // --------- SALVATAGGIO V9 (IndexedDB) ---------
    const SAVE_KEY = 'espotoolClickerSaveV9';
    const BACKUP_KEY = 'espotoolClickerSaveV9_Backup';

    // --------- CHECK STORAGE DISPONIBILE ---------
    (function checkStorageAvailable() {
        try {
            localStorage.setItem('__espo_test__', '1');
            localStorage.removeItem('__espo_test__');
        } catch (e) {
            // localStorage bloccato (Edge Tracking Prevention, Safari ITP, modalità privata)
            const banner = document.createElement('div');
            banner.id = 'storage-blocked-banner';
            banner.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
                'background:#c0392b', 'color:#fff', 'text-align:center',
                'padding:10px 16px', 'font-size:13px', 'line-height:1.5'
            ].join(';');
            banner.innerHTML = store.gameData.texts.system.storageBlocked +
                '<button onclick="this.parentElement.remove()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:1px solid #fff;color:#fff;padding:2px 8px;cursor:pointer;border-radius:3px;">✕</button>';
            document.body.prepend(banner);
        }
    })();

    // --- RETE DI SICUREZZA SYNC CLOUD: avviso visibile se i progressi non vengono
    //     salvati sul cloud per troppo tempo (es. token scaduto / conflitto). Puramente
    //     additivo: non cambia la logica di salvataggio, segnala soltanto. ---
    let lastCloudSaveOkAt = Date.now();
    const CLOUD_STALE_MS = 90 * 1000; // avvisa solo dopo 90s di fallimenti (niente flicker)

    function markCloudSaved() {
        lastCloudSaveOkAt = Date.now();
        w._cloudPreWipe = false; // push riuscito → il cloud ora contiene il nostro save Season 1
        _setCloudBadge(false);
    }
    function markCloudUnsynced(reason: any) {
        // Fase di lancio (cloud ancora pre-wipe): il cloud pre-lancio risulta
        // "più avanti" finché il season-wipe backend non è attivo → niente badge
        // allarmante durante questa fase (il locale, Season 1, è autoritativo).
        // _cloudPreWipe (impostato da loadCloudData al login) copre anche le
        // sessioni SUCCESSIVE alla migrazione, dove _launchMigrationDone è false.
        if (w._launchMigrationDone || w._cloudPreWipe || (store.gameState && store.gameState.pendingFounderChoice)) return;
        // Solo se loggati e il cloud è fermo da un po' (evita flash su blip transitori).
        if (!store.gameState || !store.gameState.user || !store.gameState.user.username) return;
        if (Date.now() - lastCloudSaveOkAt < CLOUD_STALE_MS) return;
        _setCloudBadge(true, reason);
    }
    // --- BADGE CLOUD: stato esplicito ---
    // Prima gli stati erano due e impliciti (visibile / nascosto) e l'unica via
    // d'uscita era markCloudSaved(), cioè un push cloud riuscito. Al tap non
    // cambiava nulla finché il salvataggio non andava a buon fine — e se non
    // andava, mai: da qui la segnalazione QA "clicco e non succede niente, il
    // messaggio resta fisso". Ora il ciclo è chiuso dal badge stesso:
    //   problem → syncing → ok (si nasconde da solo) | failed (dice perché)
    // La dismissione è quindi disaccoppiata dal push riuscito.
    type CloudBadgeState = 'hidden' | 'problem' | 'syncing' | 'ok' | 'failed';
    let _cloudBadgeReason: any = null;
    let _cloudBadgeState: CloudBadgeState = 'hidden';
    let _cloudBadgeHideTimer: any = null;

    // Motivo tecnico -> cosa è successo, detto all'utente. Le chiavi sono gli
    // esiti restituiti da _resyncFromCloud / _silentTokenRefresh.
    function _cloudBadgeText(state: CloudBadgeState, reason: any, isEn: boolean) {
        if (state === 'syncing') return isEn ? '⏳ Syncing with the cloud…' : '⏳ Sincronizzazione in corso…';
        if (state === 'ok') return isEn ? '✓ Progress synced' : '✓ Progressi sincronizzati';
        if (state === 'problem') {
            return reason === 'conflict'
                ? (isEn ? '⚠ Progress behind the cloud — tap to sync'
                        : '⚠ Progressi dietro al cloud — tocca per sincronizzare')
                : (isEn ? '⚠ Progress not synced — tap to retry'
                        : '⚠ Progressi non salvati — tocca per riprovare');
        }
        // failed: il motivo cambia l'azione utile, quindi va detto.
        switch (reason) {
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

    function _cloudBadgeColor(state: CloudBadgeState) {
        if (state === 'ok') return 'rgba(39,174,96,0.95)';
        if (state === 'syncing') return 'rgba(41,128,185,0.95)';
        return 'rgba(192,57,43,0.95)';
    }

    // Senza credenziali valide non c'è niente da ritentare: l'unica azione utile
    // è il login. Vale sia quando lo si sa già (motivo del badge) sia quando lo
    // si scopre dall'esito, altrimenti servirebbero DUE tap — il primo per
    // scoprire il motivo, il secondo per agire — che è esattamente la sensazione
    // di "non succede niente" che questo rifacimento toglie.
    function _cloudBadgeNeedsLogin(reason: any) {
        return reason === 'nocreds' || reason === 'login';
    }
    function _cloudBadgeGoToLogin(reason: any) {
        if (typeof w._showLoginForTokenExpiry === 'function') {
            _setCloudBadge('hidden');
            w._showLoginForTokenExpiry();
            return true;
        }
        // Senza il modale di login non si può fare nulla: meglio dirlo che
        // lasciare il badge fermo su "sincronizzo…" per sempre.
        _setCloudBadge('failed', reason);
        return false;
    }

    // Il tap sceglie l'azione in base al motivo, aspetta l'esito e lo mostra.
    async function _cloudBadgeRetry() {
        if (_cloudBadgeState === 'syncing') return;
        const wasReason = _cloudBadgeReason;
        _setCloudBadge('syncing');

        if (_cloudBadgeNeedsLogin(wasReason)) { _cloudBadgeGoToLogin(wasReason); return; }

        let res: any = null;
        try {
            // Conflitto → adotta il cloud autoritativo; altrimenti (token/rete)
            // → rinnova il token e ritenta.
            if (wasReason === 'conflict' && typeof w._resyncFromCloud === 'function') {
                res = await w._resyncFromCloud();
            } else if (typeof w._silentTokenRefresh === 'function') {
                res = await w._silentTokenRefresh();
            }
        } catch (e) {
            res = { ok: false, reason: 'network' };
        }

        if (res && res.ok) { _setCloudBadge('ok'); return; }

        const reason = (res && res.reason) || 'error';
        if (_cloudBadgeNeedsLogin(reason)) { _cloudBadgeGoToLogin(reason); return; }
        _setCloudBadge('failed', reason);
    }

    function _setCloudBadge(state: any, reason?: any) {
        // Compatibilità con i due chiamanti storici: _setCloudBadge(false) e
        // _setCloudBadge(true, reason).
        if (state === false) state = 'hidden';
        else if (state === true) state = 'problem';

        let badge = document.getElementById('cloud-sync-badge');
        if (_cloudBadgeHideTimer) { clearTimeout(_cloudBadgeHideTimer); _cloudBadgeHideTimer = null; }

        _cloudBadgeState = state;
        if (state === 'hidden') {
            _cloudBadgeReason = null;
            if (badge) badge.style.display = 'none';
            return;
        }
        // 'syncing' e 'ok' sono transitori: non sovrascrivono il motivo, che
        // serve ancora se poi il tentativo fallisce e si torna a 'problem'.
        if (state === 'problem' || state === 'failed') _cloudBadgeReason = reason || null;

        const isEn = w.APP_LANG === 'en';
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'cloud-sync-badge';
            badge.style.cssText = 'position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:11000;color:#fff;font:600 12px/1.2 system-ui,sans-serif;padding:8px 14px;border-radius:20px;box-shadow:0 4px 14px rgba(0,0,0,0.45);max-width:90vw;text-align:center;';
            badge.addEventListener('click', () => { _cloudBadgeRetry(); });
            document.body.appendChild(badge);
        }

        badge.textContent = _cloudBadgeText(state, state === 'failed' ? reason : _cloudBadgeReason, isEn);
        badge.style.background = _cloudBadgeColor(state);
        // Durante il sync il tap non deve accodare un secondo tentativo.
        badge.style.cursor = (state === 'syncing' || state === 'ok') ? 'default' : 'pointer';
        badge.title = _cloudBadgeReason ? ('cloud: ' + _cloudBadgeReason) : '';
        badge.style.display = 'block';

        // Riuscito: si toglie da solo. È il punto della segnalazione — la
        // scomparsa non dipende più da un push andato a buon fine.
        if (state === 'ok') {
            _cloudBadgeHideTimer = setTimeout(() => _setCloudBadge('hidden'), 2500);
        }
    }

    async function saveGame() {
        if (store.gameState.isDeleting) return;

        // Sanitizzazione
        if (isNaN(store.gameState.score) || store.gameState.score === null) store.gameState.score = 0;
        if (isNaN(store.gameState.totalScore)) store.gameState.totalScore = store.gameState.score;

        store.gameState.crunchTimeEndTime = store.crunchTimeEndTime;
        store.gameState.crunchTimeCooldownEnd = store.crunchTimeCooldownEnd;
        // Aggiorna il riferimento "ultima presenza attiva" SOLO se la tab è visibile.
        // Se aggiornato anche da tab in background, l'autosave (30s) lo faceva avanzare
        // di continuo e i guadagni offline al ritorno non maturavano mai (diff ~0).
        if (document.visibilityState === 'visible') {
            store.gameState.lastSaveTimestamp = Date.now();
        }

        // Serializza + comprimi UNA volta, riusa per IndexedDB / localStorage / cloud
        const stateJSON = JSON.stringify(store.gameState);
        // F3 → F8: la compressione (parte costosa, ~50KB+) va nel worker V3 così il
        // main thread non si impunta durante l'autosave. La SERIALIZZAZIONE resta
        // qui sopra (i Decimal vanno serializzati con la semantica del main thread).
        // Il catch ripiega sincrono su LZString se il worker fallisce a RUNTIME
        // (404/errore): resilienza runtime, non fallback "EspoV3 assente" (via in F8).
        let compressed;
        try { compressed = await window.EspoV3.workers.encodeSaveString(stateJSON); }
        catch (_) { compressed = w.LZString.compressToUTF16(stateJSON); }

        // Quota guard: warn se spazio residuo < 2x dimensione save
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const est = await navigator.storage.estimate();
                const free = (est.quota || 0) - (est.usage || 0);
                if (free > 0 && free < compressed.length * 4) {
                    console.warn('[SaveGuard] Storage quasi pieno:', free, 'bytes liberi');
                    if (w.EspooClicker) w.EspooClicker.showToast(store.gameData.texts.toasts.memoryWarn, 'warning');
                }
            } catch (_) { /* ignore */ }
        }

        try {
            // F3 → F8: scrive in IndexedDB lo STESSO payload già compresso dal
            // worker (unico snapshot per IDB/localStorage/cloud) invece di far
            // ricomprimere gameState → una compressione in meno e niente drift.
            await window.EspoV3.save.db.write(compressed);
        } catch (e: any) {
            // Filtra errori transienti tipici durante navigate/unload o tab inattivo:
            // AbortError (tx abortita), InvalidStateError (db chiuso) — il save
            // riparte automaticamente al prossimo tick, non serve allarmare l'utente.
            const transient = e && (e.name === 'AbortError' || e.name === 'InvalidStateError');
            if (!transient) {
                console.error("❌ Errore save IndexedDB:", e);
            }
            // Fallback localStorage
            try {
                localStorage.setItem(SAVE_KEY, compressed);
            } catch (fallbackErr) {
                if (w.EspooClicker) w.EspooClicker.showToast(store.gameData.texts.toasts.memoryFull, "error");
            }
        }

        // --- CLOUD: refresh PROATTIVO del token prima della scadenza (24h) ---
        // Rete di sicurezza: per un idle game tenuto aperto a lungo il token scadeva in
        // sessione e i salvataggi cloud morivano in silenzio (classifica ferma). Se manca
        // poco alla scadenza lo rinnoviamo in modo silenzioso, senza interrompere il gioco.
        // Fail-safe: se il refresh fallisce, sotto resta il controllo reattivo invariato.
        const TOKEN_REFRESH_MARGIN = 30 * 60 * 1000; // 30 min prima della scadenza
        if (tokenExpiresAt && currentSaveToken && !w._tokenRefreshing &&
            Date.now() > tokenExpiresAt - TOKEN_REFRESH_MARGIN &&
            typeof w._silentTokenRefresh === 'function') {
            w._silentTokenRefresh();
        }

        // SALVATAGGIO CLOUD SICURO — scadenza effettiva (fallback se il refresh non basta)
        if (tokenExpiresAt && Date.now() > tokenExpiresAt) {
            if (!w._tokenExpiredNotified) {
                w._tokenExpiredNotified = true;
                currentSaveToken = null;
                if (w.EspooClicker) w.EspooClicker.showToast(store.gameData.texts.toasts.sessionExpired24h, "error");
                if (w._showLoginForTokenExpiry) w._showLoginForTokenExpiry();
            }
        }
        // DEV: dopo un cheat i salvataggi sincronizzano COMUNQUE col cloud, così in dev la
        // classifica riflette lo stato accelerato durante i test (la cheatboard è dev-only →
        // in prod questo non esiste). Il vecchio guard "solo locale" è stato rimosso: a
        // impedire il revert dello scenario Endgame ci pensa il guard in _resyncFromCloud
        // (modals.js), che su cheatNoCloudSync NON si riallinea al cloud. Quindi: cheat che
        // ALZA → push accettato → classifica aggiornata; scenario che ABBASSA → push rifiutato
        // dall'anti-rollback ma NIENTE revert. Il save LOCALE è già avvenuto sopra.
        if (store.gameState.user.username && currentUserPassword && currentSaveToken) {
            try {
                let rawScore = new w.Decimal(store.gameState.lifetimeScore);
                if (rawScore.lt(0)) rawScore = new w.Decimal(0);
                let scoreToSend = rawScore.toFixed(0);
                const prestigeToSend = Math.floor(store.gameState.totalResets || 0);

                // Genera la firma usando il token dinamico
                const dataString = `${scoreToSend}-${prestigeToSend}-${currentSaveToken}`;
                const signature = await generateHash(dataString);

                const savePayload = {
                    save_token: currentSaveToken,
                    saveData: compressed,
                    score: scoreToSend,
                    prestige: prestigeToSend,
                    equippedSkin: store.gameState.skins.current,
                    totalFormattazioni: store.gameState.totalFormattazioni || 0,
                    // Stagione classifica: il lancio produzione apre la Season 1. Il
                    // backend (Edge Function) la usa per partizionare la leaderboard e
                    // far ripartire il wipe pulito senza che l'anti-rollback resusciti
                    // i punteggi pre-lancio. Campo additivo: non entra nell'hash.
                    season: store.gameState.season || 1,
                    // Snapshot pubblico per la feature Amici (statistiche + armadietto skin).
                    // Inviato in chiaro perché saveData è compresso e non leggibile lato server.
                    profile: {
                        totalClicks: Math.floor(store.gameState.totalClicks || 0),
                        totalPlayTime: Math.floor(store.gameState.totalPlayTime || 0),
                        longestCombo: Math.floor(store.gameState.longestCombo || 0),
                        totalGolden: Math.floor(store.gameState.totalGoldenBugsClicked || 0),
                        season: store.gameState.season || 1,
                        skinsUnlocked: (store.gameState.skins && Array.isArray(store.gameState.skins.unlocked)) ? store.gameState.skins.unlocked : []
                    },
                    hash: signature
                };

                await w.EspoBackend.call('save-progress', savePayload, { keepalive: true })
                    .then((response: any) => response.json())
                    .then((data: any) => {
                        if (data.status === 'success') {
                            console.log(`[Save✓] score=${scoreToSend} prestige=${prestigeToSend} format=${savePayload.totalFormattazioni}`);
                            markCloudSaved();
                        } else if (data.status === 'token_expired') {
                            console.warn(`[Save✗ TOKEN EXPIRED] ${data.message}`);
                            currentSaveToken = null;
                            markCloudUnsynced('token');
                            if (!w._tokenExpiredNotified) {
                                w._tokenExpiredNotified = true;
                                w.EspooClicker.showToast(store.gameData.texts.toasts.sessionExpired24h, "error");
                                if (w._showLoginForTokenExpiry) w._showLoginForTokenExpiry();
                            }
                        } else if (data.status === 'conflict') {
                            console.warn(`[Save✗ CONFLICT] ${data.message} | sent: score=${scoreToSend} prestige=${prestigeToSend}`);
                            // LANCIO: durante la fase pre-wipe il cloud pre-lancio è "più
                            // avanti" solo perché il season-wipe backend non è ancora attivo.
                            // NON riallineare (perderemmo la migrazione) e NON allarmare: il
                            // locale è autoritativo, il push riuscirà a wipe avvenuto.
                            if (w._launchMigrationDone || w._cloudPreWipe || (store.gameState && store.gameState.pendingFounderChoice)) {
                                console.warn('[Cloud] Conflitto ignorato in fase di lancio (Season 1 autoritativa lato client).');
                            } else {
                                // Auto-recovery SILENZIOSA: il cloud è più avanti (anti-rollback
                                // Format>Prestige>Score) quindi lo adottiamo come autoritativo da
                                // solo, senza chiedere nulla (prima serviva tap sul badge / reload).
                                // Throttle 15s = niente loop se due dispositivi salvano in contesa;
                                // se l'auto-resync è già in corso o appena fatto, mostro il badge.
                                const _nowCf = Date.now();
                                if (typeof w._resyncFromCloud === 'function' && !w._resyncing &&
                                    _nowCf - (w._lastAutoResyncAt || 0) > 15000) {
                                    w._lastAutoResyncAt = _nowCf;
                                    console.log('[Cloud] Conflitto → auto-resync dal cloud (autoritativo)…');
                                    w._resyncFromCloud();
                                } else {
                                    markCloudUnsynced('conflict');
                                }
                            }
                        } else if (data.status === 'warning') {
                            console.warn(`[Save✗ WARNING] ${data.message}`);
                            // Hash/integrità: il token client non combacia col server. Auto:
                            // rinnovo il token in silenzio e ritento al prossimo save (niente
                            // "ricarica la pagina"). Fallback badge se il refresh è già in corso.
                            if (typeof w._silentTokenRefresh === 'function' && !w._tokenRefreshing) {
                                console.log('[Cloud] Integrità token → auto-refresh silenzioso…');
                                w._silentTokenRefresh();
                            } else {
                                markCloudUnsynced('warning');
                            }
                        } else {
                            console.warn(`[Save✗] status=${data.status} msg=${data.message}`);
                            markCloudUnsynced('error');
                        }
                    })
                    .catch((err: any) => { console.warn("[Save✗ NETWORK]", err); markCloudUnsynced('network'); });
            } catch (e) {
                console.error("[Save✗ HASH]", e);
            }
        } else {
            console.warn(`[Save SKIP] user=${!!store.gameState.user.username} pass=${!!currentUserPassword} token=${!!currentSaveToken}`);
        }
    }

    // --- FUNZIONE CHECK OFFLINE ---
    function checkOfflineProgress() {
        const modal = document.getElementById('offline-modal');

        if (!store.gameState.lastSaveTimestamp) {
            if (modal) modal.classList.add("modal_backdrop_none");
            return;
        }

        const now = Date.now();
        const diffSeconds = Math.floor((now - store.gameState.lastSaveTimestamp) / 1000);
        const maxOfflineSeconds = 43200;
        const effectiveSeconds = Math.min(diffSeconds, maxOfflineSeconds);

        if (effectiveSeconds > 60) {

            // --- CALCOLO EFFICIENZA ---
            let efficiency = 0.30; // Base 30%

            // Controllo di sicurezza per evitare crash se l'upgrade non è ancora nel save
            if (store.gameState.prestigeUpgrades &&
                store.gameState.prestigeUpgrades.serverAlwaysOn &&
                store.gameData.prestigeUpgrades &&
                store.gameData.prestigeUpgrades.serverAlwaysOn) {
                efficiency += (store.gameState.prestigeUpgrades.serverAlwaysOn.count * 0.10);
            }

            if (efficiency > 1.0) efficiency = 1.0; // Cap a 100%

            // Mostra il modale o nasconde il backdrop — usato da entrambi i percorsi
            const finish = (realEarned: any) => {
                if (realEarned.gt(0)) {
                    showOfflineModal(realEarned, efficiency);
                    return;
                }
                if (modal) modal.classList.add("modal_backdrop_none");
            };

            // F3 → F8: calcolo nel worker V3 (bps come STRINGA: a endgame supera
            // il range double, come number diventerebbe Infinity). Il gating
            // (>60s, cap 12h, efficienza) resta qui: al worker passiamo già i
            // secondi effettivi → stessa formula bps.mul(sec).mul(eff). Il .catch
            // ripiega sul calcolo sincrono se il worker fallisce a runtime.
            window.EspoV3.workers.computeOffline({
                bps: String(store.bps),
                awayMs: effectiveSeconds * 1000,
                maxSeconds: maxOfflineSeconds,
                efficiency: efficiency,
            })
                .then(res => finish(new w.Decimal(res.earned)))
                .catch(() => finish(store.bps.mul(effectiveSeconds).mul(efficiency)));
            return;
        }
        if (modal) modal.classList.add("modal_backdrop_none");
    }

    // Funzione Helper per il controllo versione
    // Funzione Helper per il controllo versione
    function checkSaveCompatibility(savedData: any) {
        if (!w.GAME_VERSION) return true;

        // 1. Salvataggi corrotti o senza versione -> Incompatibili
        if (!savedData || !savedData.version) {
            console.warn("Save: Versione mancante. Reset richiesto.");
            return false;
        }

        const current = w.GAME_VERSION;
        const saved = savedData.version;

        // 2. Se il gioco è in versione STABLE, accettiamo le vecchie major version.
        // Questo permette al 'deepMerge' di unire i vecchi dati con le nuove strutture
        // senza cancellare i progressi dei giocatori.
        if (current.stage === 'stable' || !current.stage) {
            if (saved.major !== current.major) {
                console.info(`Migrazione Major: Save v${saved.major} -> Game v${current.major} (Stable). Permessa.`);
            }
            return true;
        }

        // 3. Se siamo in BETA (dev), manteniamo il controllo rigoroso: 
        // se la major cambia, rompe tutto -> Reset forzato per test.
        if (saved.major !== current.major) {
            console.warn(`Mismatch Major: Save v${saved.major} vs Game v${current.major} (Beta). Reset Forzato.`);
            return false;
        }

        return true;
    }

    // Release notes: true se il salvataggio è di una versione PRECEDENTE (major.minor)
    // a quella corrente → vanno mostrate le novità. Helper unico usato sia dal load
    // locale (loadGame) sia da quello cloud (loadCloudData) per non duplicare il confronto.
    function shouldShowReleaseNotesFor(savedVersion: any) {
        if (!savedVersion || !w.GAME_VERSION) return false;
        const oldMajor = savedVersion.major || 0;
        const oldMinor = savedVersion.minor || 0;
        return oldMajor < w.GAME_VERSION.major ||
            (oldMajor === w.GAME_VERSION.major && oldMinor < w.GAME_VERSION.minor);
    }

    // Onboarding audio del passaggio alla V3: vale SOLO per chi arriva da un save
    // pre-3.0 (major < 3), NON a ogni nuova versione.
    //
    // Prima era agganciato a shouldShowReleaseNotesFor(), che è vero anche solo con
    // la minor più bassa: al primo bump di minor (3.0 → 3.1) sarebbe riscattato per
    // TUTTI i giocatori 3.0.x, riaccendendo l'audio a chi l'aveva mutato di proposito
    // e soprattutto riportando bgMusicSelection a 'sound-bg-music-v3' sopra la traccia
    // scelta dall'utente (l'unica riga qui sotto senza guardia "se non impostato").
    // Le release notes invece DEVONO continuare a comparire a ogni minor: i due criteri
    // sono diversi e vanno tenuti separati.
    function shouldApplyV3AudioOnboardingFor(savedVersion: any) {
        if (!savedVersion || !w.GAME_VERSION) return false;
        return (savedVersion.major || 0) < 3;
    }

    // Onboarding audio "passaggio alla V3": eseguito UNA volta per chi viene da pre-3.0.
    // Forza l'audio udibile anche se l'utente aveva mutato e imposta la musica di
    // sfondo V3 come traccia attiva (sovrascrive la scelta precedente, una volta).
    // Da qui in poi ogni modifica dell'utente viene salvata normalmente.
    function applyV3AudioOnboarding() {
        if (!store.gameState || !store.gameState.user) return;
        const u = store.gameState.user;
        if (!(u.masterVolume > 0)) u.masterVolume = store.gameState.lastVolume || 1.0;
        if (!(u.musicVolume > 0)) u.musicVolume = 0.5;
        if (!(u.sfxVolume > 0)) u.sfxVolume = 1.0;
        u.bgMusicSelection = 'sound-bg-music-v3';
    }

    // === LANCIO PRODUZIONE: orchestratore migrazione Season 1 / Fondatore ===
    // Clona il pattern V1→V2: calcola il salvage via migrate() (puro), poi
    // resetGameToDefault() e reinietta SOLO identità/preferenze. L'economia e gli
    // achievement si azzerano ("tutti in partenza"); i Fondatori (save pre-lancio
    // con progresso reale) ricevono la skin `founder` e salvano fino a 5 skin
    // (scelta rimandata al modale). Idempotente per sessione via _launchMigrationDone.
    function applyLaunchMigration(sourceState: any, origin: string) {
        w._launchMigrationDone = true;

        const migrated = window.EspoV3.migrations.migrate(Object.assign({}, sourceState));
        const m: any = (migrated && migrated.state) || {};
        const report: any = migrated && migrated.report;
        const founder = !!(report && report.founderReward);
        const salvageable: string[] = (report && Array.isArray(report.salvageableSkins))
            ? report.salvageableSkins.filter((s: string) => s && s !== 'default')
            : [];

        // Identità/preferenze da preservare (lette PRIMA del reset)
        const oldUser = sourceState.user || {};
        const oldCurrent = (sourceState.skins && sourceState.skins.current) || 'default';
        const sessionUser = sessionStorage.getItem('espooUser');

        console.log(`🚀 Lancio → Season 1 (${origin}). Fondatore=${founder}, skin salvabili=${salvageable.length}`);

        // Reset pulito (economia + achievement azzerati)
        if (typeof w.resetGameToDefault === 'function') w.resetGameToDefault();

        // Reinietta identità e preferenze audio
        if (oldUser.username) store.gameState.user.username = oldUser.username;
        if (sessionUser) store.gameState.user.username = sessionUser;
        // Volume MASTER: NON reiniettato di proposito. Al lancio riparte al nuovo default
        // (1.0), come per un giocatore nuovo. Reiniettando il vecchio valore, i migranti
        // col default 2.x (0.8 — la stragrande maggioranza, che non l'ha mai toccato)
        // resterebbero più bassi dei nuovi: la lamentela "è tutto troppo basso". Il lancio
        // è già un reset pieno (economia, skin, traccia audio), quindi anche il master
        // riparte pulito; chi vuole abbassarlo lo fa dalle impostazioni.
        if (typeof oldUser.musicVolume === 'number') store.gameState.user.musicVolume = oldUser.musicVolume;
        if (typeof oldUser.sfxVolume === 'number') store.gameState.user.sfxVolume = oldUser.sfxVolume;
        if (oldUser.bgMusicSelection) store.gameState.user.bgMusicSelection = oldUser.bgMusicSelection;

        // Onboarding audio del lancio. Va richiamato QUI e non solo dai due call-site
        // storici (localShowRN / cloudShowRN), perché NESSUNO dei due copre la migrazione:
        //  - percorso cloud: applyLaunchMigration() esce con `return` molto prima del
        //    blocco `if (cloudShowRN)` in fondo a loadCloudData;
        //  - percorso locale: un save pre-lancio può già dichiarare version 3.0 (è lo
        //    SCHEMA a essere vecchio, non il numero di versione), e allora
        //    shouldShowReleaseNotesFor() risponde false.
        // Effetto del buco: chi arrivava dalla 2.x con l'audio mutato restava mutato e
        // con la vecchia traccia. Sovrascrive di proposito le preferenze appena
        // reiniettate qui sopra: è il "forza audio al primo avvio della 3.0".
        applyV3AudioOnboarding();

        // Season 1 + versione corrente
        store.gameState.schemaVersion = 3;
        // Marker PERSISTITO (≠ _launchMigrationDone, che vive solo questa sessione):
        // nelle sessioni successive dice a loadCloudData che il locale è un Season 1
        // REALE — anche i nuovi giocatori nascono schemaVersion 3, quindi lo schema
        // da solo non basta a distinguere "già migrato" da "dispositivo nuovo".
        store.gameState.launchMigrated = true;
        store.gameState.season = (m && m.season) || 1;
        if (w.GAME_VERSION) store.gameState.version = JSON.parse(JSON.stringify(w.GAME_VERSION));

        // Skin: default + (founder) + fino a 5 salvate
        const kept: string[] = ['default'];
        if (founder) {
            kept.push('founder');
            store.gameState.isFounder = true;
            store.gameState.foundedAt = (m && m.foundedAt) || 0;

            if (salvageable.length <= 5) {
                // ≤5: le tiene tutte in automatico (nessun picker)
                salvageable.forEach((s) => { if (!kept.includes(s)) kept.push(s); });
            } else {
                // >5: scelta interattiva rimandata al modale (picker max 5)
                store.gameState.pendingFounderChoice = true;
                store.gameState.founderCandidateSkins = salvageable.slice();
            }
        }
        store.gameState.skins.unlocked = kept;
        store.gameState.skins.current = kept.includes(oldCurrent) ? oldCurrent : (founder ? 'founder' : 'default');

        // Cascade modale Season 1. Niente release notes in automatico in fase di
        // lancio: il modale di lancio già racconta tutto (Season 1 + Fondatore) e
        // le RN si accavallerebbero allo skin-picker. Restano apribili dal menu Aiuto.
        w.triggerLaunchMigrationModal = true;

        // Visuals + ricalcoli + persistenza immediata
        if (typeof w.applySkinVisuals === 'function') w.applySkinVisuals(store.gameState.skins.current);
        if (typeof w.calculatePrestigeBonus === 'function') w.calculatePrestigeBonus();
        if (typeof w.recalculateCPS === 'function') w.recalculateCPS();
        if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
        if (typeof w.updateUI === 'function') w.updateUI();

        // Applica l'audio SUBITO, non solo nello stato salvato. Nel percorso cloud la
        // migrazione salta la ri-sincronizzazione di fine loadCloudData
        // (updateAmbientVolume + updateAmbience + tryStartAudio): senza queste righe il
        // volume forzato qui sopra resterebbe scritto nel save ma inudibile fino a un F5.
        if (typeof w.updateAmbientVolume === 'function') w.updateAmbientVolume();
        if (typeof w.AudioManager !== 'undefined') w.AudioManager.updateAmbience();
        if (w.EspooClicker && typeof w.EspooClicker.tryStartAudio === 'function') w.EspooClicker.tryStartAudio();
        if (w.EspooClicker && typeof w.EspooClicker.updateMuteButton === 'function') w.EspooClicker.updateMuteButton();

        saveGame();
        try { localStorage.setItem(SAVE_KEY, w.LZString.compressToUTF16(JSON.stringify(store.gameState))); } catch (_) { /* ignore */ }
    }

    async function loadGame() {
        // Carica da IndexedDB V9
        let savedState = await w.SaveDB.loadFromIndexedDB();
        let loadedFromBackup = false;

        // Fallback localStorage V9
        if (!savedState) {
            savedState = localStorage.getItem(SAVE_KEY);
        }

        // Fallback backup
        if (!savedState) {
            savedState = localStorage.getItem(BACKUP_KEY);
            if (savedState) {
                loadedFromBackup = true;
                console.warn("⚠️ Main save non trovato. Caricamento dal BACKUP.");
            }
        }

        if (savedState) {
            // Marca che un salvataggio esisteva (usato per il default filtro store dei nuovi giocatori)
            w._espoHadSave = true;
            try {
                let parsedState = null;

                // Decompressione se da localStorage
                if (typeof savedState === 'string') {
                    const decompressed = w.LZString.decompressFromUTF16(savedState);
                    if (decompressed && (decompressed.startsWith('{') || decompressed.startsWith('['))) {
                        try {
                            parsedState = JSON.parse(decompressed);
                        } catch (e) {
                            console.warn("Dati decompressi corrotti, tento parsing diretto.");
                        }
                    }
                    if (!parsedState) {
                        try {
                            parsedState = JSON.parse(savedState);
                        } catch (e) {
                            throw new Error("Impossibile parsare il salvataggio.");
                        }
                    }
                } else {
                    // IndexedDB ritorna già oggetto parsed
                    parsedState = savedState;
                }

                // 1. PRIMA COSA: flag Release Notes dal confronto versione del save LOCALE
                const localShowRN = !!(parsedState && shouldShowReleaseNotesFor(parsedState.version));
                if (localShowRN) {
                    w.shouldShowReleaseNotesOnLoad = true;
                }
                // Letto QUI, prima che gameState.version venga riscritto con la versione
                // corrente più in basso: dopo non sarebbe più distinguibile da dove si viene.
                const localV3Audio = !!(parsedState && shouldApplyV3AudioOnboardingFor(parsedState.version));

                // === LANCIO PRODUZIONE: migrazione Season 1 / Fondatore (locale) ===
                // Un save pre-lancio (schemaVersion < 3) viene azzerato a Season 1 e,
                // se idoneo, premiato come Fondatore. Salta il merge/compat sottostante.
                let launchMigrated = false;
                const _localSchema = Number(parsedState && parsedState.schemaVersion) || 1;
                if (parsedState && _localSchema < 3 && !w._launchMigrationDone) {
                    applyLaunchMigration(parsedState, 'locale');
                    launchMigrated = true;
                }

                if (!launchMigrated) {
                // --- CONTROLLO COMPATIBILITÀ VERSIONE ---
                if (!checkSaveCompatibility(parsedState)) {
                    console.warn("⚠️ Reset forzato per incompatibilità versione.");

                    // 1. Backup di sicurezza
                    try {
                        localStorage.setItem(BACKUP_KEY + "_Legacy", savedState);
                    } catch (e) { }

                    // 2. Resetta la cache
                    if (typeof w.resetGameToDefault === 'function') {
                        w.resetGameToDefault();
                    }

                    // 3. AGGIORNA LA VERSIONE IN MEMORIA (Cruciale)
                    if (w.GAME_VERSION) {
                        store.gameState.version = JSON.parse(JSON.stringify(w.GAME_VERSION));
                    }

                    // 4. SCRITTURA FORZATA SU DISCO
                    // Scriviamo subito il file pulito, così al prossimo F5 è valido.
                    try {
                        const newStateJSON = JSON.stringify(store.gameState);
                        const newCompressed = w.LZString.compressToUTF16(newStateJSON);
                        localStorage.setItem(SAVE_KEY, newCompressed);
                        console.log("✅ File di salvataggio resettato e scritto su disco.");
                    } catch (e) {
                        console.error("❌ Errore scrittura reset:", e);
                    }

                    // 5. Avvisa l'utente una volta sola
                    setTimeout(() => {
                        if (w.EspooClicker) {
                            w.EspooClicker.showToast("Dati migrati alla nuova versione!", 'warning');
                        }
                    }, 1000);

                }
                else {
                    // --- MERGE DEI DATI ---
                    if (parsedState.buildings && !parsedState.teams) {
                        parsedState.teams = parsedState.buildings;
                        delete parsedState.buildings;
                    }

                    deepMerge(store.gameState, parsedState);

                    const decimalFields = [
                        'score',
                        'totalScore',
                        'lifetimeScore',
                        'totalOfflineScore',
                        'prestigePoints',
                        'lifetimePrestigePoints',
                        'baseClickValue',
                        'qBits',
                        'lifetimeQBits'
                    ];

                    decimalFields.forEach(field => {
                        let val = store.gameState[field];

                        // Se il valore è mancante, usa 0
                        if (val === undefined || val === null) {
                            store.gameState[field] = new w.Decimal(0);
                        } else {
                            // Se è un oggetto puro (dal JSON) che ha mantissa ed esponente,
                            // break_infinity v2 a volte preferisce che venga ricreato pulito.
                            try {
                                store.gameState[field] = new w.Decimal(val);
                            } catch (e) {
                                console.warn(`Errore ripristino campo ${field}, reset a 0.`, e);
                                store.gameState[field] = new w.Decimal(0);
                            }
                        }
                    });

                    if (store.gameState.baseClickValue.eq(0)) store.gameState.baseClickValue = new w.Decimal(1);
                }
                } // fine if(!launchMigrated): la migrazione lancio salta merge/compat

                // Se abbiamo caricato un backup, notifichiamo l'utente e ripariamo il main slot
                if (loadedFromBackup) {
                    setTimeout(() => {
                        if (w.EspooClicker)
                            w.EspooClicker.showToast(store.gameData.texts.toasts.backupRestored, "warning");
                    }, 1000);

                    saveGame(); // Salva subito nel main slot per rigenerarlo
                }

                // --- INIZIALIZZAZIONE STRUTTURE MANCANTI ---

                // Aggiorna versione save alla versione attuale del codice
                if (w.GAME_VERSION) {
                    store.gameState.version =
                    {
                        major: w.GAME_VERSION.major,
                        minor: w.GAME_VERSION.minor,
                        stage: w.GAME_VERSION.stage
                    };
                }

                // Onboarding audio one-time per chi arriva da un save pre-3.0 (save locale).
                if (localV3Audio) applyV3AudioOnboarding();

                // Inizializza Enhancements
                if (!store.gameState.buildingEnhancements) store.gameState.buildingEnhancements = {};

                for (const key in store.gameData.buildingEnhancements) {
                    if (!store.gameState.buildingEnhancements[key])
                        store.gameState.buildingEnhancements[key] = { purchased: false };
                }

                // Inizializza Click Upgrades
                if (!store.gameState.clickUpgrades) store.gameState.clickUpgrades = {};

                for (const key in store.gameData.clickUpgrades) {
                    if (!store.gameState.clickUpgrades[key])
                        store.gameState.clickUpgrades[key] = { purchased: false };
                }

                // Inizializza Prestige Upgrades
                if (!store.gameState.prestigeUpgrades) store.gameState.prestigeUpgrades = {};

                for (const key in store.gameData.prestigeUpgrades) {
                    if (!store.gameState.prestigeUpgrades[key]) {
                        const isCounted = store.gameData.prestigeUpgrades[key].isCounted;
                        store.gameState.prestigeUpgrades[key] = isCounted ? { count: 0 } : { purchased: false };
                    }
                }

                // Variabili Temporali
                if (store.gameState.crunchTimeEndTime) store.crunchTimeEndTime = store.gameState.crunchTimeEndTime;
                if (store.gameState.crunchTimeCooldownEnd) store.crunchTimeCooldownEnd = store.gameState.crunchTimeCooldownEnd;

                // Prestige Points Lifetime
                if (store.gameState.lifetimePrestigePoints === undefined || store.gameState.lifetimePrestigePoints === null)
                    store.gameState.lifetimePrestigePoints = store.gameState.prestigePoints;

                // Filtri
                if (!store.gameState.filterSettings)
                    store.gameState.filterSettings = { globalFilter: 'available' };

                // Achievements
                if (store.gameData.achievements) {
                    if (!store.gameState.achievements) store.gameState.achievements = {};

                    for (const key in store.gameData.achievements) {
                        if (!store.gameState.achievements[key])
                            store.gameState.achievements[key] = { unlocked: false, claimed: false };
                    }
                }

                // Applicazione Skin Visiva
                if (store.gameState.skins && store.gameState.skins.current)
                    if (typeof w.applySkinVisuals === 'function')
                        w.applySkinVisuals(store.gameState.skins.current);
            }
            catch (e) {
                console.error("❌ Errore critico in loadGame:", e);

                // TENTATIVO DISPERATO: Se il main è corrotto e non abbiamo ancora provato il backup
                if (!loadedFromBackup) {
                    console.log("Il salvataggio principale è corrotto. Tento il backup...");
                    const backupState = localStorage.getItem(BACKUP_KEY);

                    if (backupState) {
                        try {
                            const decompBackup = w.LZString.decompressFromUTF16(backupState);
                            const parsedBackup = JSON.parse(decompBackup);
                            deepMerge(store.gameState, parsedBackup);

                            setTimeout(() => {
                                if (w.EspooClicker) w.EspooClicker.showToast(store.gameData.texts.toasts.fileCorrupt, "error");
                            }, 1000);

                            // Ripariamo il file principale
                            saveGame();

                            // Rilanciamo la funzione di caricamento per applicare le logiche (skins, ecc)
                            // Nota: Evitiamo ricorsione infinita grazie al fatto che ora lo stato è in memoria
                        }
                        catch (bkErr) {
                            console.error("Anche il backup è inutilizzabile.", bkErr);
                        }
                    }
                }
            }
        }

        // Recupero Username Legacy (se presente in vecchie versioni localStorage)
        const legacyUsername = localStorage.getItem('espooClickerUsername');

        if (legacyUsername && (!store.gameState.user.username || store.gameState.user.username === 'Giocatore'))
            store.gameState.user.username = legacyUsername;

        // RICALCOLO EFFETTI E STATISTICHE
        if (typeof w.reapplyAllEffects === 'function')
            w.reapplyAllEffects();

        // Ricalcolo Bonus Prestigio e BPS
        w.calculatePrestigeBonus();
        w.recalculateCPS();

        for (const key in store.gameData.achievements) {
            const achData = store.gameData.achievements[key];
            const achState = store.gameState.achievements[key];

            if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                const skinId = achData.reward.id || achData.reward.value;

                if (store.gameState.skins.unlocked && !store.gameState.skins.unlocked.includes(skinId)) {
                    // console.log(`[Auto-Fix] Recuperata skin mancante: ${skinId}`);
                    store.gameState.skins.unlocked.push(skinId);
                }
            }
        }

        // I passivi 'hacking' (goldenBugChance x2) e 'ticketPremium' (goldenBugSpawnTime x0.5)
        // sono GIÀ applicati da reapplyAllEffects() qui sopra (effetti trigger:'passive').
        // Rimossa la riapplicazione manuale che raddoppiava l'effetto a ogni reload.

        if (store.bps.lt(0)) store.bps = new w.Decimal(0);

        // loadGame è async: l'init dell'icona del quick-mute (in initializeGame) può
        // girare prima che il salvataggio sia applicato a gameState. Risincronizziamo
        // qui in modo che l'icona rifletta il masterVolume effettivamente caricato.
        updateMuteButton();

        // Stesso motivo: i negozi vengono renderizzati in initializeGame con lo stato
        // di DEFAULT (es. totalClicks=0), quindi i potenziamenti click apparivano
        // bloccati "0/10" anche con click già fatti. Ri-renderizziamo col save caricato.
        if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
    }

    function deepMerge(target: any, source: any) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {}; // Crea l'oggetto se manca
                    deepMerge(target[key], source[key]);
                }
                else
                    target[key] = source[key];
            }
        }
    }

    function showOfflineModal(amount: any, efficiency: any) {
        const modal = document.getElementById('offline-modal');
        const displayAmount = document.getElementById('offline-earnings-display')!;
        const displayEff = document.getElementById('offline-efficiency-display')!;
        const btn = document.getElementById('btn-claim-offline')!;

        if (!modal) return;

        // Formatta i testi
        displayAmount.textContent = w.formatNumber(amount);
        displayEff.textContent = (efficiency * 100).toFixed(0) + "%";

        // Setup Bottone
        const claimHandler = () => {
            // Aggiungi i punti
            store.gameState.score = store.gameState.score.add(amount);
            store.gameState.totalScore = store.gameState.totalScore.add(amount);
            store.gameState.lifetimeScore = store.gameState.lifetimeScore.add(amount);

            // Per totalOfflineScore, assicurati che sia inizializzato come Decimal prima:
            if (!store.gameState.totalOfflineScore) store.gameState.totalOfflineScore = new w.Decimal(0);
            store.gameState.totalOfflineScore = store.gameState.totalOfflineScore.add(amount);

            // Chiudi modale
            modal.classList.add("modal_backdrop_none");

            // Salva e Feedback
            w.EspooClicker.saveGame();
            w.updateUI();
            w.EspooClicker.showToast(store.gameData.texts.toasts.offlineClaim.replace('{amount}', w.formatNumber(amount)), 'success');
            w.EspooClicker.playSound('sound-buy');

            // Rimuovi listener per pulizia
            btn.removeEventListener('click', claimHandler);
        };

        // Rimuovi vecchi listener clonando il nodo (hack veloce per pulire eventi anonimi precedenti)
        const newBtn = btn.cloneNode(true);
        btn.parentNode!.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', claimHandler);

        // Mostra
        modal.classList.remove("modal_backdrop_none");
    }

    let lastFrameTime = Date.now();
    let lastSlowTick = 0;

    // --------- LOOP DI GIOCO ---------
    // forcedDtSeconds: il delta arriva dallo Scheduler V3 (tick fissi 1/30s,
    // catch-up deterministico fino a 2s, vedi startGameRoutines). Il ramo else
    // (auto-timing dal clock, con clamp >2s) è difensivo: oggi lo scheduler passa
    // sempre il dt.
    function gameLoop(forcedDtSeconds: any) {
        const now = Date.now();
        let deltaTime;
        if (typeof forcedDtSeconds === 'number') {
            deltaTime = forcedDtSeconds;
            lastFrameTime = now; // tiene lastFrameTime allineato per il ramo difensivo
        } else {
            deltaTime = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            // Se il delta time è maggiore di 2 secondi, il gioco era in background.
            // Ignoriamo questo grosso salto temporale qui, perché verrà gestito
            // dal checkOfflineProgress() che si attiva al caricamento o al focus.
            if (deltaTime > 2) {
                deltaTime = 0.1; // Fallback per far ripartire il loop dolcemente
            }
        }

        // Calcolo Score (Veloce - Ogni frame)
        const scoreToAdd = store.bps.mul(deltaTime);

        store.gameState.score = store.gameState.score.add(scoreToAdd);
        store.gameState.totalScore = store.gameState.totalScore.add(scoreToAdd);
        store.gameState.lifetimeScore = store.gameState.lifetimeScore.add(scoreToAdd);

        // playTime è un numero semplice, qui va bene +=
        store.gameState.totalPlayTime += deltaTime;

        // Slow Loop (1 volta al secondo) - OTTIMIZZAZIONE
        if (now - lastSlowTick > 1000) {
            w.checkAchievements();         // Controlla obiettivi
            w.checkTabNotifications();     // Controlla i pallini rossi sui tab

            // Pulizia clickHistory spostata qui (1x/sec invece che 60x/sec)
            const clickNow = Date.now();
            store.clickHistory = store.clickHistory.filter((click: any) => clickNow - click.time < 1000);

            lastSlowTick = now;
        }

        // Gestione Click History (Ottimizzato: pulisce solo nella Slow Loop)
        // Il filtraggio viene fatto 1x/sec invece che 60x/sec

        // --- CONTROLLO FINE CRUNCH TIME ---
        if (store.gameState.crunchTimeEndTime > 0 && now > store.gameState.crunchTimeEndTime) {
            if (document.body.classList.contains('crunch-active')) {
                document.body.classList.remove('crunch-active');
                const overlay = document.getElementById('crunch-overlay');
                if (overlay) overlay.style.display = 'none';

                if (typeof w.AudioManager !== 'undefined') w.AudioManager.stop('sound-fury-music', 300);

                if (typeof w.AudioManager !== 'undefined')
                    w.AudioManager.updateAmbience();

                const fireContainer = document.getElementById('fire-particles-container');
                if (fireContainer) {
                    fireContainer.style.display = 'none';
                    fireContainer.innerHTML = '';
                }

                if (typeof w.fireParticleInterval !== 'undefined' && w.fireParticleInterval) {
                    clearInterval(w.fireParticleInterval);
                    w.fireParticleInterval = null;
                }

                if (typeof w.applySkinVisuals === 'function')
                    w.applySkinVisuals(store.gameState.skins.current);

                // RESET LOGICA GIOCO
                store.crunchTimeMultiplier = new w.Decimal(1); // Reimposta come Decimal
                w.recalculateCPS();

                if (typeof w.updateUI === 'function') w.updateUI();
                if (typeof w.refreshAllStores === 'function') w.refreshAllStores();

                if (w.currentActiveEvent === 'Crunch Time' || w.currentActiveEvent === 'Espo Fury') {
                    w.currentActiveEvent = null;
                    console.log("Espo Fury terminato. Semaforo verde.");
                }

                w.EspooClicker.showToast(store.gameData.texts.toasts.furyEnded, 'info');
            }
        }
    }

    // --------- 11. INIZIALIZZAZIONE ---------
    let gameRoutinesStarted = false;   // guardia: avvia i cicli UNA sola volta

    function startGameRoutines() {
        // Guardia anti-doppio-avvio: su F5 con sessione veniva chiamata sia dal boot sia
        // dall'auto-login → loop RAF e listener di chiusura duplicati (CPU doppia, save
        // concorrenti, golden bug raddoppiati). Avviamo i cicli una sola volta.
        if (gameRoutinesStarted) return;
        gameRoutinesStarted = true;

        // GRAFICA (10 FPS)
        const uiTick = () => {
            w.updateUI();
            if (typeof w.updatePrestigeVisuals === 'function') w.updatePrestigeVisuals();

            const statsModal = document.getElementById('stats-modal');

            if (statsModal && statsModal.style.display === 'flex')
                if (typeof w.updateStatsUI === 'function') w.updateStatsUI();

            let isAnyModalOpen = false;
            (document.querySelectorAll('.modal-backdrop') as NodeListOf<HTMLElement>).forEach((el) => {
                if (el.style.display === 'flex' && el.style.opacity !== '0') {
                    isAnyModalOpen = true;
                }
            });

            // Se nessun modale è aperto ma il body ha la classe, rimuovila
            if (!isAnyModalOpen && document.body.classList.contains('modal-open')) {
                document.body.classList.remove('modal-open');
            }
            // ---------------------------
        };

        // F3b → F8: logica (30hz), grafica (10hz) e auto-save (30s) girano sullo
        // Scheduler V3 — clock UNICO (niente drift fra timer), catch-up
        // deterministico a tick fissi, pausa automatica a tab nascosta (si fermano
        // updateUI/autosave: meno CPU e niente push cloud a vuoto da background).
        // maxDeltaMs=2000 replica la semantica "gap fino a 2s accreditati per
        // intero"; oltre ci pensa checkOfflineProgress (modale offline).
        const sched = new window.EspoV3.loop.Scheduler({ maxDeltaMs: 2000 });
        sched.registerTick((deltaMs) => gameLoop(deltaMs / 1000), 30); // LOGICA (30hz)
        sched.every(100, uiTick);                                       // GRAFICA (10hz)
        sched.every(30000, () => saveGame());                          // Auto-save (30s)
        sched.start();
        w._espoScheduler = sched; // handle per debug/cheatboard


        w.scheduleGoldenBug();

        // Salvataggio alla chiusura
        const handleAppClose = () => {
            // Forza un salvataggio sincrono in localStorage (sempre garantito)
            if (store.gameState && !store.gameState.isDeleting) {
                // Non bumpare il riferimento offline se stiamo andando in background
                // (visibilitychange→hidden): così al ritorno i guadagni offline maturano.
                if (document.visibilityState === 'visible') {
                    store.gameState.lastSaveTimestamp = Date.now();
                }
                const compressed = w.LZString.compressToUTF16(JSON.stringify(store.gameState));
                localStorage.setItem('espotoolClickerSaveV9', compressed);
            }
            // Avvia il salvataggio Cloud (il parametro keepalive: true nel fetch aiuta a finire la richiesta)
            saveGame();
        };

        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handleAppClose();
            }
        });
        window.addEventListener('pagehide', handleAppClose);
        window.addEventListener('beforeunload', handleAppClose);
        console.log("Cicli di gioco avviati correttamente.");
    }

    // Funzione universale per precaricare TUTTO (Immagini, Audio, Video)
    function preloadAllAssets(onProgress: any) {
        const criticalPromises: any[] = [];
        const backgroundPromises: any[] = [];

        // Helper: emette progress strutturato
        const _emit = (loaded: any, total: any, currentFile: any) => {
            if (!onProgress) return;
            const percent = total > 0 ? Math.floor((loaded / total) * 100) : 100;
            onProgress(percent, { loaded: loaded, total: total, file: currentFile || '' });
        };

        // 1. ASSET CRITICI (Immagini base)
        const criticalImages = new Set([
            'assets/image/ui/favicon.webp',
            'assets/image/ui/hidden.webp',
            'assets/image/ui/bluescreen.webp',
            'assets/image/ui/super-block.webp'
        ]);
        const backgroundImages = new Set<string>();

        // Identifica la skin corrente per caricare SOLO quella
        let currentSkinId = 'default';
        if (store.gameState && store.gameState.skins && store.gameState.skins.current) {
            currentSkinId = store.gameState.skins.current;
        }

        if (store.gameData.skins) {
            Object.keys(store.gameData.skins).forEach(key => {
                const skin = store.gameData.skins[key];
                if (key === currentSkinId) {
                    if (skin.img) criticalImages.add(`assets/image/${skin.img}`);
                    if (skin.imgClick) criticalImages.add(`assets/image/${skin.imgClick}`);
                } else {
                    if (skin.img) backgroundImages.add(`assets/image/${skin.img}`);
                    if (skin.imgClick) backgroundImages.add(`assets/image/${skin.imgClick}`);
                }
            });
        }

        // Le immagini della Fury vanno in background
        if (store.gameData.prestigeUpgrades) {
            Object.values(store.gameData.prestigeUpgrades).forEach((upg: any) => {
                if (upg.furyImage) backgroundImages.add(`assets/image/${upg.furyImage}`);
                if (upg.furyClickImage) backgroundImages.add(`assets/image/${upg.furyClickImage}`);
            });
        }

        // 2. AUDIO CRITICI (Solo UI ed eventuale musica della skin corrente)
        const criticalAudioIds = ['sound-click', 'sound-buy', 'sound-error', 'sound-golden', 'sound-achievement'];

        const currentSkinConf = store.gameData.skins[currentSkinId]?.themeConfig;
        if (currentSkinConf && currentSkinConf.specialMusic) {
            criticalAudioIds.push(currentSkinConf.specialMusic);
        } else if (store.gameState && store.gameState.user && store.gameState.user.bgMusicSelection) {
            criticalAudioIds.push(store.gameState.user.bgMusicSelection);
        } else {
            criticalAudioIds.push('sound-bg-music');
        }

        let totalCritical = criticalImages.size + criticalAudioIds.length;
        let loadedCritical = 0;

        const updateProgress = (file: any) => {
            loadedCritical++;
            _emit(loadedCritical, totalCritical, file);
        };

        // Emit iniziale 0/N
        _emit(0, totalCritical, '');

        // Helper: estrae nome file leggibile (basename)
        const _basename = (url: any) => {
            try { return url.split('?')[0].split('/').pop() || url; }
            catch (e) { return url; }
        };

        // --- CARICAMENTO IMMAGINI CRITICHE ---
        criticalImages.forEach(src => {
            criticalPromises.push(
                new Promise<void>((resolve) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = () => { updateProgress(_basename(src)); resolve(); };
                    img.onerror = () => { console.warn("Manca img:", src); updateProgress(_basename(src)); resolve(); };
                })
            );
        });

        // --- CARICAMENTO AUDIO MISTO ---
        if (store.gameData.assets && store.gameData.assets.sounds) {
            // Su R2 usa URL sync già cachato dal prefetch; altrimenti path locale
            const _resolveAudio = (local: any) => {
                if (w.CDN && w.CDN.urlSync) {
                    const sync = w.CDN.urlSync(local);
                    if (sync) return sync;
                }
                return local;
            };

            Object.values(store.gameData.assets.sounds).forEach((sound: any) => {
                let local = sound.file.includes('/') ? sound.file : `assets/sounds/${sound.file}`;
                let url = _resolveAudio(local);

                if (criticalAudioIds.includes(sound.id)) {
                    criticalPromises.push(
                        fetch(url)
                            .then(() => updateProgress(_basename(local)))
                            .catch(() => updateProgress(_basename(local)))
                    );
                } else {
                    backgroundPromises.push(fetch(url).catch(() => { }));
                }
            });
        }

        // --- DOPO I CRITICI, CARICA IL BACKGROUND E I VIDEO ---
        Promise.all(criticalPromises).then(() => {
            backgroundImages.forEach(src => {
                const img = new Image();
                img.src = src;
            });
            Promise.all(backgroundPromises);

            // Inietta i tag video nell'HTML in modo pigro
            injectVideosLazily();
        });

        return totalCritical === 0 ? Promise.resolve() : Promise.all(criticalPromises);
    }

    // Crea i tag <video> pesanti dinamicamente e li aggiunge in background
    function injectVideosLazily() {
        const videoData = [
            { id: 'rick-roll-video', class: 'rick_roll_video', src: 'assets/video/rick-espley-video.mp4' },
            { id: 'ricardo-video', class: 'ricardo_video', src: 'assets/video/ricardo-milespo-video.mp4' },
            { id: 'ricardo-metal-video', class: 'ricardo_metal_video', src: 'assets/video/ricardo-milespo-metal-video.mp4' },
            { id: 'ricardo-dota-video', class: 'ricardo_dota_video', src: 'assets/video/ricardo-milespo-dota-video.mp4' },
            { id: 'britney-espoars-video', class: 'britney_espoars_video', src: 'assets/video/britney-espoars-video.mp4' },
            { id: 'video-bigbang', class: 'bigbang_video', src: 'assets/video/bigbang-espoclicker.mp4' }
        ];

        videoData.forEach(v => {
            if (!document.getElementById(v.id)) {
                const videoEl = document.createElement('video');
                videoEl.id = v.id;
                videoEl.className = `${v.class} video_display_none`;
                videoEl.playsInline = true;
                videoEl.setAttribute('playsinline', '');
                videoEl.setAttribute('webkit-playsinline', '');
                videoEl.preload = "metadata"; // Header pronto per play immediato su mobile
                // data-src-local: path originale (per CDN.url async + fallback)
                videoEl.setAttribute('data-src-local', v.src);
                // Se R2 disabilitato, può già usare il path locale
                if (!w.CDN || !w.CDN.enabled) {
                    videoEl.setAttribute('data-src', v.src);
                }
                document.body.appendChild(videoEl);
            }
        });
    }

    // ---------------------------------------------------------
    // LOADER UI: progress bar + counter + tip rotation
    // ---------------------------------------------------------
    function setupLoaderUI() {
        const els = {
            status:  document.getElementById('loader-status-text'),
            fill:    document.getElementById('loader-progress-fill'),
            percent: document.getElementById('loader-percent'),
            counter: document.getElementById('loader-counter'),
            file:    document.getElementById('loader-current-file'),
            tip:     document.getElementById('loader-tip'),
            slow:    document.getElementById('loader-slow-hint'),
        };

        const tips = (store.gameData.texts && store.gameData.texts.ui && Array.isArray(store.gameData.texts.ui.loaderTips))
            ? store.gameData.texts.ui.loaderTips
            : [
                "Suggerimento: clicca veloce per moltiplicare i bug.",
                "Le promozioni sbloccano nuove meccaniche.",
                "Apri l'Arcade per minigiochi e bonus.",
                "Le skin cambiano look ed effetti speciali.",
                "Il Q-Lab si sblocca dopo molte promozioni.",
                "Salvataggio automatico in IndexedDB locale."
            ];

        let tipIdx = 0;
        const showNextTip = () => {
            if (!els.tip) return;
            els.tip.classList.remove('visible');
            setTimeout(() => {
                els.tip!.textContent = tips[tipIdx % tips.length];
                els.tip!.classList.add('visible');
                tipIdx++;
            }, 250);
        };
        showNextTip();
        const tipInterval = setInterval(showNextTip, 4500);

        // Hint connessione lenta: appare se nessun progresso per 6s
        let lastProgressAt = Date.now();
        const slowCheck = setInterval(() => {
            if (els.slow && Date.now() - lastProgressAt > 6000) {
                els.slow.hidden = false;
            }
        }, 1500);

        const update = (percent: any, info: any) => {
            const pct = Math.max(0, Math.min(100, percent || 0));
            if (els.fill)    els.fill.style.width = pct + '%';
            if (els.percent) els.percent.textContent = pct + '%';

            if (info && els.counter && info.total) {
                els.counter.textContent = info.loaded + ' / ' + info.total;
            }
            if (info && els.file) {
                els.file.textContent = info.file ? '◦ ' + info.file : '';
            }
            lastProgressAt = Date.now();
            if (els.slow) els.slow.hidden = true;
        };

        const setStatus = (text: any) => {
            if (els.status) els.status.textContent = text;
        };

        const dispose = () => {
            clearInterval(tipInterval);
            clearInterval(slowCheck);
        };

        return { update: update, setStatus: setStatus, dispose: dispose };
    }

    // Setup Iniziale
    function initializeGame() {
        const loaderUI = setupLoaderUI();
        loaderUI.setStatus(store.gameData.texts.ui.loadingData);
        const loadGamePromise = loadGame(); // Carica salvataggi (async: attesa più sotto)

        const btnConfirmFormat = document.getElementById('btn-confirm-format');

        if (btnConfirmFormat) {
            btnConfirmFormat.addEventListener('click', () => {
                // TRUCCO ANTI-BLOCCO: Inizializza il video nel momento esatto del click umano
                const video = document.getElementById('video-bigbang') as HTMLVideoElement | null;
                if (video) {
                    if (!video.src) {
                        // Risolvi URL: se R2 attivo, usa cache sync (popolata al boot via prefetch)
                        const direct = video.getAttribute('data-src');
                        const local  = video.getAttribute('data-src-local');
                        const sync   = (w.CDN && w.CDN.urlSync) ? w.CDN.urlSync(local) : null;
                        video.src = direct || sync || local || '';
                    }
                    video.volume = 0; // Muto temporaneamente

                    let p = video.play();
                    if (p !== undefined) {
                        p.then(() => {
                            video.pause();
                            video.currentTime = 0;
                        }).catch(e => { console.warn("Trick Autoplay fallito:", e); });
                    }
                }

                if (typeof w.executeFormattingSequence === 'function') w.executeFormattingSequence();
            });
        }

        // ─────────────────────────────────────────────────────────
        // PREFETCH SIGNED URL R2 (solo Altervista)
        // Risolve in batch tutti gli URL firmati per audio + video
        // PRIMA di inizializzare AudioManager: i Howl così partono
        // direttamente con URL R2 invece che path locale (404 su Altervista).
        // ─────────────────────────────────────────────────────────
        const _prefetchUrls = () => {
            if (!w.CDN || !w.CDN.enabled || !w.CDN.prefetch) {
                return Promise.resolve();
            }
            loaderUI.setStatus(store.gameData.texts.ui.initPrivateAssets);
            const paths = [];
            // Audio
            if (store.gameData.assets && store.gameData.assets.sounds) {
                Object.values(store.gameData.assets.sounds).forEach((s: any) => {
                    paths.push(s.file.includes('/') ? s.file : `assets/sounds/${s.file}`);
                });
            }
            // Video (lista hardcoded sincrona con injectVideosLazily)
            paths.push(
                'assets/video/rick-espley-video.mp4',
                'assets/video/ricardo-milespo-video.mp4',
                'assets/video/ricardo-milespo-metal-video.mp4',
                'assets/video/ricardo-milespo-dota-video.mp4',
                'assets/video/britney-espoars-video.mp4',
                'assets/video/bigbang-espoclicker.mp4'
            );
            return w.CDN.prefetch(paths).catch((err: any) => {
                console.warn('[CDN] Prefetch fallito, userò fallback locale:', err);
            });
        };

        _prefetchUrls().then(() => {
            // Inizializza Audio Context (senza suonare ancora)
            if (typeof w.AudioManager !== 'undefined')
                w.AudioManager.init();

            // AVVIO PRELOADER CON BARRA PROGRESSO
            loaderUI.setStatus(store.gameData.texts.ui.loadingAssets);
            return preloadAllAssets((percent: any, info: any) => {
                loaderUI.update(percent, info);
            });
        })
            .then(() => {
                // 4. TUTTO PRONTO
                loaderUI.setStatus(store.gameData.texts.ui.systemStart);
                loaderUI.update(100, { loaded: 1, total: 1, file: '' });

                setTimeout(() => {
                    loaderUI.dispose();
                    const loader = document.getElementById('game-loader');
                    if (loader) {
                        loader.classList.add('hidden');
                        setTimeout(() => loader.remove(), 600);
                    }

                    // Notifica l'AssetManager che il boot è completato:
                    // avvia il caricamento progressivo in background delle skin.
                    window.dispatchEvent(new CustomEvent('gameBootComplete'));

                    w.updateUI();

                    // LOGICA F5 / REFRESH:
                    // Controlliamo se c'è una sessione utente attiva (quindi niente login richiesto)
                    // NOTA: Usiamo SOLO sessionStorage per evitare che i modali appaiano prima del login
                    const hasSession = sessionStorage.getItem('espooUser');

                    // Se abbiamo una sessione E il loader è finito, proviamo a suonare.
                    if (hasSession) {
                        w.EspooClicker.tryStartAudio();
                        startGameRoutines();
                        
                        // Popup "come si segnala": una volta sola per giocatore.
                        // Va deciso QUI, a save caricato, e non prima: il flag sta
                        // nel save, quindi leggerlo troppo presto lo darebbe sempre
                        // per non visto.
                        w.shouldShowFeedbackIntro = !!(store.gameState && !store.gameState.seenFeedbackIntro);

                        // --- CONTROLLO MODALI DI AVVIO (A CASCATA) ---
                        if (w.triggerLaunchMigrationModal || (store.gameState && store.gameState.pendingFounderChoice)) {
                            setTimeout(() => {
                                w.showLaunchMigrationModal(() => {
                                    w.triggerLaunchMigrationModal = false;
                                    if (w.shouldShowReleaseNotesOnLoad && w.EspooClicker.openReleaseNotes) {
                                        w.EspooClicker.openReleaseNotes();
                                    }
                                });
                                if (w.EspooClicker) w.EspooClicker.saveGame();
                            }, 800);
                        } else if (w.triggerV2MigrationModal) {
                            setTimeout(() => {
                                w.showV2MigrationModal(() => {
                                    if (w.shouldShowReleaseNotesOnLoad && w.EspooClicker.openReleaseNotes) {
                                        w.EspooClicker.openReleaseNotes();
                                    }
                                });
                                if (w.EspooClicker) w.EspooClicker.saveGame();
                            }, 800);
                        } else if (w.shouldShowReleaseNotesOnLoad) {
                            // Mostra solo le RN se non c'è stata la migrazione
                            setTimeout(() => {
                                if (w.EspooClicker.openReleaseNotes) w.EspooClicker.openReleaseNotes();
                            }, 800);
                        } else {
                            // Nessuna nota di rilascio da mostrare: il popup può partire
                            // da solo. Le condizioni però NON si valutano qui — le decide
                            // maybeOpenFeedbackIntro quando il timer scatta, perché da qui
                            // a lì il save cloud può ancora arrivare e cambiare le carte
                            // (vedi il commento sulla funzione). Se le note spuntano nel
                            // frattempo, il popup si accoda alla loro chiusura.
                            setTimeout(() => {
                                if (w.EspooClicker && typeof w.EspooClicker.maybeOpenFeedbackIntro === 'function') {
                                    w.EspooClicker.maybeOpenFeedbackIntro({ standalone: true });
                                }
                            }, 900);
                        }
                    }

                }, 500);
            });

        // Setup Listener Vari
        const now = Date.now();

        const tryStart = () => {
            // 1. CONTROLLO CRITICO: Se non c'è una sessione utente, siamo al Login.
            const hasSession = sessionStorage.getItem('espooUser');

            if (!hasSession) {
                // Utente non loggato -> Silenzio assoluto.
                return;
            }

            // 2. Se l'utente è già loggato (es. F5), proviamo a suonare.
            if (w.EspooClicker && w.EspooClicker.tryStartAudio) {
                w.EspooClicker.tryStartAudio();
            }
        };

        tryStart();

        // Genera l'interfaccia iniziale
        if (typeof w.refreshAllStores === 'function') w.refreshAllStores();

        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('dragstart', event => event.preventDefault());

        document.body.classList.remove('rick-rolling', 'bluescreen-active');
        const gContainer = document.getElementById('game-container');

        if (gContainer) {
            gContainer.style.opacity = '1';
            gContainer.style.transform = 'none';
            gContainer.style.pointerEvents = 'auto';
        }

        store.isBluescreenActive = false;
        store.bluescreenMultiplier = new w.Decimal(1);
        if (window.hasOwnProperty('currentActiveEvent')) w.currentActiveEvent = null;

        ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
            const video = document.getElementById(id) as HTMLVideoElement | null;

            if (video) {
                video.pause();
                video.classList.add("video_display_none");
                video.currentTime = 0;

                document.getElementById('header-left-panel')!.classList.add("header_stat_box_display_none");
                document.getElementById('header-right-panel')!.classList.add("header_stat_box_display_none");
            }
        });

        // Reset playback rate del click sound
        const clickHowl = (typeof w.AudioManager !== 'undefined') ? w.AudioManager.getHowl('sound-click') : null;
        if (clickHowl) clickHowl.rate(1);

        let isFuryResumed = false;

        if (store.gameState.crunchTimeEndTime > 0 && store.gameState.crunchTimeEndTime > now) {
            store.crunchTimeEndTime = store.gameState.crunchTimeEndTime;
            store.crunchTimeCooldownEnd = store.gameState.crunchTimeCooldownEnd;

            if (typeof w.resumeCrunchTimeEffects === 'function') {
                w.resumeCrunchTimeEffects();
                isFuryResumed = true;
            }
        }

        // Applica la skin normale SOLO se NON abbiamo appena riattivato la Fury
        if (!isFuryResumed && typeof w.applySkinVisuals === 'function')
            w.applySkinVisuals(store.gameState.skins.current);
        else if (isFuryResumed)
            console.log("Fury Mode attiva: skip caricamento skin standard.");

        const globalFilterSelect = document.getElementById('global-filter-select') as HTMLSelectElement | null;
        if (globalFilterSelect && !w._espoHadSave) {
            globalFilterSelect.value = 'available';
            store.gameState.filterSettings.globalFilter = 'available';
        }

        if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
        w.updateUI();

        // Setup Moltiplicatori (Automatizzato)
        const multiplierValues = [1, 5, 10, 'MAX'];
        const multiplierBtns: any = {};

        // Recupera Riferimenti
        multiplierValues.forEach(val => {
            const id = val === 'MAX' ? 'btn-max' : `btn-${val}x`;
            multiplierBtns[val] = document.getElementById(id);
        });

        // Funzione Logica Cambio
        function setBuyMultiplier(value: any) {
            w.buyMultiplier = value;

            // Aggiorna Grafica Bottoni
            multiplierValues.forEach(val => {
                if (multiplierBtns[val]) {
                    multiplierBtns[val].style.backgroundColor = '';

                    const _isActive = (val === value);
                    multiplierBtns[val].classList.toggle('active', _isActive);
                    multiplierBtns[val].setAttribute('aria-pressed', _isActive ? 'true' : 'false');
                }
            });

            w.refreshAllStores();
            w.updateUI();
        }

        // Assegna Listener
        multiplierValues.forEach(val => {
            if (multiplierBtns[val]) {
                multiplierBtns[val].addEventListener('click', (e: any) => {
                    w.playSound('sound-click');
                    setBuyMultiplier(val);
                });
            }
        });

        setBuyMultiplier(1);

        document.addEventListener('keydown', (e) => {
            // Evita lo scroll della pagina con Spazio SOLO quando nessun controllo e' a fuoco.
            // Non blocchiamo piu' Enter/Spazio sui bottoni: servono per attivarli da tastiera (a11y).
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
            }
        });

        const muteBtn = document.getElementById('quick-mute-btn');
        if (muteBtn) {
            // Imposta icona iniziale (poi risincronizzata dopo il caricamento del salvataggio)
            updateMuteButton();

            muteBtn.addEventListener('click', () => {
                const currentSkin = store.gameData.skins[store.gameState.skins.current] || store.gameData.skins['default'];

                // Identifica la traccia corretta
                const targetId = (currentSkin.themeConfig && currentSkin.themeConfig.specialMusic)
                    ? currentSkin.themeConfig.specialMusic
                    : (store.gameState.user.bgMusicSelection || 'sound-bg-music');

                const howl = (typeof w.AudioManager !== 'undefined') ? w.AudioManager.getHowl(targetId) : null;
                const isBlocked = (store.gameState.user.masterVolume > 0 && howl && !howl.playing() && !w.currentActiveEvent);

                if (isBlocked) {
                    if (w.EspooClicker && w.EspooClicker.tryStartAudio) w.EspooClicker.tryStartAudio();
                }
                else {
                    // LOGICA MUTE / UNMUTE CLASSICA
                    if (store.gameState.user.masterVolume > 0) {
                        // MUTA TUTTO
                        store.gameState.lastVolume = store.gameState.user.masterVolume;
                        store.gameState.user.masterVolume = 0;
                    }
                    else {
                        // UNMUTE
                        store.gameState.user.masterVolume = store.gameState.lastVolume || 1.0;
                        w.playSound('sound-click');

                        // Riavvia l'audio se necessario
                        if (w.EspooClicker && w.EspooClicker.tryStartAudio) w.EspooClicker.tryStartAudio();
                    }

                    // Aggiorna Slider nelle impostazioni se aperto
                    const mSlider = document.getElementById('master-slider') as HTMLInputElement | null;
                    const mDisplay = document.getElementById('master-vol-display');

                    if (mSlider) {
                        mSlider.value = store.gameState.user.masterVolume;
                    }

                    if (mDisplay) {
                        mDisplay.textContent = String(Math.round(store.gameState.user.masterVolume * 100));
                    }

                    // Audio Ambiente (Bg music, snow, 8-bit, etc)
                    if (typeof w.updateAmbientVolume === 'function') w.updateAmbientVolume();
                    else if (typeof w.AudioManager !== 'undefined') w.AudioManager.updateAmbience();

                    // Video Attivi (Rick Roll, Ricardo) - Aggiorna volume
                    ['rick-roll-video', 'ricardo-video', 'ricardo-metal-video', 'ricardo-dota-video'].forEach(id => {
                        const video = document.getElementById(id) as HTMLVideoElement | null;
                        if (video && !video.paused && !video.classList.contains("video_display_none")) {
                            const customVol = (typeof w.getCustomVolume === 'function') ? w.getCustomVolume(id) : 1.0;
                            video.volume = store.gameState.user.masterVolume * store.gameState.user.musicVolume * customVol;

                            document.getElementById('header-left-panel')!.classList.add("header_stat_box_display_none");
                            document.getElementById('header-right-panel')!.classList.add("header_stat_box_display_none");
                        }
                    });
                }

                // Single source of truth: sincronizza l'icona con lo stato finale del volume
                updateMuteButton();

                // Micro-animazione "pop" sull'icona al toggle (re-trigger via reflow).
                muteBtn.classList.remove('qm-pop');
                void muteBtn.offsetWidth;
                muteBtn.classList.add('qm-pop');
            });
        }

        if (clickerButton) {
            // Pulizia grafica (Blur) per togliere il focus dal bottone
            clickerButton.addEventListener('mouseup', () => clickerButton.blur());
            clickerButton.addEventListener('mouseleave', () => clickerButton.blur());
            clickerButton.addEventListener('touchend', () => clickerButton.blur(), { passive: true });

            // 1. GESTIONE MOUSE (Nativa)
            clickerButton.addEventListener('click', (e: any) => {
                // tryStart (sblocco audio) è best-effort: un suo throw NON deve
                // impedire resolveBug, che conta il click.
                try { tryStart(); } catch (err) { console.warn('[click] tryStart best-effort:', err); }
                w.resolveBug(e);
            });

            // 2. GESTIONE TOUCH (Reattività estrema su Mobile)
            clickerButton.addEventListener('touchstart', (e: any) => {
                e.preventDefault(); // Impedisce al browser di far partire anche un "click" finto (evita doppi colpi)
                try { tryStart(); } catch (err) { console.warn('[click] tryStart best-effort:', err); }
                
                const touch = e.touches[0];
                
                // Creiamo un evento sintetico con detail: 1 per superare il blocco di resolveBug
                w.resolveBug({
                    detail: 1, 
                    clientX: touch.clientX, 
                    clientY: touch.clientY, 
                    target: clickerButton
                });
            }, { passive: false });
        }

        if (globalFilterSelect) {
            globalFilterSelect.value = store.gameState.filterSettings.globalFilter || 'available';
            globalFilterSelect.addEventListener('change', (e: any) => {
                store.gameState.filterSettings.globalFilter = e.target.value;
                w.refreshAllStores();
                saveGame();

                if (w.EspooClicker) w.EspooClicker.playSound('sound-click');
            });
        }

        // Solo i pulsanti che cambiano colonna (hanno data-target): il bottone
        // Arcade è un'azione (apre arcade.php) e va escluso dallo switcher.
        const mobileBtns = document.querySelectorAll('.mobile-nav-btn[data-target]');

        // Funzione helper per gestire le classi del body (per il Golden Bug)
        function setMobileViewClass(targetId: any) {
            document.body.classList.remove('mobile-view-left', 'mobile-view-center', 'mobile-view-right');
            if (targetId === 'center-column') document.body.classList.add('mobile-view-center');
            else if (targetId === 'left-column') document.body.classList.add('mobile-view-left');
            else if (targetId === 'right-column') document.body.classList.add('mobile-view-right');
        }

        // Avvio MOBILE
        if (window.innerWidth <= 1024) {
            // 1. Imposta la classe al body per dire che siamo al centro
            document.body.classList.add('mobile-view-center');

            // 2. Assicurati che tutte le colonne siano nascoste, poi mostra il centro
            document.querySelectorAll('.game-column').forEach(col => col.classList.remove('mobile-active'));
            const centerCol = document.getElementById('center-column');
            if (centerCol) {
                centerCol.classList.add('mobile-active'); // <--- QUESTO FA APPARIRE IL CLICKER
            }

            // 3. Assicura che il bottone in basso "Console" sia acceso
            mobileBtns.forEach(b => b.classList.remove('active'));
            const centerBtn = document.querySelector('.mobile-nav-btn[data-target="center-column"]');
            if (centerBtn) centerBtn.classList.add('active');
        }
        // -------------------------------------------------------------

        mobileBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                mobileBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetId = btn.getAttribute('data-target');

                setMobileViewClass(targetId);

                document.querySelectorAll('.game-column').forEach(col => col.classList.remove('mobile-active'));
                const targetCol = document.getElementById(targetId!);

                if (targetCol) {
                    targetCol.classList.add('mobile-active');
                }

                if (targetId === 'left-column' && typeof w.refreshAllStores === 'function') w.refreshAllStores();

                w.playSound('sound-click');
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                (document.querySelectorAll('.game-column') as NodeListOf<HTMLElement>).forEach(col => {
                    col.classList.remove('mobile-active');
                    col.style.display = '';
                });
            }
            else if (!document.querySelector('.game-column.mobile-active'))
                document.getElementById('center-column')!.classList.add('mobile-active');
        });

        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content') as NodeListOf<HTMLElement>;

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                contents.forEach(c => c.style.display = 'none');
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');

                const targetId = tab.getAttribute('data-target');
                document.getElementById(targetId!)!.style.display = 'block';
                tab.classList.remove('notify');

                const filterSelect = document.getElementById('global-filter-select') as HTMLSelectElement | null;

                if (filterSelect) {
                    if (tab.id === 'tab-prestige' || tab.id === 'tab-quantum') {
                        if (!filterSelect.disabled)
                            filterSelect.setAttribute('data-prev', filterSelect.value);

                        filterSelect.value = 'all';
                        filterSelect.disabled = true;
                        store.gameState.filterSettings.globalFilter = 'all';
                    }
                    else {
                        filterSelect.disabled = false;
                        const prev = filterSelect.getAttribute('data-prev');

                        if (prev) {
                            filterSelect.value = prev;
                            store.gameState.filterSettings.globalFilter = prev;
                            filterSelect.removeAttribute('data-prev');
                        }
                    }

                    w.refreshAllStores();
                }

                if (e.isTrusted) w.playSound('sound-click');
            });
        });

        const defaultTab = document.getElementById('tab-click');
        if (defaultTab) defaultTab.click();

        const crunchBtn = document.getElementById('skill-crunchTime');
        if (crunchBtn) {
            crunchBtn.addEventListener('click', (e) => {
                // Consenti l'attivazione da tastiera (detail 0 ma isTrusted true); blocca solo i .click() da script
                if (e.detail === 0 && e.isTrusted === false) return;
                w.activateCrunchTime();
            });
        }

        if (goldenBug) {
            goldenBug.addEventListener('click', (e: any) => {
                // Blocca solo i .click() sintetici da script; mouse e tastiera reali passano
                if (e.detail === 0 && e.isTrusted === false) return;
                w.clickGoldenBug();
            });
            // Il golden bug e' un <div role="button">: la tastiera non genera click nativo, lo gestiamo qui
            goldenBug.addEventListener('keydown', (e: any) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    w.clickGoldenBug();
                }
            });
        }

        const vDisplay = document.getElementById('version-display');

        if (vDisplay && w.GAME_VERSION) {
            vDisplay.innerHTML = `<i class="fa-solid fa-bullhorn" style="margin-right: 6px;"></i>${store.gameData.texts.ui.newsLabel} ${w.GAME_VERSION.toString()}`;
            
            if (w.GAME_VERSION.stage === 'beta') vDisplay.style.color = '#f39c12';
            if (w.GAME_VERSION.stage === 'stable') vDisplay.style.color = '#2ecc71';
            
            // Abilitiamo i click direttamente tramite stile inline
            vDisplay.style.pointerEvents = 'auto';
            vDisplay.style.cursor = 'pointer';
        }

        // Espone il caricamento del salvataggio locale: chi avvia il boot attende
        // questa promise prima di emettere EspoGameReady (vedi fondo file).
        return loadGamePromise;
    }

    // Single source of truth per l'icona del bottone mute rapido.
    // Deriva lo stato dell'icona da gameState.user.masterVolume.
    // Va chiamata da OGNI punto che modifica masterVolume (slider, login/cloud, API)
    // per evitare che l'icona si desincronizzi dallo stato reale dell'audio.
    function updateMuteButton() {
        const btn = document.getElementById('quick-mute-btn');
        if (!btn) return;
        const muted = !store.gameState || !store.gameState.user || store.gameState.user.masterVolume <= 0;
        const icon = btn.querySelector('.qm-icon i');
        if (icon) icon.className = muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        btn.classList.toggle('is-muted', muted);
        btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        btn.setAttribute('aria-label', muted ? store.gameData.texts.ui.audioOn : store.gameData.texts.ui.audioOff);
    }

    // --------- API GLOBALE ---------
    w.EspooClicker =
    {
        getGameState: () => store.gameState,
        saveGame: saveGame,
        showToast: w.showToast,
        playSound: w.playSound,
        updateStatsUI: w.updateStatsUI,
        updateMuteButton: updateMuteButton,
        formatNumber: w.formatNumber,
        setPassword: (pwd: any) => { currentUserPassword = pwd; },
        getPassword: () => currentUserPassword,
        getSaveToken: () => currentSaveToken,
        setSaveToken: (token: any, expiresAt: any) => {
            currentSaveToken = token;
            if (expiresAt) tokenExpiresAt = expiresAt * 1000;
        },

        openReleaseNotes: async () => {
        const modal = document.getElementById('release-notes-modal');
        const content = document.getElementById('release-notes-content');
        if (!modal || !content) return;

        // Spento QUI e non a fetch riuscito: le note si stanno aprendo comunque,
        // e da quando maybeOpenFeedbackIntro ci si appoggia per sapere se ci sono
        // note in arrivo, lasciarlo acceso su un errore di rete terrebbe il popup
        // bloccato per sempre.
        w.shouldShowReleaseNotesOnLoad = false;

        // 1. Mostra il modale e avvia l'animazione di entrata (ripristinando l'opacità)
        modal.style.display = 'flex';
        
        const modalContent = modal.querySelector('.modal-content') as HTMLElement | null;
        if (typeof w.gsap !== 'undefined' && modalContent) {
            w.gsap.fromTo(modalContent,
                { scale: 0.8, opacity: 0, y: 20 },
                { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
            );
            w.gsap.to(modal, { opacity: 1, duration: 0.3 });
        } else {
            modal.style.opacity = '1';
            if (modalContent) {
                modalContent.style.opacity = '1';
                modalContent.style.transform = 'none';
            }
        }

        document.body.classList.add('modal-open');

        // 2. Carica e formatta il Markdown
        try {
            const _rnLang = (w.APP_LANG === 'en') ? 'en' : 'it';
            const response = await fetch('release-notes_' + _rnLang + '.md?v=' + Date.now());
            if (!response.ok) throw new Error("File non trovato");
            const mdText = await response.text();

            content.innerHTML = w.simpleMarkdown(mdText);
        } catch (e) {
            content.innerHTML = '<p style="color: #e74c3c; text-align: center;">' + store.gameData.texts.ui.newsLoadError + '</p>';
        }
    },

    // --- POPUP "COME SI SEGNALA" — una tantum ---
    // Il flag vive nel save (seenFeedbackIntro), non in localStorage: viaggia
    // col cloud, quindi non ricompare cambiando dispositivo. Si segna come
    // visto all'APERTURA e non alla chiusura: se l'utente ricarica la pagina
    // con il popup aperto, non deve ritrovarselo per sempre.
    openFeedbackIntro: () => {
        const modal = document.getElementById('feedback-intro-modal');
        if (!modal) return;
        w.shouldShowFeedbackIntro = false;

        modal.style.display = 'flex';
        modal.style.opacity = '1';
        const content = modal.querySelector('.modal-content') as HTMLElement | null;
        if (typeof w.gsap !== 'undefined' && content) {
            w.gsap.fromTo(content,
                { scale: 0.85, opacity: 0, y: 20 },
                { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' });
        } else if (content) {
            content.style.opacity = '1';
            content.style.transform = 'none';
        }
        document.body.classList.add('modal-open');

        if (store.gameState) {
            store.gameState.seenFeedbackIntro = true;
            if (typeof w.EspooClicker.saveGame === 'function') w.EspooClicker.saveGame();
        }
    },

    // Unico punto che decide SE aprire il popup, e lo decide al momento di
    // aprirlo invece che quando si programma il timer. Prima la condizione
    // stava nel ramo `else if` della cascata di avvio, valutato a ~500ms dal
    // caricamento: il save CLOUD arriva dopo il giro di rete e può accendere
    // shouldShowReleaseNotesOnLoad più tardi (loadCloudData), quando il timer
    // del popup è già in volo. Da lì la segnalazione «il popup appare sopra
    // alle note di rilascio»: due decisioni prese in momenti diversi sullo
    // stesso stato.
    //
    // Restituisce true solo se ha davvero aperto. Quando rifiuta NON consuma
    // il flag: la finestra si riapre al passaggio buono (chiusura delle note).
    // `standalone` = apertura per conto proprio, senza note di rilascio davanti.
    // Solo in quel caso vale il vincolo sui click: il popup serve a far scoprire
    // una funzione a chi il gioco ce l'ha già, non ad accogliere chi non ha
    // ancora cliccato una volta. Dopo le note invece si apre comunque — chi
    // aggiorna il gioco lo vede anche con zero click su questo save, ed è voluto.
    maybeOpenFeedbackIntro: (opts?: { standalone?: boolean }) => {
        if (!w.shouldShowFeedbackIntro) return false;
        if (!store.gameState || store.gameState.seenFeedbackIntro) return false;
        if (opts && opts.standalone && !(store.gameState.totalClicks > 0)) return false;
        // Note di rilascio in arrivo (anche decise tardi, dal save cloud): il
        // popup si accoda alla loro chiusura, non le anticipa.
        if (w.shouldShowReleaseNotesOnLoad) return false;
        // Qualunque finestra già a schermo: si riprova più tardi. È questo il
        // controllo che rende l'ordine indipendente dai tempi di rete.
        const modali = Array.from(document.querySelectorAll('.modal-backdrop'));
        for (const m of modali) {
            if (getComputedStyle(m).display !== 'none') return false;
        }
        w.EspooClicker.openFeedbackIntro();
        return true;
    },
        tryStartAudio: () => {
            // 1. Controllo Sessione
            if (!sessionStorage.getItem('espooUser')) {
                return;
            }

            // 2. Controllo Volume Master
            if (store.gameState.user.masterVolume <= 0) return;

            if (typeof w.AudioManager !== 'undefined') {
                w.AudioManager.updateAmbience();
            }
        },

        setMasterVolume: (volume: any) => {
            store.gameState.user.masterVolume = parseFloat(volume);
            // Aggiorna tutto via AudioManager per applicare masterVolume * musicVolume * customVol
            if (typeof w.AudioManager !== 'undefined') {
                w.AudioManager.updateAmbience();
            }
            updateMuteButton();
        },
        startGameRoutines: startGameRoutines,
        executePrestige: w.executePrestige,


        loadCloudData: (cloudJSON: any, opts: any) => {
            if (cloudJSON) {
                try {
                    // 1. Parsing e Decompressione Preliminare
                    // cloudJSON può arrivare in forme diverse:
                    //  - stringa compressa lz-string GREZZA → Supabase: la colonna jsonb è
                    //    auto-parsata da supabase-js, quindi ricevi già il valore (single-encoded).
                    //  - stringa JSON che racchiude la compressa → legacy PHP (json_encode = double-encoded).
                    //  - oggetto stato → salvataggio legacy non compresso.
                    let cloudDataRaw = cloudJSON;
                    if (typeof cloudJSON === 'string') {
                        try { cloudDataRaw = JSON.parse(cloudJSON); }
                        catch (_) { cloudDataRaw = cloudJSON; } // già stringa grezza (Supabase)
                    }
                    let cloudState;

                    if (typeof cloudDataRaw === 'string') {
                        const decompressed = w.LZString.decompressFromUTF16(cloudDataRaw);
                        if (decompressed) {
                            cloudState = JSON.parse(decompressed);
                            console.log("☁️ Cloud: Salvataggio compresso caricato.");
                        } else {
                            cloudState = JSON.parse(cloudDataRaw);
                        }
                    } else {
                        cloudState = cloudDataRaw;
                        console.log("☁️ Cloud: Salvataggio legacy rilevato.");
                    }

                    // === LANCIO PRODUZIONE: Season 1 / Fondatore (cloud) ===
                    // Un cloud save pre-lancio (schemaVersion < 3) va azzerato a Season 1.
                    // Gestito PRIMA dell'anti-rollback: dopo il reset i lifetime locali
                    // sono 0 e il comparatore sceglierebbe il cloud (più "avanti"),
                    // resuscitando i vecchi progressi. Supera il vecchio blocco V1→V2 sotto.
                    const _cloudSchema = Number(cloudState && cloudState.schemaVersion) || 1;
                    // Cloud ancora pre-wipe → ogni push risponderà 'conflict' finché il
                    // season-wipe backend non è attivo: sopprime badge e auto-resync
                    // (vedi markCloudUnsynced). Si azzera al primo push riuscito.
                    w._cloudPreWipe = _cloudSchema < 3;
                    if (_cloudSchema < 3) {
                        if (w._launchMigrationDone || (store.gameState && store.gameState.launchMigrated)) {
                            // Già migrato in locale — in QUESTA sessione (flag window) o in una
                            // precedente (marker `launchMigrated` persistito nel save): il cloud
                            // pre-lancio è stale. Tieni il locale (Season 1) e ri-pushalo.
                            // Senza il marker persistito, ogni F5/riapertura post-migrazione
                            // rifaceva la migrazione dal cloud azzerando i progressi Season 1.
                            console.warn("🚀 Cloud pre-lancio ignorato: Season 1 già applicata in locale.");
                            const _sess = sessionStorage.getItem('espooUser');
                            if (_sess) store.gameState.user.username = _sess;
                            saveGame();
                            if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
                            if (typeof w.updateUI === 'function') w.updateUI();
                            return;
                        }
                        // Nessun save locale migrato (es. nuovo dispositivo): migra dal cloud.
                        applyLaunchMigration(cloudState, 'cloud');
                        return;
                    }

                    // --- 2. PROTEZIONE ANTI-ROLLBACK ---
                    // Recovery da conflitto (opts.force): salta il guard. Il server ha già
                    // stabilito che il cloud è autoritativo (Format>Prestige>Score); il
                    // confronto solo-lifetimeScore qui NON basta a risolvere i conflitti di
                    // prestige/format, e senza questo by-pass il client resterebbe bloccato.
                    if (!(opts && opts.force) && store.gameState && store.gameState.lifetimeScore) {
                        // F2 → F8: delega a EspoV3 la STESSA gerarchia del server
                        // (Format > Prestige > Score, EF Supabase save-progress) → client e
                        // server decidono allo stesso modo anche nei casi limite in cui il
                        // solo lifetimeScore darebbe il verdetto opposto (es. cloud
                        // formattato di recente con lifetime più basso).
                        const keepLocal = window.EspoV3.save.antiRollback.decide({
                            totalFormattazioni: store.gameState.totalFormattazioni || 0,
                            lifetimePrestigePoints: String(store.gameState.lifetimePrestigePoints || 0),
                            lifetimeScore: String(store.gameState.lifetimeScore || 0),
                        }, {
                            totalFormattazioni: cloudState.totalFormattazioni || 0,
                            lifetimePrestigePoints: cloudState.lifetimePrestigePoints || 0,
                            lifetimeScore: cloudState.lifetimeScore || 0,
                        }) !== 'cloud'; // 'local' e 'equal' → tieni il locale (come il gte legacy)

                        if (keepLocal) {
                            console.warn("⚠️ Cloud Save obsoleto rilevato. Mantengo i dati locali più recenti.");

                            const currentSessionUser = sessionStorage.getItem('espooUser');
                            if (currentSessionUser && store.gameState.user.username !== currentSessionUser) {
                                store.gameState.user.username = currentSessionUser;
                            }

                            saveGame();
                            if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
                            w.updateUI();
                            return;
                        }
                    }

                    // ========================================================
                    // 3. MIGRAZIONE V1 -> V2 (CLOUD)
                    // ========================================================
                    const cloudMajor = (cloudState.version && cloudState.version.major) ? cloudState.version.major : 1;
                    const currentMajor = w.GAME_VERSION ? w.GAME_VERSION.major : 2;

                    let cloudIsVeteran = false;
                    try { if (cloudState.totalScore && new w.Decimal(cloudState.totalScore).gt(10000)) cloudIsVeteran = true; } catch(e){}

                    if (cloudMajor < 2 && currentMajor >= 2) {
                        console.log("☁️ Migrazione Cloud V1 -> V2 rilevata!");

                        // F2 strangler: il calcolo del salvage (skin, volume, contatori
                        // storici, premio veterano) è delegato al framework migrazioni V3
                        // (puro, testato). Qui restano orchestrazione e side-effect (reset,
                        // iniezione nello stato live, save, UI). Il GATE resta su
                        // version.major: i save legacy non hanno il campo schemaVersion,
                        // quindi lo passiamo esplicito (=1) al framework.
                        const migrated = window.EspoV3.migrations.migrate(Object.assign({}, cloudState, { schemaVersion: 1 }));
                        const m = migrated.state!;
                        const savedSkins = m.skins.unlocked;
                        const currentSkin = m.skins.current;
                        const masterVol = m.user.masterVolume;
                        const cloudLifetime = m.lifetimeScore;
                        const cloudTotal = m.totalScore;
                        cloudIsVeteran = !!(migrated.report && migrated.report.veteranReward);

                        // B. Reset e genera stato pulito
                        if (typeof w.resetGameToDefault === 'function') w.resetGameToDefault();

                        // C. Inietta i dati salvati
                        store.gameState.skins.unlocked = savedSkins;
                        store.gameState.skins.current = currentSkin;
                        store.gameState.user.masterVolume = masterVol;
                        store.gameState.lifetimeScore = new w.Decimal(cloudLifetime);
                        store.gameState.totalScore = new w.Decimal(cloudTotal);

                        // D. PREMIO VETERANO (solo se aveva un punteggio significativo)
                        if (cloudIsVeteran) {
                            store.gameState.totalFormattazioni = 1;
                            store.gameState.qBits = new w.Decimal(1);
                            store.gameState.lifetimeQBits = new w.Decimal(1);
                            w.triggerV2MigrationModal = true;
                        }

                        // E. Aggiorna versione e username
                        if (w.GAME_VERSION) {
                            store.gameState.version = JSON.parse(JSON.stringify(w.GAME_VERSION));
                        }
                        const currentSessionUser = sessionStorage.getItem('espooUser');
                        if (currentSessionUser) store.gameState.user.username = currentSessionUser;

                        // F. Flag Release Notes
                        w.shouldShowReleaseNotesOnLoad = true;

                        // G. Salva subito in cloud per allineare il DB
                        saveGame();
                        localStorage.setItem('espotoolClickerSaveV9', w.LZString.compressToUTF16(JSON.stringify(store.gameState)));

                        if (typeof w.applySkinVisuals === 'function') w.applySkinVisuals(store.gameState.skins.current);
                        w.calculatePrestigeBonus();
                        w.recalculateCPS();
                        if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
                        if (typeof w.updateAchievementsUI === 'function') w.updateAchievementsUI();
                        if (typeof w.updateUI === 'function') w.updateUI();

                        if (cloudIsVeteran) {
                            w.showToast("Migrazione V2 completata! Benvenuto nella nuova era.", 'success');
                        }
                        return;
                    }
                    // ========================================================

                    // 4. Reset preventivo della memoria per partire puliti (Solo se carichiamo davvero dal cloud)
                    if (typeof w.resetGameToDefault === 'function') w.resetGameToDefault();

                    // Pulizia grafica liste
                    const achList = document.getElementById('achievement-list');
                    if (achList) achList.innerHTML = '';

                    // --- 5. CONTROLLO COMPATIBILITÀ CLOUD ---
                    if (!checkSaveCompatibility(cloudState)) {
                        console.warn("⚠️ Cloud Save incompatibile: Eseguo migrazione e sovrascrittura.");

                        // Sincronizziamo i punteggi dal Cloud AL Locale PRIMA di salvare.
                        // Questo serve a passare il controllo "Anti-Rollback" del file PHP.
                        if (cloudState.score) store.gameState.score = new w.Decimal(cloudState.score);
                        if (cloudState.totalScore) store.gameState.totalScore = new w.Decimal(cloudState.totalScore);
                        if (cloudState.lifetimeScore) store.gameState.lifetimeScore = new w.Decimal(cloudState.lifetimeScore);
                        if (cloudState.prestigePoints) store.gameState.prestigePoints = new w.Decimal(cloudState.prestigePoints);
                        if (cloudState.totalResets) store.gameState.totalResets = cloudState.totalResets;

                        // Aggiorniamo la versione alla corrente
                        if (w.GAME_VERSION) {
                            store.gameState.version = JSON.parse(JSON.stringify(w.GAME_VERSION));
                        }

                        // Username Sessione (lo manteniamo)
                        const currentSessionUser2 = sessionStorage.getItem('espooUser');
                        if (currentSessionUser2) store.gameState.user.username = currentSessionUser2;

                        // SALVIAMO SUBITO per aggiornare il Database con la versione corretta
                        saveGame();

                        w.showToast("Salvataggio Cloud aggiornato alla nuova versione!", 'warning');
                        return;
                    }

                    // Compatibilità Legacy (per versioni minori compatibili)
                    if (cloudState.buildings && !cloudState.teams) {
                        cloudState.teams = cloudState.buildings;
                        delete cloudState.buildings;
                    }

                    // 6. Uniamo i dati (Merge)
                    // Flag Release Notes PRIMA del merge: subito dopo gameState.version
                    // eredita quella (vecchia) del cloud. Senza questo il messaggio novità
                    // non compariva al login da cloud (device nuovo / cache pulita).
                    const cloudShowRN = shouldShowReleaseNotesFor(cloudState.version);
                    // Stesso motivo del percorso locale: la versione di provenienza va letta
                    // prima del merge, che porta gameState.version su quella del cloud.
                    const cloudV3Audio = shouldApplyV3AudioOnboardingFor(cloudState.version);
                    deepMerge(store.gameState, cloudState);

                    // 6. Ripristino oggetti Decimali
                    const decimalFields = [
                        'score', 'totalScore', 'lifetimeScore', 'totalOfflineScore',
                        'prestigePoints', 'lifetimePrestigePoints', 'baseClickValue',
                        'qBits', 'lifetimeQBits'
                    ];
                    decimalFields.forEach(field => {
                        store.gameState[field] = new w.Decimal(store.gameState[field] || 0);
                    });
                    if (store.gameState.baseClickValue.eq(0)) store.gameState.baseClickValue = new w.Decimal(1);

                    // Inizializza strutture mancanti
                    if (!store.gameState.buildingEnhancements) store.gameState.buildingEnhancements = {};
                    for (const key in store.gameData.buildingEnhancements) {
                        if (!store.gameState.buildingEnhancements[key]) {
                            store.gameState.buildingEnhancements[key] = { purchased: false };
                        }
                    }

                    if (!store.gameState.skins || !Array.isArray(store.gameState.skins.unlocked))
                        store.gameState.skins = { current: 'default', unlocked: ['default'] };

                    // Ripristino effetti attivi
                    const isFuryActive = (store.gameState.crunchTimeEndTime > Date.now());
                    if (isFuryActive && typeof w.resumeCrunchTimeEffects === 'function') {
                        w.resumeCrunchTimeEffects();
                    } else {
                        if (typeof w.applySkinVisuals === 'function')
                            w.applySkinVisuals(store.gameState.skins.current);
                    }

                    // Username Sessione
                    const currentSessionUser = sessionStorage.getItem('espooUser');
                    if (currentSessionUser && store.gameState.user.username !== currentSessionUser)
                        store.gameState.user.username = currentSessionUser;

                    // Allinea la versione del save alla corrente + flag novità.
                    // (Il merge sopra lasciava la versione VECCHIA ereditata dal cloud, così
                    // il messaggio non compariva al login o appariva in ritardo a un F5.)
                    if (w.GAME_VERSION) {
                        store.gameState.version = {
                            major: w.GAME_VERSION.major,
                            minor: w.GAME_VERSION.minor,
                            stage: w.GAME_VERSION.stage
                        };
                    }
                    if (cloudShowRN) w.shouldShowReleaseNotesOnLoad = true;
                    // Provenienza pre-3.0 (save cloud, autoritativo): audio ON + musica V3, una volta.
                    if (cloudV3Audio) applyV3AudioOnboarding();

                    // Ricalcoli logica
                    w.calculatePrestigeBonus();
                    w.recalculateCPS();

                    if (typeof w.refreshAllStores === 'function') w.refreshAllStores();
                    if (typeof w.updateAchievementsUI === 'function') w.updateAchievementsUI();
                    if (typeof w.updateUI === 'function') w.updateUI();

                    // Sovrascrivi cache locale per allinearla al cloud caricato
                    localStorage.setItem('espotoolClickerSaveV9', w.LZString.compressToUTF16(JSON.stringify(store.gameState)));

                    // Recupero Skin mancanti da achievement (Fix retroattivo)
                    for (const key in store.gameData.achievements) {
                        const achData = store.gameData.achievements[key];
                        const achState = store.gameState.achievements[key];
                        if (achState && achState.claimed && achData.reward && achData.reward.type === 'skin') {
                            const skinId = achData.reward.id;
                            if (store.gameState.skins.unlocked && !store.gameState.skins.unlocked.includes(skinId)) {
                                store.gameState.skins.unlocked.push(skinId);
                            }
                        }
                    }

                    checkOfflineProgress();
                    if (typeof w.updateAmbientVolume === 'function') w.updateAmbientVolume();

                    w.showToast(store.gameData.texts.toasts.cloudSync);
                    setTimeout(() => {
                        // Non re-inizializzare: le istanze Howl esistono già dal boot.
                        // Basta aggiornare volumi/traccia con i dati caricati dal cloud.
                        if (typeof w.AudioManager !== 'undefined') w.AudioManager.updateAmbience();
                        w.EspooClicker.tryStartAudio();
                    }, 500);

                } catch (e) {
                    console.error("Errore parsing cloud", e);
                }
            }
        },
    };

    let originalTitle = document.title;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) document.title = 'I bug si accumulano...';
        else document.title = originalTitle;

        if (document.visibilityState === 'visible') {
            lastFrameTime = Date.now(); // Resetta il timer per evitare salti
            checkOfflineProgress();       // Controlla se mostrare il modale offline
        }
    });

    // Attendi il caricamento del salvataggio LOCALE prima di emettere EspoGameReady,
    // che innesca l'auto-login e quindi il caricamento CLOUD. In questo modo il cloud
    // (autoritativo per un utente loggato) è SEMPRE l'ultimo a scrivere
    // masterVolume/audio/icona: niente più race tra load locale e cloud che lasciava
    // l'icona su "mute" mentre l'audio era attivo (dopo clean cache + Shift+F5).
    // .finally garantisce che EspoGameReady venga emesso anche se loadGame fallisce.
    Promise.resolve(initializeGame())
        .catch(e => console.error("Errore in initializeGame/loadGame:", e))
        .finally(() => {
            document.dispatchEvent(new Event('EspoGameReady'));
            console.log("✅ Evento EspoGameReady inviato.");
        });
  });
}
