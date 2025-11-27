# 📘 Documentazione Tecnica: Espòòò Clicker

Questa documentazione analizza la struttura, la logica di gioco e il funzionamento del backend del progetto. Il gioco è un **Incremental Clicker Game** basato su web (HTML5/JS) con un backend PHP/MySQL per la persistenza dei dati e le classifiche.

---

## 🏗️ 1. Architettura del Sistema

Il progetto segue un'architettura **Client-Server**:
* **Frontend (Client):** Gestisce tutta la logica di gioco (calcolo risorse, acquisti, eventi, rendering UI) in tempo reale tramite JavaScript. Lo stato è mantenuto in memoria e sincronizzato con `localStorage` e il Server.
* **Backend (Server):** Espone API RESTful in PHP per autenticazione, salvataggio cloud e gestione della classifica globale.
* **Database:** MySQL per memorizzare utenti, salvataggi (BLOB JSON) e punteggi.

---

## 🕹️ 2. Logica Frontend (JavaScript)

Il cuore del gioco è suddiviso in diversi moduli JS caricati in `index.php`.

### A. Gestione Dati (`game-data.js`)
Questo file definisce lo "State" (stato mutabile) e la "Config" (dati statici).

* **`gameState`**: Un oggetto gigante che contiene tutto ciò che deve essere salvato (punteggio, edifici posseduti, upgrade acquistati, statistiche totali, skin equipaggiata).
* **`gameData`**: Contiene le costanti di gioco:
    * `teams`: Configurazioni edifici (costo base, BPS - Bug Per Second).
    * `clickUpgrades` & `buildingEnhancements`: Potenziamenti per click e automazione.
    * `achievements`: Lista obiettivi e condizioni di sblocco.
    * `skins`: Configurazioni estetiche.
    * `prestigeUpgrades`: Potenziamenti acquistabili dopo il reset (Ascensione).

### B. Motore di Gioco (`game-logic.js`)
Contiene la matematica e le regole di business.

* **Funzioni Core:**
    * `recalculateCPS()`: Ricalcola i **BPS** (Bug Per Second) totali. Itera su tutti i team posseduti, applica i moltiplicatori degli upgrade (`buildingEnhancements`), i bonus prestigio e i bonus eventi (es. Crunch Time, Bluescreen).
    * `clickCookie(event)`: Gestisce il click manuale. Calcola il valore del click basandosi su `baseClickValue`, bonus prestigio e upgrade (es. "Mano Bionica" che aggiunge % dei BPS al click).
    * `gameLoop()`: Eseguito 30 volte al secondo (da `script.js`). Aggiunge `cookiesPerSecond / 30` al punteggio totale.

* **Sistema Economico:**
    * `calculateBulkCost(id, amount)`: Calcola il prezzo cumulativo per comprare 1, 10 o 100 edifici usando la formula della somma geometrica.
    * `buyTeam(id)`, `buyClickUpgrade(id)`, `buyPrestigeUpgrade(id)`: Gestiscono le transazioni, sottraendo risorse e aggiornando lo stato.

* **Eventi:**
    * `triggerBluescreen(multiplier)`: Attiva un evento "Blue Screen of Death" che moltiplica la produzione per un tempo limitato, cambiando visivamente il CSS.
    * `activateCrunchTime()`: Attiva un'abilità temporanea (BPS x7 per 30s) con cooldown.
    * `spawnGoldenBug()`: Gestisce l'apparizione casuale di un ticket dorato cliccabile per bonus immediati.

* **Prestigio (Ascension):**
    * `calculatePrestigeGained()`: Determina quanti Token Lab si ottengono resettando in base al punteggio attuale (formula radice quadrata).
    * `executePrestige()`: Esegue il "Soft Reset". Resetta edifici e punteggi ma mantiene achievement, skin, token prestigio e upgrade prestigio.

### C. Gestione Interfaccia (`ui-functions.js`)
Si occupa esclusivamente di manipolare il DOM.

* `updateUI()`: Aggiorna punteggi, BPS e disabilita/abilita i bottoni d'acquisto in base alle risorse disponibili.
* `refreshAllStores()`: Rigenera l'HTML delle liste acquisti (Edifici, Upgrade, Prestigio) quando cambiano filtri o stati.
* `updateAchievementsUI()`: Disegna la lista obiettivi, gestendo barre di progresso e tasti "Riscatta".
* `updateSkinsUI()`: Gestisce la griglia delle skin (bloccate/sbloccate/acquistabili).
* `showToast(msg, type)`: Mostra notifiche a scomparsa in alto a destra.

