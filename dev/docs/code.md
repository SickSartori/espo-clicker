# 📘 Documentazione Tecnica: Espòòò Clicker

Questa documentazione analizza la struttura, la logica di gioco e il funzionamento del backend del progetto. Il gioco è un **Incremental Clicker Game** basato su web (HTML5/JS) con un backend PHP/MySQL per la persistenza dei dati e le classifiche.

---

## 🏗️ 1. Architettura del Sistema

Il progetto segue un'architettura **Client-Server**:
* **Frontend (Client):** Gestisce tutta la logica di gioco (calcolo risorse, acquisti, eventi, rendering UI) in tempo reale tramite JavaScript. Lo stato è mantenuto in memoria e sincronizzato con `localStorage` (con compressione LZString) e il Server.
* **Backend (Server):** Espone API RESTful in PHP per autenticazione, salvataggio cloud, reset progressi e gestione della classifica globale.
* **Database:** MySQL per memorizzare utenti, salvataggi (BLOB JSON compresso) e punteggi.

---

## 🕹️ 2. Logica Frontend (JavaScript)

Il cuore del gioco è suddiviso in diversi moduli JS modulari caricati in `index.php`.

### A. Configurazione & Versioning (`version-config.js`)
Punto di ingresso per la definizione della versione.
* Definisce l'oggetto globale `GAME_VERSION` (`major`, `minor`, `stage`).
* Gestisce i controlli di compatibilità dei salvataggi (evita di caricare salvataggi *Beta* su versioni *Stable* e viceversa).

### B. Gestione Dati (`game-data.js`) - **[CORE]**
Questo file è la **Fonte di Verità Assoluta**. Il gioco è **Data-Driven**: l'interfaccia si costruisce leggendo questo file.

* **`gameData`**: Oggetto gigante che contiene:
    * **`assets`:** Registro audio/video con volumi e categorie.
    * **`teams`:** Definizione teams (costi, BPS).
    * **`clickUpgrades` / `buildingEnhancements` / `prestigeUpgrades`:** Liste potenziamenti.
    * **`achievements`:** Obiettivi, condizioni logiche e premi.
    * **`skins`:** Configurazioni estetiche, rarità, VFX e temi speciali.
    * **`events`:** Configurazioni eventi (durata, moltiplicatori, video).

### C. Motore di Gioco (`game-logic.js`)
Gestisce la matematica, l'economia e gli eventi.

* **Audio Manager:** Gestione centralizzata dei volumi con priorità (Evento > Natale > Background) e supporto "Smart Resume" per aggirare i blocchi autoplay dei browser.
* **Event System (`EventHandlers`):** Sistema estensibile per gestire tipi di eventi diversi (Video, CSS Glitch) senza catene di `if/else`.
* **Calcoli Economici:**
    * `calculateClickValue()`: Centralizza la logica di guadagno per click (Click + Mano Bionica + Fury).
    * `calculateBulkCost()` & `calculateMaxAffordable()`: Formule matematiche sincronizzate per acquisti multipli (1x, 5x, MAX). Supportano numeri colossali tramite `break_infinity.js`.

### D. Gestione Interfaccia (`ui-functions.js` & `modals.js`)
Manipolazione del DOM ottimizzata per alte prestazioni (60fps).

* **Rendering Dinamico (`renderStoreSection`):** Una singola funzione genera l'HTML per *tutti* i negozi (Click, Auto, Lab) leggendo i dati.
* **DOM Caching:** Uso di `getEl()` e `setTextIfChanged()` per ridurre al minimo il repaint del browser e migliorare le performance su mobile.
* **Gestore VFX & Temi (`VFXManager` e `loadThemeCSS`):** Modulo centralizzato che carica i file CSS pesanti solo quando servono (Lazy Load), applica le Variabili CSS per le palette di colori e gestisce la riproduzione/pulizia degli effetti particellari (fuoco, neve, matrix) per evitare sovraccarichi o memory leak.

### E. Main Controller (`script.js`)
Il collante dell'applicazione.

