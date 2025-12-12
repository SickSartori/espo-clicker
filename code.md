# 📘 Documentazione Tecnica: Espòòò Clicker

Questa documentazione analizza la struttura, la logica di gioco e il funzionamento del backend del progetto. Il gioco è un **Incremental Clicker Game** basato su web (HTML5/JS) con un backend PHP/MySQL per la persistenza dei dati e le classifiche.

---

## 🏗️ 1. Architettura del Sistema

Il progetto segue un'architettura **Client-Server**:
* **Frontend (Client):** Gestisce tutta la logica di gioco (calcolo risorse, acquisti, eventi, rendering UI) in tempo reale tramite JavaScript. Lo stato è mantenuto in memoria e sincronizzato con `localStorage` e il Server.
* **Backend (Server):** Espone API RESTful in PHP per autenticazione, salvataggio cloud, reset progressi e gestione della classifica globale.
* **Database:** MySQL per memorizzare utenti, salvataggi (BLOB JSON) e punteggi.

---

## 🕹️ 2. Logica Frontend (JavaScript)

Il cuore del gioco è suddiviso in diversi moduli JS caricati in `index.php`.

### A. Configurazione & Versioning (`version-config.js`)
Questo file è il punto di ingresso per la definizione della versione del gioco.
* Definisce l'oggetto globale `GAME_VERSION` contenente `major`, `minor` e `stage` (es. *beta*, *stable*).
* Funge da "Source of Truth" per i controlli di compatibilità dei salvataggi.

### B. Gestione Dati (`game-data.js`) - **[RIFATTORIZZATO]**
Questo file è ora la **Fonte di Verità Assoluta (Single Source of Truth)**. Il gioco è diventato **Data-Driven**.

* **`gameData`**: Contiene la definizione statica di *tutti* i contenuti:
    * **`assets` (Nuovo):** Registro centralizzato di suoni e video con volumi di default e categorie (Ambiente, Eventi, Effetti).
    * `teams`: Configurazioni edifici.
    * `clickUpgrades`, `buildingEnhancements`, `prestigeUpgrades`: Liste potenziamenti.
    * `achievements`: Obiettivi e condizioni.
    * `skins`: Configurazioni estetiche e rarità.
* **Automazione Stato (`getInitialGameState`)**:
    * La funzione non è più manuale ma **genera dinamicamente** l'oggetto `gameState` iterando su `gameData`.
    * Aggiungere un nuovo edificio in `gameData` crea automaticamente la sua voce nel salvataggio.

### C. Motore di Gioco (`game-logic.js`)
Contiene la matematica e le regole di business.

* **Logica Audio Avanzata:**
    * `resumeCrunchTimeEffects()`: Gestione robusta dell'Autoplay Policy (attesa interazione utente) per garantire che la musica parta anche dopo un refresh (F5).
    * Controllo conflitti audio (Priorità: Evento > Natale > Background).
* **Prestigio (Ascension):**
    * `openPrestigeContract()`: Calcola e mostra il **Moltiplicatore Totale (es. x788)** invece della percentuale cumulativa, per maggiore chiarezza.
* **Eventi:**
    * Gestione "Semaforo" (`checkEventConflict`) per evitare sovrapposizioni tra eventi (Fury, 404, Rick Roll).

### D. Gestione Interfaccia (`ui-functions.js` & `modals.js`)
Si occupa di manipolare il DOM. Ora è **completamente dinamica**.

* **Generazione Negozi (`buildStores`)**:
    * Non esiste più HTML hardcoded per gli upgrade.
    * Il codice legge `gameData` e costruisce al volo le liste per Edifici, Click, Auto e Laboratorio.
* **Mixer Audio (`renderAudioMixer`)**:
    * Il mixer nelle impostazioni viene generato automaticamente leggendo `gameData.assets`.
    * Include controlli volume in tempo reale e pulsanti di test con stop automatico al `mouseleave`.
* **Skin & Visuals**:
    * `applySkinVisuals()`: Gestisce cambi immagine e audio ambientale (es. Neve a Natale) rispettando i volumi salvati nel mixer.

