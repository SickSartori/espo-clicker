// ============================================================
// ESPO CLICKER - Service Worker v3.1.2
// Auto-update: rileva nuova versione → pulisce cache → ricarica
// Bundle JS/CSS, IndexedDB save V9
// ============================================================

const CACHE_VERSION = 'espo-v3.1.2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Pre-cache MINIMO: solo file indispensabili al primo paint.
// Su Altervista limitare burst HTTP all'install riduce ERR_CONNECTION_RESET.
// Tutto il resto (skin, audio, ecc.) finisce in Dynamic Cache on-demand.
const PRECACHE_ASSETS = [
    './',
    './index.php',
    './manifest.json',

    // NB: i bundle dist/*.min.{js,css} NON sono pre-cachati qui: la pagina li richiede
    // con ?v=<filemtime>, mentre questi URL (senza query) non verrebbero mai trovati da
    // caches.match. Vengono cachati on-demand in DYNAMIC_CACHE al primo fetch reale.

    // Solo asset above-the-fold critici
    './assets/image/skins/espo.webp',
    './assets/image/skins/espo-click.webp',
    './assets/image/ui/favicon.webp',
    './assets/image/ico.svg',

    // Font logo (loader title)
    './assets/fonts/Harabara.ttf'
];

// Pattern per richieste che NON devono essere cachate (API PHP)
const NO_CACHE_PATTERNS = [
    /\/php\//,
    /save_progress/,
    /login_register/,
    /get_leaderboard/,
    /change_password/,
    /change_username/,
    /delete_user/,
    /reset_progress/,
    /check_version/,
    // --- CODICE ARCADE: mai cachato dal SW → sempre fresco (niente versioni stale) ---
    /\/arcade\/[^?]*\.(?:js|css)(?:\?|$)/, // JS/CSS dei giochi (arcade/<gioco>/...)
    /arcade-fullscreen\.css/,
    /arcade-page\.js/,
    /arcade-loader\.js/,
    /cheatboard\.js/ // tool dev: sempre fresco, mai cachato (come i file arcade)
];

// Pattern per assets statici (cache-first)
const STATIC_PATTERNS = [
    /\/dist\/.+\.(js|css)(\?|$)/,  // esbuild bundles — cache immutable 1 anno
    /\.css(\?|$)/,
    /\.js(\?|$)/,
    /\.webp(\?|$)/,
    /\.png(\?|$)/,
    /\.jpg(\?|$)/,
    /\.mp3(\?|$)/,
    /\.ogg(\?|$)/,
    /\.mp4(\?|$)/,
    /\.woff2?(\?|$)/,
    /fonts\.googleapis/,
    /fonts\.gstatic/,
    /cdnjs\.cloudflare/,
    /cdn\.jsdelivr/,
    /fontawesome/
];

// ============================================================
// INSTALL - Pre-cache + forza attivazione immediata
// Batch da 2 con retry esponenziale + jitter per Altervista.
// ============================================================
async function _fetchWithRetry(url, maxAttempts) {
    var attempts = maxAttempts || 4;
    var lastErr;
    for (var i = 0; i < attempts; i++) {
        try {
            var res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) return res;
            lastErr = new Error('HTTP ' + res.status);
        } catch (err) {
            lastErr = err;
        }
        // Backoff esponenziale + jitter random (evita thundering herd)
        var base = 600 * Math.pow(2, i);
        var jitter = Math.floor(Math.random() * 400);
        await new Promise(r => setTimeout(r, base + jitter));
    }
    throw lastErr;
}

async function precacheBatched(cache, urls, batchSize) {
    for (var i = 0; i < urls.length; i += batchSize) {
        var batch = urls.slice(i, i + batchSize);
        await Promise.allSettled(
            batch.map(async (url) => {
                try {
                    var res = await _fetchWithRetry(url, 4);
                    await cache.put(url, res);
                } catch (err) {
                    console.warn('[SW] Pre-cache fallito definitivamente:', url, err && err.message);
                }
            })
        );
    }
}

self.addEventListener('install', (event) => {
    console.log(`[SW] Installazione ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => precacheBatched(cache, PRECACHE_ASSETS, 2))
    );
});

// ============================================================
// ACTIVATE - Pulisci TUTTE le cache vecchie + notifica client
// ============================================================
self.addEventListener('activate', (event) => {
    console.log(`[SW] Attivazione ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => {
                        console.log(`[SW] Cache rimossa: ${key}`);
                        return caches.delete(key);
                    })
            );
        })
            .then(() => self.clients.claim()) // Prendi controllo di tutti i tab aperti
            .then(() => {
                // Notifica tutti i client: "nuova versione attiva, ricarica"
                return self.clients.matchAll({ type: 'window' }).then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SW_UPDATED',
                            version: CACHE_VERSION
                        });
                    });
                });
            })
    );
});