* **Game Loop:**
    * **Fast Loop (30fps):** Calcolo risorse e logica di base basato su `deltaTime` (protetto dai salti temporali in background su mobile).
    * **Slow Loop (1fps):** Controlli pesanti (Achievement, Notifiche Tab) per risparmiare CPU.
* **Salvataggio (LZ-String):** Implementa la compressione dei dati JSON prima di salvarli in LocalStorage o Cloud, riducendo le dimensioni dell'80%.

---

## 🖥️ 3. Logica Backend (PHP & SQL)

### Database
* **`users`:** ID, username, hash password, `save_data` (LONGTEXT).
* **`leaderboard`:** username, score (max), prestigeLevel.
* **Configurazione:** `db_connect.php` usa `config.php` per switchare tra ambienti (es. tabelle `_dev` vs `_production`).

### API Endpoints
1.  **`login_register.php`:** Gestisce accesso, hash password e genera un Token Dinamico di Sessione per blindare le chiamate successive.
2.  **`save_progress.php`:** Riceve la stringa compressa e la salva nel DB validandola tramite l'Hash HMAC con il Token di Sessione. Implementa un controllo Anti-Rollback.
3.  **`submit_score.php`:** Aggiornamento della classifica pubblica (ordinata per Prestigio e poi Score).
4.  **`reset_progress.php` / `delete_user.php`:** Gestione reset e GDPR (cancellazione dati).

---

## 🚀 4. Funzionalità Chiave

1.  **Data-Driven Design:** Aggiungere contenuti non richiede modifiche alla logica JS.
2.  **Sistema Prestigio (Laboratorio):** Soft reset che converte i progressi in Token per acquistare potenziamenti permanenti e Skin esclusive.
3.  **Eventi Dinamici:**
    * **Golden Bug:** Apparizione casuale di bug dorati cliccabili.
    * **Espo Fury:** Abilità attiva (Cooldown) che moltiplica BPS x7.
    * **Eventi Visivi:** Errore 404 (Glitch CSS) e Rick Roll (Video Overlay).
4.  **Sistema Skin Avanzato e Modulare:** Le skin non cambiano solo l'immagine, ma agiscono come "Registi" dell'interfaccia. Possono modificare al volo i colori del gioco iniettando Variabili CSS, avviare colonne sonore specifiche, caricare layout CSS addizionali in Lazy-Load (es. 8-Bit) o attivare effetti particellari specifici tramite il VFX Manager.

---

## 🛠️ 5. Guida all'Espansione (Modding)

Per aggiungere nuovi contenuti al gioco, devi modificare **SOLO** il file `template/js/game-data.js` (o i file `data/` specifici).
Ecco come fare per ogni categoria.

### A. Aggiungere una Nuova Skin (Leggera o Complessa)
Vai nell'oggetto `gameData.skins`.

