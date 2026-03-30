# 💥 Espòòò Clicker - Release Notes Ufficiali (v2.0) 💥

## Versione 2.0: Formattazione, Nuovi Orizzonti e Arcade 2.0!

Questo non è un semplice aggiornamento, è un vero e proprio salto generazionale. La Versione 2.0 (che include anche i contenuti inediti delle patch 1.2 e 1.3) introduce il "New Game Plus", spinge l'endgame verso numeri inimmaginabili, espande la sala giochi Arcade e rinnova completamente la gestione estetica e strutturale del gioco.

---

### 🌌 Il Grande Salto (Endgame & Gameplay)

* **🔄 LA FORMATTAZIONE (New Game Plus):** La vera rivoluzione di questo aggiornamento! Raggiunto un certo limite, potrete "Formattare" il sistema. Questo azzererà i progressi ma vi ricompenserà con una **nuova valuta esclusiva**, permettendovi di sbloccare **nuovi potenziamenti** e **skin introvabili**. Il vero gioco inizia ora!
* **🚀 Espansione Matematica (Fino al Qag!):** L'infrastruttura matematica è stata potenziata. Aggiunti nuovi suffissi per numeri astronomici fino al *Quadragintillion* (1e125). Inoltre, abbiamo implementato controlli rigorosi sui valori scientifici per evitare rotture nell'endgame.
* **⚖️ Bilanciamento Promozione & LAB:**
    * **Costo Promozione Ridotto:** La curva di difficoltà è stata ammorbidita. L'incremento del costo per le Promozioni passa da 5x a **2.5x**.
    * **Calcolo Esponenziale:** Aggiunto il calcolo esponenziale per LAB e Promozione, con la visualizzazione del valore attuale della Promozione direttamente nelle statistiche.
    * Arrotondati i costi del LAB per una migliore leggibilità.

---

### 🕹️ Arcade Mania 2.0

*La sala giochi si espande e riceve un restyling completo, sia visivo che sonoro.*

* **👾 Nuovi Minigiochi:**
	* **Asteroids:** Un grande classico entra nella famiglia Arcade. Distruggi i meteoriti e sopravvivi!
    * **Super Espò Run:** Preparati a correre e saltare in questa nuova avventura.
* **🎮 Super Espò Runner Ribilanciato:** Gameplay completamente rivisto con fisica più precisa, generazione livelli migliorata e nuovi elementi di scenario. Ora ogni run è una sfida giusta!
* **🎨 Restyling Totale Arcade:** Nuova UI dedicata, nuovi suoni esclusivi per la sala giochi e chiusura sicura dei minigiochi migliorata.
* **🚀 Space Impacts:** Effettuata una pulizia del codice e un ribilanciamento generale delle difficoltà del minigioco.

---

### 🎭 Estetica & Personalizzazione

* **🆕 Nuove Skin Esclusive:** La Formattazione sblocca l'accesso a **nuove skin** di rarità Epica e Leggendaria, alcune con sorprese nascoste... 👀
* **🎤 Nuovo Evento Misterioso:** Un nuovo evento video si aggiunge alla famiglia. Sapresti riconoscerlo?
* **🖼️ Classifica con Stile:** Ora la classifica globale mostrerà la tua **foto profilo** basata sull'ultima skin che hai equipaggiato. Fai vedere a tutti il tuo stile!
* **👗 Guardaroba Rinnovato:** Il menu skin è stato ridisegnato con un look più scuro e moderno, navigazione più fluida e ordinamento migliorato.
* **🌈 Gestione Temi Dinamici:** Il motore grafico ora carica e gestisce dinamicamente i temi estetici legati alle skin, cambiando volto al gioco in modo fluido (Miglioramento Fase 2).
* **🏆 UI & Dettagli:** Gli achievements legati ad eventi passati verranno nascosti "fuori stagione", mantenendo la bacheca ordinata. Aggiunta anche una nuova UI dedicata per il menu Promozione.
* **🎵 Nuova Traccia Audio:** Aggiunta la "Musica Divina" al Jukebox e sistemato un bug sonoro legato alla *fireball* durante la Fury.

---

### ✨ Restyling Visivo (UI 2.0)

*L'intera interfaccia è stata raffinata per un look più moderno, scuro e coerente.*

* **🎬 Animazioni Fluide:** Nuove animazioni d'ingresso per l'interfaccia principale con effetti a cascata.
* **💫 Feedback Click Potenziato:** Nuove particelle scintillanti accompagnano ogni click per un feedback più soddisfacente.
* **📊 Punteggio Dinamico:** Il display dello score ora reagisce visivamente agli incrementi con effetti di scala.
* **🔘 Bottoni Rinnovati:** Nuovi effetti di profondità, luce e transizioni elastiche su tutta l'interfaccia.
* **🎯 Dettagli Visivi:** Glow pulsante sul bottone principale, scrollbar minimaliste, sfondo ambient arricchito e griglia cyber meno intrusiva.

---

### 🔊 Fix Audio

* **🔇 Fix Volume su Refresh:** Risolto il bug che causava l'audio a volume massimo dopo un refresh della pagina.
* **🎚️ Fix Controllo Volume:** Lo slider del volume master ora applica correttamente tutti i livelli di volume.

---

### ⚙️ Engine, Sicurezza & Sotto il Cofano

*Dietro le quinte, il codice ha subito una massiccia operazione di ottimizzazione per mantenere un rigoroso ordine sui file scritti e preparare un'infrastruttura solida per il futuro.*

* **🧹 Riorganizzazione File & CSS:** Il vecchio file monolitico *Game-Data* è stato diviso in più moduli specifici. Inoltre, è stato creato un nuovo file `mobile.css` altamente semplificato per un'esperienza smartphone impeccabile, strutturato per mantenere il codice pulito.
* **🔒 Sicurezza & Token di Sessione:** Aggiunti i token di sessione per proteggere gli account, fixare problemi di sincronizzazione e prevenire disconnessioni anomale.
* **☁️ Fix Salvataggi Mobile:** Risolto un bug critico che comprometteva i salvataggi giocando da dispositivi mobili.
* **⚡ Caricamenti Dinamici:** Modals e video promozionali ora sfruttano un caricamento dinamico per non appesantire il gioco all'avvio. Risolto anche il problema dell'interfaccia che occasionalmente non si caricava.
