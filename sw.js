// ============================================================
// ESPO CLICKER - Service Worker v2.0
// Strategy: Cache-First per assets statici, Network-First per API
// ============================================================

const CACHE_VERSION = 'espo-v2.1';
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

// Pattern per richieste che NON devono essere cachate
const NO_CACHE_PATTERNS = [
    /\/php\//,           // API PHP (login, save, leaderboard)
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
// INSTALL - Pre-cache degli asset critici
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installazione in corso...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching assets critici');
                // Usa addAll con catch individuale per non bloccare tutto se un asset fallisce
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Pre-cache fallito per: ${url}`, err.message);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ============================================================
// ACTIVATE - Pulizia cache vecchie
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Attivazione...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => {
                        console.log(`[SW] Rimossa cache vecchia: ${key}`);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================================
// FETCH - Strategia di caching intelligente
// ============================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = request.url;

    // Skip: richieste non-GET (POST per save/login)
    if (request.method !== 'GET') return;

    // Skip: richieste API PHP (sempre network)
    if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url))) return;

    // Strategy: Cache-First per assets statici
    if (STATIC_PATTERNS.some(pattern => pattern.test(url))) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Strategy: Network-First per navigazione (index.php)
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Default: Stale-While-Revalidate per tutto il resto
    event.respondWith(staleWhileRevalidate(request));
});

// ============================================================
// STRATEGIE DI CACHE
// ============================================================

// Cache-First: Prende dalla cache, fallback su network
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
        // Offline fallback: cerca qualsiasi versione cached
        const fallback = await caches.match(request, { ignoreSearch: true });
        if (fallback) return fallback;
        return new Response('Offline', { status: 503 });
    }
}

// Network-First: Prova network, fallback su cache
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
        // Offline: mostra la pagina cachata
        return caches.match('./index.php');
    }
}

// Stale-While-Revalidate: Serve dalla cache, aggiorna in background
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, response.clone());
            });
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}

// ============================================================
// GESTIONE DIMENSIONE CACHE
// ============================================================
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        await cache.delete(keys[0]);
        return trimCache(cacheName, maxItems);
    }
}

// Pulizia periodica della cache dinamica
self.addEventListener('message', (event) => {
    if (event.data === 'trimCache') {
        trimCache(DYNAMIC_CACHE, 100);
    }
});