```javascript
cyber_espo: {
    name: "Cyber Espo",
    desc: "Il futuro è buggato.",
    img: "cyber.webp",          // Deve essere in assets/image/
    imgClick: "cyber-click.webp",
    rarity: "legendary",        // common, rare, epic, legendary, divine
    cost: new Decimal(50),      // Costo in Token
    unlockHint: "Sblocca l'obiettivo 'Hacker'", // Testo se bloccata
    
    // [OPZIONALE] Configurazione Tema Avanzata
    themeConfig: {
        // Usa solo le variabili per ricolorare il tema senza creare nuovi CSS!
        cssVars: {
            '--primary': '#8e44ad',
            '--bg-dark': '#1a0000'
        },
        // Oppure carica un intero CSS strutturale (Lazy Load)
        cssFile: 'cyber-theme.css', 
        
        bodyClass: 'theme-cyber',       // Classe CSS aggiunta al body
        specialMusic: 'sound-synthwave',// ID audio riprodotto in loop
        goldenBugIcon: 'fa-microchip',  // Cambia l'icona del Golden Bug
        vfx: 'matrix'                   // Attiva un effetto visivo (snow, fire, matrix)
    }
}

### B. Aggiungere una Obiettivo (Achievement)
Vai nell'oggetto `gameData.achievements`.

bug_hunter: {
    name: "Cacciatore",
    desc: "Clicca su 100 Golden Bug.",
    type: 'custom', 
    target: 100,
    isSecret: false, // Se true, mostra "???" finché non sbloccato
    
    // CONDIZIONE: Quando diventa vero?
    condition: () => gameState.totalGoldenBugsClicked >= 100,
    
    // PREMIO: Cosa ottiene il giocatore?
    reward: { 
        type: 'bugs',    // Tipi: 'bugs', 'skin', 'prestige', 'multiplier'
        value: 500000 
    }
}

### C. Aggiungere un nuovo Team
Vai nell'oggetto `gameData.teams`.

robot_qa: {
    name: 'Robot QA',
    baseCost: 10000,
    cpsPerUnit: 50, // Bug risolti al secondo da 1 unità
    tags: ['robot'] // Tag per logiche future (es. potenziamenti specifici)
}

### D. Aggiungere un Potenziamento (Upgrade)
Scegli l'elenco giusto in gameData:

# clickUpgrades (Negozio Sinistra - Tab Click)

# buildingEnhancements (Negozio Sinistra - Tab Auto)

# prestigeUpgrades (Negozio Laboratorio)

Esempio Potenziamento Auto (buildingEnhancements):

olio_motore: {
    name: 'Olio Motore',
    desc: 'Robot QA raddoppiano la produzione.',
    targetTeam: 'robot_qa', // Deve corrispondere all'ID del team creato sopra
    cost: 500000,
    multiplier: 2,          // Moltiplicatore x2
    requiredCount: 10,      // Sbloccato quando hai 10 Robot QA
    purchased: false        // Sempre false di default
}
Esempio Potenziamento Prestigio (prestigeUpgrades):

tasche_bucate: {
    name: 'Tasche Bucate',
    desc: 'Inizi con +1000 Bug dopo il reset.',
    baseCost: 10,           // Costo in Token
    isCounted: true,        // true = livelli infiniti, false = compra una volta
    effects: [              // Effetti passivi generici
        { trigger: 'passive', type: 'add_start_bugs', val: 1000 }
    ]
}

### E. Aggiungere Suoni o Video
Vai nell'oggetto `gameData.assets`. Il sistema caricherà i file e creerà i controlli nel Mixer Audio.

nuova_music: {
    id: 'sound-synthwave',
    file: 'music/synthwave.mp3', // Percorso relativo in assets/sounds/
    name: 'Musica Cyber',
    type: 'music',               // 'music' o 'sfx'
    category: 'ambiente',        // 'ambiente', 'effetti' o 'eventi'
    loop: true,
    defaultVol: 0.3
}

## 📂 6. Struttura Cartelle
/
├── index.php              # Entry point HTML
├── css/                   # Fogli di stile
│   ├── base.css           # Reset e variabili globali
│   ├── layout.css         # Griglia colonne
│   ├── clicker.css        # Stili gioco centrale
│   ├── store.css          # Stili negozi e card
│   ├── modals-core.css    # Struttura finestre modali
│   ├── mobile.css         # Adattamento smartphone
│   └── ...
├── js/                    # Logica Frontend
│   ├── version-config.js  # Versione gioco
│   ├── game-data.js       # [CORE] Dati e Configurazioni
│   ├── game-logic.js      # [CORE] Logica Matematica ed Eventi
│   ├── script.js          # Controller Principale
│   ├── ui-functions.js    # Rendering Grafico
│   ├── modals.js          # Gestione Finestre e Audio
│   ├── cheatboard.js      # Pannello Sviluppatore (nascosto)
│   └── podio.js           # Classifica
├── php/                   # Backend API
│   ├── db_connect.php     # Connessione DB
│   ├── api_bootstrap.php  # Header comuni e Auth
│   ├── save_progress.php  # Endpoint Salvataggio
│   └── ...
└── template/assets/       # File Statici
    ├── image/             # Skin, Icone
    ├── sounds/            # MP3
    └── video/             # MP4 per eventi

---

## ☁️ 7. CDN Cloudflare R2 (Asset Privati)

Su **Altervista** gli asset pesanti (audio/video/musica) vengono serviti da un bucket privato **Cloudflare R2** invece che dal server condiviso. Motivi:

* **Banda Altervista limitata** → connection reset frequenti su file >5MB.
* **Privacy asset** → bucket privato, file scaricabili solo via URL firmato (presigned, scadenza 1h).
* **Costo zero** → R2 free tier (10GB storage + 1M req/mese, no egress fee).
* **Fallback automatico** → se R2 fail, codice prova path locale.

In **locale (MAMP/dev)** R2 è disabilitato automaticamente: tutti gli asset si caricano dal filesystem locale, niente cambia.

### A. Architettura

```
Browser
  │
  ├── 1. Carica index.php + bundle JS/CSS  ──► Altervista (PHP/MySQL/UI immagini)
  │
  ├── 2. POST php/get_asset_urls.php       ──► Altervista PHP genera URL firmati S3v4
  │      { "paths": ["assets/sounds/click.mp3", ...] }
  │      ◄─── { "urls": { "...": "https://...r2.cloudflarestorage.com/...?X-Amz-Signature=..." } }
  │
  └── 3. <audio>/<video> request URL firmato  ──► Cloudflare R2 (file binario diretto)
