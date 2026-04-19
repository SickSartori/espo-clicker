# 💥 Espòòò Clicker - Release Notes Ufficiali 💥

## Versione 3.0: Performance, Stabilità e Mobile ⚡

Un aggiornamento silenzioso ma potente. Nessuna nuova feature — solo il gioco che diventa più veloce, più stabile e più bello su smartphone.

---

### ⚡ Performance & Caricamento

* **📦 Bundle unico:** Tutti i file JavaScript (15+) e CSS del gioco vengono ora compressi e unificati in un solo bundle ottimizzato. Il caricamento iniziale è drasticamente più rapido — meno richieste HTTP, meno attesa.
* **🖼️ Skin caricate on-demand:** Le skin Epic e Legendary (le più pesanti) vengono ora scaricate solo quando apri il menu Guardaroba, non più in background durante il gioco. Risparmio immediato di ~1.6 MB nei primi minuti.
* **🔄 Asset decodificati in background:** Le immagini delle skin vengono ora decodificate in modo asincrono, senza mai bloccare l'animazione del clicker.
* **💾 Cache 1 anno:** I file del bundle vengono cachati dal browser per un anno intero. Dopo il primo caricamento, il gioco si avvia quasi istantaneamente anche senza rete.

---

### 💾 Sistema di Salvataggio V9

* **🗄️ IndexedDB come storage primario:** Il salvataggio non usa più localStorage ma IndexedDB — più capiente, più affidabile, mai bloccante. Il gioco non si "inceppa" più durante i salvataggi frequenti.
* **⏱️ Salvataggio ogni 30 secondi:** Ridotto il numero di scritture da ogni 3-5s a ogni 30s, alleggerendo il carico su mobile.
* **🛡️ Doppio fallback:** In caso raro di errore IndexedDB, il salvataggio ricade automaticamente su localStorage. Nessuna perdita di progressi.
* **⚠️ Guardia spazio disco:** Il gioco controlla la memoria disponibile prima di salvare e avvisa se lo spazio è quasi esaurito.

---

### 🛡️ Stabilità

* **🌐 Gestore errori globale:** Qualsiasi errore inaspettato ora viene catturato, loggato e mostrato come toast — invece di sparire silenziosamente. Il gioco continua a funzionare.
* **🔊 Audio a prova di crash:** Se un file audio non si carica (connessione lenta, CDN offline), il gioco ignora l'errore e continua invece di bloccarsi.
* **🔄 Aggiornamenti SW con consenso:** Il Service Worker non forza più il reload della pagina durante il gioco. Quando è disponibile una nuova versione, ti viene chiesto prima.

---

### 📱 Mobile & Responsive

* **🍎 Safe area iOS:** Barra di navigazione inferiore correttamente distanziata dall'indicatore home su iPhone X e successivi.
* **👆 Touch più reattivo:** Eliminato il flash blu al tap su pulsanti. Listener touch ottimizzati per uno scroll più fluido nei menu.
* **📐 Zero layout shift:** Il clicker principale non "salta" più cambiando skin — la dimensione è ora riservata in anticipo dal browser.
* **📁 CSS mobile unificato:** I due file di stile mobile sono stati uniti in uno solo, riducendo il lavoro del browser al caricamento.

---

### 🎨 UI & Icone

* **🔵 Icona SVG:** L'icona dell'app (schermata home, tab browser) è ora un SVG scalabile — nitida su qualsiasi risoluzione e display retina.

---

## Versione 2.0: Formattazione, Nuovi Orizzonti e Arcade 2.0!

Questo non è un semplice aggiornamento, è un vero e proprio salto generazionale. La Versione 2.0 (che include anche i contenuti inediti delle patch 1.2 e 1.3) introduce il "New Game Plus", spinge l'endgame verso numeri inimmaginabili, espande la sala giochi Arcade e rinnova completamente la gestione estetica, strutturale e prestazionale del gioco.

---

### 🌌 Il Grande Salto (Endgame & Gameplay)

