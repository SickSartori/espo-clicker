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
    * **`skins`:** Configurazioni estetiche, rarità e temi speciali.
    * **`events`:** Configurazioni eventi (durata, moltiplicatori, video).

### C. Motore di Gioco (`game-logic.js`)
Gestisce la matematica, l'economia e gli eventi.

* **Audio Manager:** Gestione centralizzata dei volumi con priorità (Evento > Natale > Background) e supporto "Smart Resume" per aggirare i blocchi autoplay dei browser.
* **Event System (`EventHandlers`):** Sistema estensibile per gestire tipi di eventi diversi (Video, CSS Glitch) senza catene di `if/else`.
* **Calcoli Economici:**
    * `calculateClickValue()`: Centralizza la logica di guadagno per click (Click + Mano Bionica + Fury).
    * `calculateBulkCost()` & `calculateMaxAffordable()`: Formule matematiche sincronizzate per acquisti multipli (1x, 5x, MAX).

### D. Gestione Interfaccia (`ui-functions.js` & `modals.js`)
Manipolazione del DOM ottimizzata.

* **Rendering Dinamico (`renderStoreSection`):** Una singola funzione genera l'HTML per *tutti* i negozi (Click, Auto, Lab) leggendo i dati.
* **DOM Caching:** Uso di `getEl()` e `setTextIfChanged()` per ridurre al minimo il repaint del browser e migliorare le performance su mobile.
* **Mixer Audio:** Generazione automatica degli slider del volume nelle impostazioni basata sugli asset registrati.

### E. Main Controller (`script.js`)
Il collante dell'applicazione.

* **Game Loop:**
    * **Fast Loop (30fps):** Calcolo risorse e logica di base.
    * **Slow Loop (1fps):** Controlli pesanti (Achievement, Notifiche Tab) per risparmiare CPU.
* **Salvataggio (LZ-String):** Implementa la compressione dei dati JSON prima di salvarli in LocalStorage o Cloud, riducendo le dimensioni dell'80%.

---

## 🖥️ 3. Logica Backend (PHP & SQL)

### Database
* **`users`:** ID, username, hash password, `save_data` (LONGTEXT).
* **`leaderboard`:** username, score (max), prestigeLevel.
* **Configurazione:** `db_connect.php` usa `config.json` per switchare tra ambienti (es. tabelle `_dev` vs `_production`).

### API Endpoints
1.  **`login_register.php`:** Gestisce accesso e creazione account (hash password sicuro).
2.  **`save_progress.php`:** Riceve la stringa compressa LZString e la salva nel DB.
3.  **`submit_score.php`:** Estrae i dati chiave (Score, Livello) dal salvataggio per aggiornare la classifica pubblica.
4.  **`reset_progress.php` / `delete_user.php`:** Gestione reset e GDPR (cancellazione dati).

---

## 🚀 4. Funzionalità Chiave

1.  **Data-Driven Design:** Aggiungere contenuti non richiede modifiche alla logica JS.
2.  **Sistema Prestigio (Laboratorio):** Soft reset che converte i progressi in Token per acquistare potenziamenti permanenti e Skin esclusive.
3.  **Eventi Dinamici:**
    * **Golden Bug:** Apparizione casuale di bug dorati cliccabili.
    * **Espo Fury:** Abilità attiva (Cooldown) che moltiplica BPS x7.
    * **Eventi Visivi:** Errore 404 (Glitch CSS) e Rick Roll (Video Overlay).
4.  **Sistema Skin Avanzato:** Le skin non cambiano solo l'immagine, ma possono attivare "Temi" completi (Musica, Neve, Classi CSS).

---

## 🛠️ 5. Guida all'Espansione (Modding)

Per aggiungere nuovi contenuti al gioco, devi modificare **SOLO** il file `template/js/game-data.js`.
Ecco come fare per ogni categoria.

### A. Aggiungere una Nuova Skin
Vai nell'oggetto `gameData.skins`.

cyber_espo: {
    name: "Cyber Espo",
    desc: "Il futuro è buggato.",
    img: "cyber.webp",          // Deve essere in assets/image/
    imgClick: "cyber-click.webp",
    rarity: "legendary",        // common, rare, epic, legendary
    cost: 50,                   // Costo in Token (opzionale)
    unlockHint: "Sblocca l'obiettivo 'Hacker'", // Testo se bloccata
    
    // [OPZIONALE] Configurazione Tema Speciale
    themeConfig: {
        bodyClass: 'theme-cyber',       // Classe CSS aggiunta al body
        specialMusic: 'sound-synthwave',// ID audio (vedi sezione Suoni)
        goldenBugImg: 'drone.png'       // Cambia l'aspetto del Golden Bug
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