```

### B. File coinvolti

| File | Scopo |
|------|-------|
| `php/r2-config.example.php` | Template configurazione R2 (committato) |
| `php/r2-config.php` | Configurazione attiva con chiavi (in `.gitignore` — MAI committare) |
| `php/r2-sign.php` | Helper signing AWS Signature V4 nativo (no Composer / SDK) |
| `php/get_asset_urls.php` | Endpoint batch presigned URL (input JSON, output mappa firmate) |
| `php/r2-cors-policy.json` | CORS policy da incollare in dashboard R2 |
| `music/get_songs.php` | Auto-detect R2: ritorna URL firmate se config attiva |
| `music/songs.json` | Lista canzoni (sostituisce scandir su Altervista) |
| `js/version-config.js` | `window.CDN.url()` async + `prefetch()` batch + cache lato client |

### C. Setup iniziale (una tantum)

1. **Account Cloudflare** → R2 Object Storage → crea bucket `espo-clicker-assets` (privato, location `WEUR`).
2. **API Token** → "Manage R2 API Tokens" → "Create Account API Token":
   * Permission: `Object Read & Write`
   * Bucket scope: `espo-clicker-assets` (NON "all buckets")
   * TTL: `Forever`
3. Salva: **Access Key ID**, **Secret Access Key**, **Endpoint URL**.
4. **CORS** → bucket → Settings → CORS Policy → incolla `php/r2-cors-policy.json`.
5. **Configura locale**: copia `php/r2-config.example.php` in `php/r2-config.php`, inserisci chiavi.
6. **Configura Altervista**: upload via FTP `php/r2-config.php` (NON via git, file in `.gitignore`).

### D. Sicurezza

* ✅ **Bucket privato**: nessun accesso senza URL firmato.
* ✅ **Signed URL scadenza 1h**: condividere = scade, non riutilizzabile.
* ✅ **Whitelist Referer** lato PHP: solo `espooclicker.altervista.org` può chiedere URL.
* ✅ **Whitelist prefissi** path (`assets/sounds/`, `assets/video/`, `music/songs/`): impossibile chiedere URL per path arbitrari.
* ✅ **Limite 200 path/request**: anti-abuse.
* ✅ **CORS limitato**: solo `https://espooclicker.altervista.org` può fetch i file.
* ✅ **Credenziali fuori repo**: `php/r2-config.php` in `.gitignore`.

### E. Upload asset con rclone

