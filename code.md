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
**[NUOVO]** Questo file è il punto di ingresso per la definizione della versione del gioco.
* Definisce l'oggetto globale `GAME_VERSION` contenente `major`, `minor` e `stage` (es. *beta*, *stable*).
* Funge da "Source of Truth" per i controlli di compatibilità dei salvataggi.

### B. Gestione Dati (`game-data.js`)
Questo file definisce lo "State" (stato mutabile) e la "Config" (dati statici).

* **`gameState`**: Un oggetto gigante che contiene tutto ciò che deve essere salvato (punteggio, edifici posseduti, upgrade acquistati, statistiche totali, skin equipaggiata, versione del salvataggio).
* **`gameData`**: Contiene le costanti di gioco:
    * `teams`: Configurazioni edifici (costo base, BPS - Bug Per Second).
    * `clickUpgrades` & `buildingEnhancements`: Potenziamenti per click e automazione.
    * `achievements`: Lista obiettivi e condizioni di sblocco.
    * `skins`: Configurazioni estetiche.
    * `prestigeUpgrades`: Potenziamenti acquistabili dopo il reset (Ascensione).

### C. Motore di Gioco (`game-logic.js`)
Contiene la matematica e le regole di business.

* **Funzioni Core:**
    * `recalculateCPS()`: Ricalcola i **BPS** (Bug Per Second) totali.
    * `clickCookie(event)`: Gestisce il click manuale, applicando bonus ed eventi.
    * `gameLoop()`: Eseguito 30 volte al secondo. Aggiunge le risorse e gestisce i timer.
* **Sistema Economico:**
    * `calculateBulkCost()`: Calcola i prezzi cumulativi (1x, 5x, 10x, MAX).
* **Eventi:**
    * `triggerBluescreen()`, `triggerRickRoll()`: Eventi casuali che modificano il moltiplicatore globale.
* **Prestigio (Ascension):**
    * `executePrestige()`: Esegue il "Soft Reset". Mantiene Skin e Achievements, converte i Bug in Token Lab.

### D. Gestione Interfaccia (`ui-functions.js` & `modals.js`)
Si occupa di manipolare il DOM e gestire le finestre.

* **Navbar & Layout:** Gestisce la nuova barra di navigazione in alto (Dashboard style) e la responsività mobile.
* **Aggiornamento UI:** `updateUI()`, `refreshAllStores()`, `updateSkinsUI()`.
* **Modali:** Gestione apertura/chiusura finestre (Impostazioni, Account, Podio).

### E. Main Controller (`script.js`)
Il punto d'ingresso che lega tutto.

* **Inizializzazione:** Carica la configurazione, verifica la versione (`checkSaveCompatibility`), costruisce i negozi e avvia i loop.
* **Salvataggio:** Gestisce il salvataggio su `localStorage` e cloud (`save_progress.php`).

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
3.  **Reset (`reset_progress.php`):** **[NUOVO]** Imposta a `NULL` il salvataggio nel DB e rimuove l'utente dalla classifica, mantenendo l'account attivo. Richiede verifica password.
4.  **Classifica (`submit_score.php`):** Aggiorna i punteggi per la leaderboard pubblica.
5.  **Account:** Cambio username, password e cancellazione utente.

---

## 🚀 4. Funzionalità Chiave & Sistema di Gioco

### Sistema di Prestigio (Laboratorio)
Quando il giocatore accumula abbastanza risorse, può effettuare una "Promozione".
* **Soft Reset:** Perde edifici e bug.
* **Guadagno:** Ottiene **Token Lab**.
* **Vantaggio:** Acquista upgrade permanenti che velocizzano le run successive.

### Sistema di Versioning & Compatibilità 📦
Il gioco implementa un sistema intelligente per gestire gli aggiornamenti senza corrompere i salvataggi, definito in `version-config.js`.

La logica di compatibilità (`checkSaveCompatibility` in `script.js`) segue queste regole:

1.  **Stable Channel:**
    * I salvataggi marcati come `stable` sono **sempre compatibili** con versioni future `stable`.
    * *Esempio:* Save v1.0 -> Gioco v2.5 = **Compatibile**.

2.  **Beta/Alpha Channel (Sviluppo):**
    * La compatibilità è garantita solo se la **Major Version** coincide.
    * Se la Major cambia, il salvataggio viene resettato automaticamente per evitare conflitti.
    * *Esempio:* Save v3.0 Beta -> Gioco v3.1 Beta = **Compatibile**.
    * *Esempio:* Save v3.5 Beta -> Gioco v4.0 Beta = **RESET (Incompatibile)**.

3.  **Cross-Stage Protection:**
    * Non è possibile caricare salvataggi Beta su Stable (e viceversa).
    * *Esempio:* Save v3.9 Beta -> Gioco v1.0 Stable = **RESET**.

### Gestione Reset & Hard Reset 🛡️
Il gioco offre due livelli di pulizia dati:

1.  **Reset Progressi (Utente):**
    * Accessibile dalle Impostazioni.
    * Richiede la **Password**.
    * Cancella i progressi (Skin, Bug, Upgrade) ma **mantiene l'account** e il nome utente.
    * Implementato via server (`reset_progress.php`).

2.  **Hard Reset (Sviluppatore):**
    * Accessibile dalla **Cheatboard**.
    * Non richiede password (ma è nascosto).
    * Cancella tutto istantaneamente e forza il ricaricamento.

---

## 📂 5. Struttura Cartelle
```text
/
├── index.php              # Entry point HTML
├── css/                   # Fogli di stile
│   ├── base.css           # Stili globali e reset
│   ├── layout.css         # Griglia e struttura colonne
│   ├── clicker.css        # Area centrale (bottone, effetti)
│   ├── store.css          # Negozi e card upgrade
│   ├── modals.css         # Finestre e Navbar
│   ├── mobile.css         # Media queries
│   └── ...
├── js/                    # Logica Frontend
│   ├── version-config.js  # [NUOVO] Configurazione versione
│   ├── game-data.js       # Stato Iniziale e Costanti
│   ├── game-logic.js      # Matematica e Regole
│   ├── script.js          # Controller e Caricamento
│   ├── ui-functions.js    # Rendering DOM
│   ├── modals.js          # Gestione finestre e Account
│   ├── podio.js           # Logica Classifica
│   └── cheatboard.js      # Strumenti Dev (Console)
├── php/                   # API Backend
│   ├── db_connect.php     # Connessione DB
│   ├── login_register.php # Auth
│   ├── save_progress.php  # Cloud Save
│   ├── reset_progress.php # [NUOVO] Reset Dati
│   └── ...
└── template/image/ & sounds/ # Assets