### D. Main Controller (`script.js`)
Il punto d'ingresso che lega tutto.

* **Inizializzazione:** Carica il salvataggio (`loadGame`), costruisce i negozi e avvia i loop.
* **Game Loop:** Gestisce il `setInterval` principale a 30 FPS.
* **Salvataggio:** Gestisce il salvataggio su `localStorage` e, se l'utente è loggato, invia il JSON al file PHP `save_progress.php`.
* **Offline Progress:** Al caricamento, calcola quanto tempo è passato dall'ultimo save e assegna risorse "offline" (con efficienza ridotta).

---

## 🖥️ 3. Logica Backend (PHP & SQL)

Il backend serve per la persistenza cloud e la componente sociale (classifiche).

### Database (`databasecreation.sql`)
* `users`: Tabella utenti (ID, username, password hash, save_data JSON).
* `leaderboard`: Tabella classifiche (username, score massimo, livello prestigio).

### API Endpoints
Tutti gli endpoint restituiscono JSON.

1.  **Autenticazione (`login_register.php`):**
    * Accetta JSON `{username, password}`.
    * Se l'utente esiste: Verifica password (`password_verify`). Se corretta, restituisce il JSON del salvataggio (`save_data`).
    * Se non esiste: Crea nuovo utente (`password_hash`) e restituisce successo.

2.  **Salvataggio (`save_progress.php`):**
    * Riceve l'intero oggetto `gameState` in JSON.
    * Verifica la password dell'utente prima di sovrascrivere il campo `save_data` nel DB.

3.  **Classifica (`submit_score.php` & `get_leaderboard.php`):**
    * `submit_score`: Aggiorna la riga dell'utente nella tabella `leaderboard` solo se il nuovo punteggio è superiore al precedente (`ON DUPLICATE KEY UPDATE`).
    * `get_leaderboard`: Esegue una `SELECT` ordinata per `prestigeLevel DESC, score DESC` limitata ai primi 10.

4.  **Gestione Account:**
    * `change_username.php`, `change_password.php`, `delete_user.php`: Eseguono operazioni CRUD sull'account previa verifica della password attuale.

---

## 🛠️ 4. Funzionalità Chiave Spiegate

### Il Sistema di Prestigio
Il gioco implementa un sistema di "Ascensione" (chiamato "Ufficio Promozioni").
1.  Il giocatore accumula "Bug".
2.  Superata una soglia (`PRESTIGE_THRESHOLD`), può resettare.
3.  Il reset converte i guadagni totali in **Token Lab**.
4.  I Token Lab si usano per comprare upgrade permanenti (`prestigeUpgrades`) che persistono tra i reset (es. bonus passivo, start con più risorse, mantenimento edifici).

### Modello di Dati (JSON Blob)
Il salvataggio non è strutturato in tabelle relazionali complesse per ogni edificio. Invece, l'intero stato JS (`gameState`) viene serializzato in una stringa JSON e salvato in una singola colonna `LONGTEXT` (`save_data`) nel database.
* **Pro:** Estremamente flessibile. Aggiungere un nuovo edificio nel JS non richiede modifiche al DB.
* **Contro:** Non si possono fare query SQL complesse sui dati di gioco (es. "trova tutti gli utenti con l'edificio X").

### Cheatboard (`cheatboard.js`)
Un file separato iniettato dinamicamente che crea una console di amministrazione (attivabile con shortcut o via codice) per aggiungere risorse, resettare o testare eventi. Utile per il debugging.

---

## 📂 5. Struttura Cartelle
```text
/
├── index.php              # Entry point HTML
├── css/                   # Fogli di stile modulari
│   ├── base.css           # Stili globali
│   ├── clicker.css        # Area centrale
│   ├── layout.css         # Griglia
│   ├── mobile.css         # Media queries
│   ├── store.css          # Negozi
│   └── ...
├── js/                    # Logica Frontend
│   ├── game-data.js       # Configurazione e Stato Iniziale
│   ├── game-logic.js      # Matematica e Regole
│   ├── script.js          # Main Loop e Inizializzazione
│   ├── ui-functions.js    # Rendering DOM
│   ├── modals.js          # Gestione finestre modali
│   ├── podio.js           # Logica Classifica
│   └── cheatboard.js      # Strumenti Dev
├── php/                   # API Backend
│   ├── db_connect.php     # Connessione DB
│   ├── login_register.php # Auth
│   ├── save_progress.php  # Cloud Save
│   └── ...
└── template/image/ & sounds/ # Assets