Tool consigliato per upload bulk (https://rclone.org/install/).

#### Setup rclone (una tantum)

```bash
rclone config
# n (new remote)
# name: r2
# Storage: 4 (Amazon S3 Compliant Storage Providers)
# provider: Cloudflare
# env_auth: 1 (false → enter manually)
# access_key_id: <tua Access Key>
# secret_access_key: <tua Secret Key>
# region: auto
# endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# location_constraint: (vuoto)
# acl: (vuoto)
# Edit advanced config: n
# Keep this remote: y
```

⚠️ Il token R2 ha scope per-bucket → `rclone lsd r2:` darà 403 (`ListBuckets` negato — voluto). Usa invece:

```bash
rclone lsd r2:espo-clicker-assets         # lista cartelle dentro al bucket
rclone ls  r2:espo-clicker-assets         # lista file (ricorsivo)
```

#### Upload iniziale (tutti gli asset)

```bash
cd C:/MAMP/htdocs/Espo_Clicker

rclone copy assets/sounds r2:espo-clicker-assets/assets/sounds -P --transfers 4
rclone copy assets/video  r2:espo-clicker-assets/assets/video  -P --transfers 4
rclone copy music/songs   r2:espo-clicker-assets/music/songs   -P --transfers 4
```

`-P` mostra progresso, `--transfers 4` carica 4 file in parallelo.

#### Sync incrementale (aggiunte successive)

```bash
# Carica solo i nuovi/modificati
rclone copy assets/sounds r2:espo-clicker-assets/assets/sounds -P --transfers 4

# Sync esatto (cancella anche i file rimossi localmente — usa con cautela)
rclone sync assets/sounds r2:espo-clicker-assets/assets/sounds -P --transfers 4
```

### F. Workflow per aggiunte future

#### F.1. Aggiungere un nuovo suono

1. Posiziona il file in `assets/sounds/nuovo.mp3` (locale).
2. Aggiungi entry in `js/data/assets.js`:
   ```js
   nuovo_suono: {
       id: 'sound-nuovo',
       file: 'nuovo.mp3',          // Oppure 'sub/nuovo.mp3' per sotto-cartelle
       name: 'Nuovo Suono',
       type: 'sfx',
       category: 'effetti',
       defaultVol: 0.6
   }
   ```
3. **Locale (MAMP)**: già funzionante.
4. **R2 (production)**: upload con rclone:
   ```bash
   rclone copy assets/sounds/nuovo.mp3 r2:espo-clicker-assets/assets/sounds/
   ```
5. Build + commit + push + deploy Altervista.

#### F.2. Aggiungere un nuovo video

1. Posiziona file in `assets/video/nuovo-video.mp4`.
2. Aggiungi entry in `js/script.js` → array `videoData` di `injectVideosLazily()`:
   ```js
   { id: 'nuovo-video', class: 'mia_classe', src: 'assets/video/nuovo-video.mp4' }
   ```
3. **Importante**: aggiungi anche path al **prefetch** in `initializeGame()` → `_prefetchUrls`:
   ```js
   paths.push('assets/video/nuovo-video.mp4');
   ```
4. Upload R2:
   ```bash
   rclone copy assets/video/nuovo-video.mp4 r2:espo-clicker-assets/assets/video/
   ```
5. Build + commit + push + deploy.

#### F.3. Aggiungere una nuova canzone (Espofy)

1. Posiziona file in `music/songs/Nuova Canzone.mp3` (locale).
2. **CRITICO**: aggiungi nome esatto in `music/songs.json`:
   ```json
   ["...", "Nuova Canzone.mp3"]
   ```
   Su Altervista `get_songs.php` legge da JSON, non da scandir. Senza l'aggiunta al JSON la canzone NON apparirà.
3. Upload R2:
   ```bash
   rclone copy "music/songs/Nuova Canzone.mp3" r2:espo-clicker-assets/music/songs/
   ```
4. Commit + deploy (no rebuild necessario, è solo PHP/JSON).

#### F.4. Aggiungere una nuova skin

1. Aggiungi WebP in `assets/image/skins/`:
   * `nuova-skin.webp` (idle)
   * `nuova-skin-click.webp` (click)
2. Aggiungi entry in `js/data/skins.js`:
   ```js
   nuova_skin: {
       name: 'Nuova Skin',
       img: 'skins/nuova-skin.webp',
       imgClick: 'skins/nuova-skin-click.webp',
       rarity: 'epic',
       cost: new Decimal(20),
       // ...themeConfig opzionale
   }
   ```
3. Aggiungi i path al pacchetto giusto in `js/asset-packages.js` (`SKINS_COMMON`, `SKINS_RARE`, `SKINS_EPIC`, `SKINS_LEGENDARY`).
4. **NOTA immagini**: attualmente le immagini restano servite da Altervista (locale). Se in futuro saranno spostate su R2, vedi opzioni in sezione `7.G`.
5. Build + commit + push + deploy.

#### F.5. Aggiungere immagini UI / icone (locali)

Le immagini caricate da `<img>` HTML o `background-image` CSS **restano locali** (su Altervista) — vedi limitazione in sezione `7.G`.

1. Aggiungi WebP/PNG/SVG in `assets/image/ui/` (o `icons/`, `skins/`).
2. Se è un'immagine usata da JS (es. caricata via `new Image()`), aggiungi al pacchetto in `js/asset-packages.js`:
   ```js
   CORE: {
       images: ['ui/nuova-icona.webp', /* ... */]
   }
   ```
3. Se è critica al primo render (above-the-fold), aggiungi `<link rel="preload" as="image" href="...">` in `index.php`.
4. Aggiungi al `PRECACHE_ASSETS` di `sw.js` se vuoi disponibilità offline.
5. Bump `CACHE_VERSION` in `sw.js` per forzare reinstallazione SW.
6. Build + commit + push + deploy.

#### F.6. Aggiungere un font custom

1. Posiziona il file in `assets/fonts/MioFont.ttf` (o `.woff2` consigliato per dimensione).
2. Definisci `@font-face` in `css/base.css`:
   ```css
   @font-face {
       font-family: 'MioFont';
       src: url('../assets/fonts/MioFont.ttf') format('truetype');
       font-display: swap;
   }
   ```
3. Aggiungi preload in `index.php` (priorità rendering):
   ```html
   <link rel="preload" as="font" href="assets/fonts/MioFont.ttf?v=<?php echo $cacheVer; ?>" type="font/ttf" crossorigin="anonymous" fetchpriority="high">
   ```
4. Aggiungi a `PRECACHE_ASSETS` in `sw.js`.
5. Aggiungi `ExpiresByType font/ttf "access plus 1 year"` in `.htaccess` (se non già presente).
6. Build + commit + push + deploy.

#### F.7. Aggiungere asset Arcade (sprite, suoni minigiochi)

1. Posiziona in cartelle dedicate:
   * Immagini: `assets/image/arcade/<gioco>/sprite.png`
   * Suoni: `assets/sounds/arcade/<gioco>/effect.wav`
2. Per i **suoni arcade**: aggiungi entry in `js/data/assets.js` (gestiti da Howler come SFX normali). Path: `'assets/sounds/arcade/<gioco>/effect.wav'`.
3. Per le **sprite**: caricate da Phaser nel file `arcade/<gioco>.js` tramite `this.load.image()`. Restano locali (Phaser fa request sync).
4. Le sprite arcade NON vengono spostate su R2 (Phaser non gestisce signed URL semplicemente).
5. Upload sounds R2 + commit + deploy.

#### F.8. Sostituire / rimuovere un asset

```bash
# Cancella da R2
rclone delete r2:espo-clicker-assets/assets/sounds/vecchio.mp3

# Oppure sync (rimuove i file mancanti localmente)
rclone sync assets/sounds r2:espo-clicker-assets/assets/sounds
```

Inoltre:
1. Rimuovi entry dal file dati corrispondente (`js/data/assets.js`, `js/data/skins.js`, `music/songs.json`).
2. Bump `CACHE_VERSION` in `sw.js` per pulire cache vecchia.
3. Build + commit + push + deploy.

#### F.9. Aggiornare il tag jsDelivr (legacy, deprecato dopo R2)

Prima dell'introduzione di R2, gli asset venivano serviti da jsDelivr tramite tag GitHub `2.0-Stable`. Il sistema R2 lo sostituisce completamente. Il tag resta solo come backup; non serve più aggiornarlo.

Se per qualche motivo dovessi tornare a jsDelivr:
```bash
git tag -f 2.0-Stable        # Punta tag al commit corrente
git push origin -f 2.0-Stable
```

### G. Limiti e note

* **CSS/HTML sync**: `<img src>`, `<link rel="preload">`, `background-image: url()` non possono attendere URL firmate. Per questo le immagini UI/skin restano locali. Solo asset caricati da JS asincrono (audio, video, musica) sono su R2.
* **URL TTL = 1h**: `js/version-config.js` ha cache lato client che rinnova URL ~5min prima della scadenza per audio in loop lunghi.
* **Tier free R2**: 10GB storage + 1M Class A op + 10M Class B op / mese. Il progetto sta entro tier abbondantemente.
* **Latenza extra**: prima richiesta `get_asset_urls.php` aggiunge ~50–200ms al boot (round-trip PHP). Compensata dal **batch prefetch** che fa 1 sola chiamata per tutti i sound + video.
* **Debug**: in DevTools → Network filtra `r2.cloudflarestorage.com` per vedere richieste R2.

### H. Troubleshooting

| Sintomo | Causa probabile | Fix |
|---------|-----------------|-----|
| `403 Forbidden referer` chiamando `get_asset_urls.php` | Referer non whitelisted | Aggiungi dominio in `r2-config.php` → `allowed_referers` |
| `403 AccessDenied` su `rclone lsd r2:` | Token scope per-bucket (no ListBuckets) | Normale, usa `rclone lsd r2:espo-clicker-assets` |
| `signature does not match` su R2 fetch | Clock client/server disallineati >5min | Sincronizza orario sistema |
| Audio non parte su Altervista | Asset non uploadati su R2 oppure CORS sbagliato | `rclone ls r2:espo-clicker-assets` per verificare; ricontrolla CORS policy |
| `R2 not configured` (500) | `php/r2-config.php` mancante su Altervista | Upload via FTP (file in `.gitignore`, non viene da git) |
| URL firmati scaduti durante long session | TTL <1h o sleep computer | Cache si auto-rinnova; se persiste, alza `url_ttl` in config |

### I. Workflow di rilascio completo (checklist)

Per una release stabile end-to-end:

1. ☐ Bump versione in `package.json`, `js/version-config.js`, `sw.js` (`CACHE_VERSION`).
2. ☐ Aggiorna asset locali (file in `assets/`, dati in `js/data/*.js`).
3. ☐ Upload nuovi asset su R2 con rclone (vedi sezione `7.E`).
4. ☐ Verifica `music/songs.json` se sono state aggiunte canzoni.
5. ☐ `npm run build` (rigenera `dist/`).
6. ☐ Test locale MAMP — apri `http://localhost:8888/Espo_Clicker/`, verifica console pulita.
7. ☐ (Opzionale) Test forzando R2 in locale: in `js/version-config.js` setta `IS_ALTERVISTA = true` → rebuild → ricarica → verifica chiamate `get_asset_urls.php` e fetch R2 in Network tab.
8. ☐ Ripristina `IS_ALTERVISTA` auto-detect → rebuild.
9. ☐ Commit + push `develop`.
10. ☐ Deploy su Altervista (`deploy.bat` o FTP manuale). NON uploadare cartelle `assets/sounds/`, `assets/video/`, `music/songs/` (sono su R2).
11. ☐ Verifica che `php/r2-config.php` sia presente su Altervista via FTP (file `.gitignore`, non incluso nel deploy automatico).
12. ☐ Test produzione: apri il sito, verifica audio / video / canzoni, controlla Network tab per richieste a `r2.cloudflarestorage.com`.