### E. Main Controller (`script.js`)
Il punto d'ingresso che lega tutto.

* **Inizializzazione Dinamica:**
    * `generateAudioTags()`: Crea i tag `<audio>` HTML all'avvio basandosi sui dati in `gameData.assets`.
* **Sync Cloud Intelligente:**
    * Al caricamento del salvataggio Cloud, verifica se un evento (es. "Espo Fury") è attivo. Se sì, forza la skin dell'evento sovrascrivendo quella equipaggiata per evitare glitch grafici.

---

## 🖥️ 3. Logica Backend (PHP & SQL)

Il backend serve per la persistenza cloud e la sicurezza.

### Database (`databasecreation.sql`)
* `users`: Tabella utenti (ID, username, password hash, save_data JSON).
* `leaderboard`: Tabella classifiche (username, score massimo, livello prestigio).
* **Multi-Environment:** Supporto per tabelle `_production` e `_dev` gestite da `config.json`.

### API Endpoints
1.  **Auth (`login_register.php`):** Gestisce login e registrazione.
2.  **Salvataggio (`save_progress.php`):** Riceve il JSON del `gameState` e lo salva nel DB.
3.  **Reset (`reset_progress.php`):** Imposta a `NULL` il salvataggio nel DB e rimuove l'utente dalla classifica.
4.  **Classifica (`submit_score.php`):** Aggiorna i punteggi per la leaderboard pubblica estraendoli in modo sicuro dal blob JSON salvato (Server-Side Validation).
5.  **Account:** Cambio username, password e cancellazione utente.

---

## 🚀 4. Funzionalità Chiave & Sistema di Gioco

### Architettura Data-Driven (Novità)
L'intero gioco scala automaticamente. Per aggiungere contenuti (Suoni, Skin, Edifici) basta modificare un solo file (`game-data.js`) e l'interfaccia si adatta da sola.

### Sistema di Prestigio (Laboratorio)
* **Soft Reset:** Perde edifici e bug in cambio di Token Lab.
* **Visualizzazione:** Mostra chiaramente il **Moltiplicatore Globale (es. x10.5)** che si otterrà, sommando bonus prestigio e obiettivi.

### Sistema Audio Intelligente
* **Mixer Integrato:** Controllo granulare dei volumi per ogni singolo suono/video.
* **Smart Resume:** Al refresh della pagina (F5), il gioco capisce quale traccia suonare (Metal se in Fury, Neve se Natale, Base altrimenti) e aggira i blocchi autoplay dei browser attendendo la prima interazione.

### Sistema di Versioning & Compatibilità
* Gestione aggiornamenti sicura tramite `version-config.js` (Stable/Beta channel separation).

---

## 📂 5. Struttura Cartelle
```text
/
├── index.php              # Entry point HTML (Minimale, i tag audio sono generati via JS)
├── css/                   # Fogli di stile
│   ├── base.css           # Stili globali e reset
│   ├── layout.css         # Griglia e struttura colonne
│   ├── clicker.css        # Area centrale (bottone, effetti)
│   ├── store.css          # Negozi e card upgrade
│   ├── modals.css         # Core finestre modali
│   ├── modals-content.css # Contenuto specifico modali (Mixer, Stats)
│   ├── mobile.css         # Media queries
│   └── ...
├── js/                    # Logica Frontend
│   ├── version-config.js  # Configurazione versione
│   ├── game-data.js       # [CORE] Dati, Assets e Stato Iniziale
│   ├── game-logic.js      # Matematica, Eventi e Audio Engine
│   ├── script.js          # Controller, Init e Cloud Sync Logic
│   ├── ui-functions.js    # [CORE] Rendering Dinamico UI
│   ├── modals.js          # Logica finestre e Mixer Audio
│   ├── podio.js           # Logica Classifica
│   └── cheatboard.js      # Strumenti Dev (Console)
├── php/                   # API Backend
│   ├── db_connect.php     # Connessione DB
│   ├── login_register.php # Auth
│   ├── save_progress.php  # Cloud Save
│   ├── reset_progress.php # Reset Dati
│   └── ...
└── template/image/ & sounds/ # Assets