* **🔄 LA FORMATTAZIONE (New Game Plus):** La vera rivoluzione di questo aggiornamento! Raggiunto un certo limite, potrete "Formattare" il sistema. Questo azzererà i progressi ma vi ricompenserà con una **nuova valuta esclusiva**, permettendovi di sbloccare **nuovi potenziamenti** e **skin introvabili**. Il vero gioco inizia ora!
* **🚀 Espansione Matematica (Fino al Qag!):** L'infrastruttura matematica è stata potenziata. Aggiunti nuovi suffissi per numeri astronomici fino al *Quadragintillion* (1e125). Inoltre, abbiamo implementato controlli rigorosi sui valori scientifici per evitare rotture nell'endgame.
* **📱 Installa l'App Ufficiale (PWA):** Espòòò Clicker diventa un'applicazione a tutti gli effetti! Ora puoi installarla direttamente sul tuo smartphone o PC. Supporta il gioco offline, caricamenti istantanei e aggiornamenti invisibili in background.
* **⚖️ Bilanciamento Promozione & LAB:** La curva di difficoltà è stata ammorbidita. L'incremento del costo per le Promozioni passa da 5x a **2.5x**. Aggiunto il calcolo esponenziale per LAB e Promozione, con la visualizzazione del valore attuale nelle statistiche. Arrotondati i costi del LAB per una migliore leggibilità.

---

### 🕹️ Arcade Mania 2.0

* **👾 Nuovi Minigiochi:** **Asteroids** — un grande classico entra nella famiglia Arcade. **Super Espò Run** — preparati a correre e saltare in questa nuova avventura.
* **🎮 Super Espò Runner Ribilanciato:** Gameplay completamente rivisto con fisica più precisa, generazione livelli migliorata e nuovi elementi di scenario. Ora ogni run è una sfida giusta!
* **🎨 Restyling Totale Arcade:** Nuova UI dedicata, nuovi suoni esclusivi per la sala giochi e chiusura sicura dei minigiochi migliorata.
* **🚀 Space Impacts:** Effettuata una pulizia del codice e un ribilanciamento generale delle difficoltà del minigioco.

---

### 🎭 Estetica & Personalizzazione

* **🆕 Nuove Skin Esclusive:** La Formattazione sblocca l'accesso a **nuove skin** di rarità Epica e Leggendaria, alcune con sorprese nascoste... 👀
* **🎤 Nuovo Evento Misterioso:** Un nuovo evento video si aggiunge alla famiglia. Sapresti riconoscerlo?
* **🖼️ Classifica con Stile & Mobile-Ready:** Ora la classifica globale mostrerà la tua **foto profilo** basata sull'ultima skin equipaggiata e i tuoi badge. La visualizzazione è stata riscritta per impaginarsi alla perfezione sugli schermi degli smartphone, senza testi tagliati!
* **👗 Guardaroba Rinnovato:** Il menu skin è stato ridisegnato con un look più scuro e moderno, navigazione più fluida e ordinamento migliorato. Recuperato spazio prezioso ottimizzando la galleria per visualizzare più informazioni.
* **🌈 Gestione Temi Dinamici:** Il motore grafico ora carica e gestisce dinamicamente i temi estetici legati alle skin, cambiando volto al gioco in modo fluido (Miglioramento Fase 2).
* **🏆 UI & Dettagli:** Gli achievements legati ad eventi passati verranno nascosti "fuori stagione", mantenendo la bacheca ordinata. Aggiunta anche una nuova UI dedicata per il menu Promozione.

---

### ✨ Restyling Visivo & Interazione (UI 2.0)

* **🖥️ Layout Full-Screen:** Il gioco ora occupa tutta la schermata, senza riquadri contenitore. Più spazio, look più immersivo.
* **📐 Navbar Uniformata:** Tutti i bottoni della barra di navigazione hanno la stessa larghezza per un aspetto più ordinato e professionale.
* **📲 Bottone Installa App:** Appare automaticamente nella navbar quando il browser supporta l'installazione PWA.
* **🔘 Clicker Button Rinnovato:** Il bottone principale brilla con un anello di ping animato e un alone luminoso che respira.
* **🔥 Sistema di Combo Visivo:** Più clicchi velocemente, più il gioco reagisce! Raggiunto il moltiplicatore x5, apparirà un contatore combo dinamico che cambierà colore e dimensione in base all'intensità dei click.
* **💫 Feedback Click Esplosivo:** Le nuove particelle scintillanti non sono più statiche, ma aumenteranno di numero e scala man mano che la tua combo sale!
* **🌟 Promozione Epica:** Effettuare una Promozione scatenerà ora una sequenza spettacolare con flash, vibrazioni dello schermo e animazioni orchestrate.
* **📱 Spazi Ottimizzati (Mobile):** Barre di navigazione più sottili, padding ridotti e un **bottone principale del clicker ingrandito** per un'esperienza touch impeccabile.
* **🎬 Dettagli Premium:** Nuove animazioni d'ingresso a cascata, pulsanti con effetti di profondità e luce, score dinamico e un look generale più "cyber".

