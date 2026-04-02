// ============================================================
// ESPO CLICKER - Service Worker v3.0
// Auto-update: rileva nuova versione → pulisce cache → ricarica
// ============================================================

const CACHE_VERSION = 'espo-v3.0.5';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Asset critici da pre-cachare all'installazione
const PRECACHE_ASSETS = [
    './',
    './index.php',
    './css/keyframes.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/navbar.css',
    './css/clicker.css',
    './css/store.css',
    './css/modals-core.css',
    './css/modals-content.css',
    './css/modals-arcade.css',
    './css/skins.css',
    './css/skins-modern.css',
    './css/podio.css',
    './css/mobile.css',
    './css/mobile-simplified.css',
    './js/version-config.js',
    './js/data/core.js',
    './js/data/assets.js',
    './js/data/skins.js',
    './js/data/teams.js',
    './js/data/upgrades.js',
    './js/data/achievements.js',
    './js/data/events.js',
    './js/data/texts.js',
    './js/data/gamestate.js',
    './js/ui-functions.js',
    './js/game-logic.js',
    './js/script.js',
    './js/podio.js',
    './js/modals.js',
    './assets/image/favicon.webp',
    './assets/image/icons/icon-192.png',
    './assets/image/icons/icon-512.png',
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
// ============================================================
self.addEventListener('install', (event) => {
    console.log(`[SW] Installazione ${CACHE_VERSION}...`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Pre-cache fallito: ${url}`, err.message);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting()) // Attiva subito, non aspettare tab chiuse
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
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const fallback = await caches.match(request, { ignoreSearch: true });
        if (fallback) return fallback;
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
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
        if (response.ok) {
            const clone = response.clone(); // Clone sincrono PRIMA che il body venga consumato
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