// ============================================================
// FETCH - Strategia intelligente con cache-bust sui file versionati
// ============================================================
self.addEventListener('fetch', (event) => {

    // Range request → mai cachare (streaming parziale audio/video)
    if (event.request.headers.has('range')) {
        event.respondWith(fetch(event.request));
        return;
    }

    const { request } = event;
    const url = request.url;

    if (request.method !== 'GET') return;
    if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url))) return;

    // V3 Vite bundle (dentro dist/): stale-while-revalidate per evitare cache
    // stale dopo rebuild senza dover bumpare CACHE_VERSION manualmente.
    // Il filemtime nel link PHP garantisce comunque cache-bust deterministico.
    if (/\/dist\/(game\.modules\.js|chunks\/|assets\/)/.test(url)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Cache-First per assets statici
    if (STATIC_PATTERNS.some(pattern => pattern.test(url))) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Network-First per navigazione
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Default: Stale-While-Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// ============================================================
// MESSAGE - Gestione comandi dal client
// ============================================================
self.addEventListener('message', (event) => {
    if (event.data === 'trimCache') {
        trimCache(DYNAMIC_CACHE, 80);
    }
    // Il client può chiedere la versione corrente
    if (event.data === 'GET_VERSION') {
        event.source.postMessage({
            type: 'SW_VERSION',
            version: CACHE_VERSION
        });
    }
    // Attiva nuovo SW con consenso utente (no cache wipe)
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    // Force update: pulisci tutto e ricarica
    if (event.data === 'FORCE_UPDATE') {
        caches.keys().then(keys => {
            return Promise.all(keys.map(k => caches.delete(k)));
        }).then(() => {
            self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(c => c.postMessage({ type: 'SW_FORCE_RELOAD' }));
            });
        });
    }
});

// ============================================================
// STRATEGIE DI CACHE
// ============================================================

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // Retry fino a 4 volte con backoff esponenziale + jitter
    // (Altervista chiude connessioni con ERR_CONNECTION_RESET sotto carico)
    let networkResponse;
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            networkResponse = await fetch(request);
            break;
        } catch (err) {
            lastErr = err;
            if (attempt === 3) throw err;
            const base = 600 * Math.pow(2, attempt);
            const jitter = Math.floor(Math.random() * 400);
            await new Promise(r => setTimeout(r, base + jitter));
        }
    }

    if (!networkResponse) throw lastErr;

    if (!request.url.startsWith('http')) {
        return networkResponse;
    }

    // Cacha solo risposte complete (no 206 partial, no errori)
    if (networkResponse.ok && networkResponse.status !== 206) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone()).catch(() => { });
    }

    return networkResponse;
}

// Timeout oltre il quale, se ho gia' una copia in cache, smetto di aspettare la rete.
// Altervista (hosting condiviso) ha un TTFB su index.php molto variabile: misurato
// 63ms..4400ms per la STESSA richiesta. Senza timeout, networkFirst bloccava OGNI
// navigazione dietro il picco lento anche con la pagina gia' in cache. La copia in
// cache di index.php e' sempre la versione GIOCO (il countdown de-registra il SW,
// quindi non viene mai cachato), quindi servirla e' sempre corretto.
const NAV_NETWORK_TIMEOUT = 2500;

async function networkFirst(request) {
    const cached = await caches.match(request);

    const netPromise = fetch(request).then((response) => {
        if (response.ok && request.url.startsWith('http')) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
        }
        return response;
    });

    // Con una copia in cache: corsa rete-vs-timeout. Se la rete non risponde in tempo,
    // servo la cache SUBITO e lascio che l'aggiornamento continui in background.
    if (cached) {
        try {
            const winner = await Promise.race([
                netPromise,
                new Promise((resolve) => setTimeout(() => resolve('__timeout__'), NAV_NETWORK_TIMEOUT)),
            ]);
            if (winner !== '__timeout__') return winner; // rete arrivata prima del timeout
        } catch (_) {
            return cached; // rete fallita: la cache e' il miglior risultato
        }
        netPromise.catch(() => {}); // evita unhandled rejection: l'update prosegue dietro
        return cached;
    }

    // Nessuna cache (primo load): comportamento originale — aspetta la rete.
    try {
        return await netPromise;
    } catch (err) {
        return caches.match('./index.php');
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then(response => {
        // FIX: Controllo del protocollo prima di salvare in cache
        if (response.ok && request.url.startsWith('http')) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, clone);
            });
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}

async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        await cache.delete(keys[0]);
        return trimCache(cacheName, maxItems);
    }
}