---

### 🔥 Espo Fury Potenziato

* **🌋 Effetto Fiamma Rinnovato:** L'animazione Espo Fury è stata completamente rivista con una corona di fuoco multi-layer. Anello di fuoco espandente, alone caldo arancione animato e flash sul bordo più intensi — il clicker non è mai sembrato così pericoloso.

---

### 🎭 Fix Temi

* **◼️ Tema 8-bit — Overlap Navbar Risolto:** Corretta la sovrapposizione di 5px tra navbar (70px) e contenuto di gioco.
* **◼️ Clicker Quadrato Coerente:** Nei temi 8-bit e Super, il bottone clicker è ora quadrato a tutti gli effetti: bordo, alone, anello e particelle esplosive incluse.
* **🟢 Matrix — Testi Isolati:** Lo stile verde terminale ora si applica solo all'interno del gioco, senza colorare navbar o modali.
* **🔵 Bluescreen — Griglia Nascosta:** La griglia di sfondo viene correttamente nascosta durante l'evento schermata blu.

---

### 🔊 Motore Audio 2.0 & Fix

* **🎵 Audio Engine Next-Gen:** Implementato un nuovo e potente motore audio strutturato. Niente più scatti: goditi transizioni morbide (crossfade) tra le musiche e una risposta istantanea degli effetti sonori durante i click più forsennati.
* **🎵 Nuova Traccia:** Aggiunta la "Musica Divina" al Jukebox.
* **🔇 Fix Volume & Comandi:** Risolto il bug che sparava l'audio al massimo dopo aver ricaricato la pagina. Lo slider del volume master e il bottone "Mute" ora rispondono istantaneamente. Il mute mette in pausa invece di riavviare la traccia. Corretti gli id musicali legati ad alcune skin specifiche e fixato l'audio della *fireball* durante l'abilità Fury.

---

### ⚙️ Engine, Sicurezza & Sotto il Cofano

* **🛡️ Sistema Anti-Rollback v3:** I tuoi salvataggi sono blindati. Abbiamo introdotto una rigida gerarchia di controllo (Formattazione > Promozione > Score) che impedisce in modo assoluto la sovrascrittura con dati vecchi.
* **💾 Fix Classifica Produzione:** Risolto un bug critico che impediva l'aggiornamento della classifica in produzione a causa di una colonna mancante nel database. I punteggi ora si sincronizzano correttamente.
* **🚀 Performance & Addio Lag:** Rimossi moduli e pacchetti esterni pesanti a favore di un codice leggero scritto "in casa". Calcoli di gioco alleggeriti, canvas ottimizzati e grafiche ora accelerate via GPU.
* **🔄 Sincronizzazione Perfetta:** Aggiunto un salvataggio forzato un attimo prima di aprire la Classifica Globale: il tuo punteggio online sarà sempre aggiornato all'ultimo click. Corretti bug critici sui salvataggi da Mobile e sui ripristini in background (Service Worker).
* **🧹 Pulizia Totale al Reset:** Usare l'opzione "Cancella Dati" ora distrugge definitivamente anche i salvataggi di backup, ripristina la skin di base e ti permette di ricominciare un'avventura immacolata.
* **🔒 Sicurezza & Token:** Aggiunti token di sessione per proteggere gli account e prevenire disconnessioni anomale.
* **⚡ Caricamenti & File System:** Il vecchio monolite *Game-Data* è stato ordinato in più moduli, i CSS divisi per piattaforma per non forzare il layout e tutti i menu pesanti godono ora di caricamento dinamico per avvii del gioco fulminei.
