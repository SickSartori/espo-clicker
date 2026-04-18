// ============================================================
// ESPO CLICKER - Service Worker v3.0
// Auto-update: rileva nuova versione → pulisce cache → ricarica
// Bundle JS/CSS, IndexedDB save V9
// ============================================================

const CACHE_VERSION = 'espo-v3.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Asset critici da pre-cachare all'installazione
const PRECACHE_ASSETS = [
    './',
    './index.php',

    // JS + CSS Bundle (esbuild minificato)
    './dist/game.bundle.min.js',
    './dist/styles.bundle.min.css',
    './dist/styles.mobile.min.css',

    // ── Pacchetto CORE ────────────────────────────────────────
    './assets/image/skins/espo.webp',
    './assets/image/skins/espo-click.webp',
    './assets/image/ui/bug.webp',
    './assets/image/ui/hidden.webp',
    './assets/image/ui/super-block.webp',
    './assets/image/ui/star.png',

    // ── Pacchetto UI/PWA ──────────────────────────────────────
    './assets/image/ui/favicon.webp',
    './assets/image/icons/icon-192.png',
    './assets/image/icons/icon-512.png',
    './assets/image/logo.svg',
    './assets/image/ico.svg',

    // ── Pacchetto SKINS_COMMON (pre-cached: ~358 KB totale) ───
    './assets/image/skins/espobit.webp',
    './assets/image/skins/espobit-click.webp',
    './assets/image/skins/espobit-matrix.webp',
    './assets/image/skins/espobit-matrix-click.webp',
    './assets/image/skins/espobit-fury.webp',
    './assets/image/skins/espobit-fury-click.webp',
    './assets/image/skins/esponatale.webp',
    './assets/image/skins/esponatale-click.webp',
    './assets/image/skins/initiale.webp',
    './assets/image/skins/initiale-click.webp',

    // ── Pacchetto SKINS_RARE (pre-cached: ~297 KB totale) ────
    './assets/image/skins/esporator.webp',
    './assets/image/skins/esporator-click.webp',
    './assets/image/skins/esponese.webp',
    './assets/image/skins/esponese-click.webp',
    './assets/image/skins/espocorno.webp',
    './assets/image/skins/espocorno-click.webp',

    // ── SKINS_EPIC/LEGENDARY/FURY → Dynamic Cache ─────────────
    // Quelle più pesanti (esportia ~637 KB, fury ~2.2 MB)
    // vengono cachate dal SW dinamicamente alla prima richiesta.

    './manifest.json'
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
    /check_version/
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
    /fontawesome/,
    /concat\.php\?bundle=/ // Fallback per concat.php (deprecato)
];

// ============================================================
// INSTALL - Pre-cache + forza attivazione immediata
// Carica gli asset in batch da 3 per non saturare Altervista.
// ============================================================
async function precacheBatched(cache, urls, batchSize) {
    for (var i = 0; i < urls.length; i += batchSize) {
        var batch = urls.slice(i, i + batchSize);
        await Promise.allSettled(
            batch.map(url =>
                cache.add(url).catch(err => {
                    console.warn(`[SW] Pre-cache fallito: ${url}`, err.message);
                })
            )
        );
    }
}

self.addEventListener('install', (event) => {
    console.log(`[SW] Installazione ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => precacheBatched(cache, PRECACHE_ASSETS, 3))
            .then(() => self.skipWaiting())
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

    if (event.request.headers.has('range') || event.request.url.match(/\.(mp3|wav|ogg)$/i)) {
        event.respondWith(fetch(event.request));
        return;
    }

    const { request } = event;
    const url = request.url;

    if (request.method !== 'GET') return;
    if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url))) return;

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

    // Retry fino a 2 volte in caso di connessione resettata
    let networkResponse;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            networkResponse = await fetch(request);
            break;
        } catch (err) {
            if (attempt === 2) throw err;
            await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        }
    }

    if (!request.url.startsWith('http')) {
        return networkResponse;
    }

    if (networkResponse.status !== 206) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
    }

    return networkResponse;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        // FIX: Controllo del protocollo prima di salvare in cache
        if (response.ok && request.url.startsWith('http')) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
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