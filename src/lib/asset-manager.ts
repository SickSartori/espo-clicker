/**
 * Bridge Asset Manager per il legacy (ex js/asset-manager.js — reorg C-thin,
 * 2026-07-12). La logica (retry+backoff, semaforo concorrenza, stato
 * pacchetti, piano progressivo) è src/core/assets/manager; qui restano il
 * rilevamento host, i limiti, il CustomEvent e il bootstrap DOM.
 * I listener DOMContentLoaded registrati a tempo-modulo sono equivalenti a
 * prima: i deferred/module eseguono tutti PRIMA che DOMContentLoaded scatti.
 */
import { createAssetManager } from '../core/assets/manager';
import { isLocalHost } from './host-env';

export function installAssetManager(): void {
    if (typeof window === 'undefined') return;

    // Percorso base per le immagini
    const IMG_BASE = 'assets/image/';
    let _bootDone = false; // True dopo che il gioco ha fatto il boot

    // Host deployato (non locale): rallenta i caricamenti (concorrenza e retry)
    // perché Altervista chiude connessioni con ERR_CONNECTION_RESET sotto burst.
    // Prima era inchiodato su 'altervista.org'; ora copre anche il dominio custom
    // (stesso hardware Altervista). ⚠️ Su Cloudflare Pages il throttle non serve —
    // rilassare al cutover. Sul sottodominio/localhost attuali: invariato.
    var IS_REMOTE = !isLocalHost(location.hostname);
    var MAX_RETRIES = IS_REMOTE ? 4 : 3;
    var RETRY_DELAY_MS = 800;
    var MAX_CONCURRENT = IS_REMOTE ? 2 : 3;

    // Emetti un evento quando un pacchetto è pronto (il resto del gioco lo ascolta).
    function _emitLoaded(packageName: string, pkg: any): void {
        try {
            window.dispatchEvent(new CustomEvent('assetPackageLoaded', {
                detail: { name: packageName, label: pkg.label }
            }));
        } catch (e) { /* fallback silenzioso */ }
    }

    var _mgr = createAssetManager({
        getPackages: function () { return (window as any).ASSET_PACKAGES; },
        imgBase: IMG_BASE,
        maxConcurrent: MAX_CONCURRENT,
        maxRetries: MAX_RETRIES,
        retryDelayMs: RETRY_DELAY_MS,
        onPackageLoaded: function (name: string, pkg: any) { _emitLoaded(name, pkg); },
        onLog: function (m: string) { console.log(m); },
        onWarn: function (m: string) { console.warn(m); },
    });

    (window as any).AssetManager = {
        isLoaded: function (name: string) { return _mgr.isLoaded(name); },
        isLoading: function (name: string) { return _mgr.isLoading(name); },
        load: function (name: string) { return _mgr.load(name); },
        loadMultiple: function (names: string[]) { return _mgr.loadMultiple(names); },
        status: function () { return _mgr.status(); },
        notifyBootDone: function () {
            if (_bootDone) return;
            _bootDone = true;
            console.log('[AssetManager] 🚀 Boot completato — avvio caricamento progressivo.');
            _mgr.progressivePlan(IS_REMOTE).forEach(function (item: any) {
                setTimeout(function () { _mgr.load(item.name); }, item.delay);
            });
        },
    };

    // ─────────────────────────────────────────────────────────
    // Bootstrap automatico
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        // 1. Carica immediatamente il pacchetto CORE
        (window as any).AssetManager.load('CORE');

        // 2. Ascolta l'evento di boot completato del gioco; fallback a timeout 5s.
        window.addEventListener('gameBootComplete', function () {
            (window as any).AssetManager.notifyBootDone();
        }, { once: true });

        setTimeout(function () {
            (window as any).AssetManager.notifyBootDone();
        }, 5000);

    });

    // ─────────────────────────────────────────────────────────
    // Integrazione con lo Shop Skins: precarica i pacchetti skin
    // mancanti all'apertura così le anteprime non hanno ritardi.
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        var skinsBtn = document.getElementById('open-skins-btn');
        if (!skinsBtn) return;

        skinsBtn.addEventListener('click', function () {
            var skinPackages = [
                'SKINS_COMMON',
                'SKINS_RARE',
                'SKINS_EPIC',
                'SKINS_LEGENDARY',
                'THEME_DIVINE',
            ];
            (window as any).AssetManager.loadMultiple(skinPackages);
        }, { once: true }); // once: al secondo click sono già in cache
    });
}
