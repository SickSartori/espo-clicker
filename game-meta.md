## 📄 Gameplay Estensivo di Espòòò Clicker

**Espòòò Clicker** è un gioco di progressione incrementale (clicker/idle) il cui ciclo di gioco è incentrato sulla risoluzione di "Bug Risolti" attraverso l'interazione manuale e l'automazione. 
Il gioco presenta sistemi di potenziamento a breve e lungo termine e meccaniche di *soft-reset* (Promozione) per un'espansione infinita.

### I. Fase Iniziale e Core Loop

#### 1. Accesso e Inizializzazione
All'avvio, il giocatore deve inserire un nome utente, necessario per il salvataggio dei progressi e la partecipazione al **Podio Online**. 
Il gioco carica o crea un `gameState` iniziale, impostando il valore base di un click a 1 Bug.

#### 2. Risoluzione Manuale (Clicking)
Il fulcro del gioco è il pulsante centrale, raffigurante il manager Espòòò. Ogni click:
* Incrementa il saldo attuale (`score`) e i punteggi cumulativi (`totalScore`, `lifetimeScore`).
* Riproduce il suono `sound-click`.
* Genera un feedback visivo che mostra i Bug guadagnati.
* Il valore del click è influenzato da Potenziamenti Click, Bonus Promozione e dall'eventuale Moltiplicatore Blue Screen.

#### 3. Produzione Automatica (BPS)
Il gioco si basa sul calcolo dei **BPS (Bugs Per Second)**, che vengono automaticamente aggiunti al punteggio 10 volte al secondo (intervallo di 100ms) tramite la `gameLoop`.

### II. Sistemi di Progressione

La progressione è gestita attraverso tre diversi negozi che si sbloccano man mano che il giocatore accumula Bug e totalizza click.

#### A. Squadra (Team)
(Colonna Destra - Ex Edifici)

Questi sono gli acquisti fondamentali per l'automazione.

| Acquisto (Esempio) | Tipo di Acquisto | Costo e Meccanica |
| :--- | :--- | :--- |
| **Stagista QA** | Elemento base del Team (BPS 0.1). | Il costo aumenta del **15%** per ogni unità già posseduta: $\text{Costo} = \text{Costo Base} \times 1.15^\text{Conteggio}$. |
| **Squadra QA Junior** | Team più avanzato (BPS 8). | Ogni acquisto incrementa permanentemente il BPS totale del gioco. |
| **Team AI Debug** | Acquisto finale (BPS 1400). | Il negozio scompare solo in caso di *Promozione*. |

#### B. Potenziamenti Click (Upgrade)
(Colonna Sinistra - Potenziamenti Te Stesso)

Questi acquisti singoli migliorano sia la risoluzione manuale che, in alcuni casi, la produzione automatica.

| Potenziamento (Esempio) | Requisito di Sblocco | Effetto |
| :--- | :--- | :--- |
| **Caffè Forte** | 10 Click Totali | Aggiunge un valore fisso al click base (+1). |
| **Mano Bionica** | 1.000 Click Totali | Aggiunge l'**1%** del BPS corrente al valore di ogni click. |
| **Click Divino** | 50.000 Click Totali | Migliora la Mano Bionica, portando il bonus BPS per click al **2%**. |
| **Click Automatico** | 10.000 Click Totali | Aggiunge BPS extra pari al numero di `Stagisti QA` posseduti. |
| **Hacking Etico** | 5.000 Click Totali | Raddoppia la probabilità di trovare Ticket Critici. |

#### C. Migliorie Team (Enhancements)
(Colonna Sinistra - Migliorie)

Questi sono potenziamenti unici che moltiplicano la produttività di specifiche unità del Team (Squadra). La sezione è visibile solo quando ci sono elementi acquistabili.

* **Sblocco:** Ogni miglioramento ha un costo in Bug e richiede un numero minimo di unità del Team specifico (`requiredCount`) (es. 1, 10, 25, 50 o 100 unità).
* **Funzione:** Forniscono moltiplicatori (x2, x3, x4) al BPS generato dall'unità Team associata (es. `Caffè Doppio` moltiplica per 2 il BPS dello `Stagista QA`).

### III. Eventi Dinamici e Moltiplicatori

| Evento | Meccanica di Trigger | Bonus e Durata |
| :--- | :--- | :--- |
| **Ticket Critico (Golden Bug)** | Appare casualmente, con un timer di spawn di base di 60-180 secondi. | Cliccarlo concede un bonus istantaneo calcolato come `(BPS * 30) + (ClickValue * 10) + 10` Bug. |
| **ERRORE DI SISTEMA! (Bluescreen)** | Ha una piccola probabilità di apparire, aumentata se il punteggio o i click totali contengono la sequenza **'404'**. | Applica un moltiplicatore di BPS e Click (fino a x4) per **30 secondi**, con sfondo Blue Screen e audio in loop. |

### IV. Promozione (Prestige System)

La Promozione è il sistema di *soft-reset* del gioco che introduce una valuta persistente.

#### 1. Calcolo e Reset
* **Sblocco:** La sezione si sblocca quando i Bug Risolti Totali (`totalScore`) raggiungono **1.000.000**.
* **Punti Promozione (PP):** Vengono guadagnati al reset tramite la formula: $\text{floor}(\sqrt{\frac{\text{Bug Risolti Totali}}{1.000.000}} \times 1.5)$.
* **Reset:** Resetta tutto (score, Team, upgrade click), ma mantiene PP, Obiettivi, tempo di gioco e Potenziamenti Promozione.

#### 2. Vantaggi Permanenti
* **Bonus PP Base:** Ogni PP accumulato fornisce un moltiplicatore permanente dell'**1%** al BPS e al Click Value per le run future.
* **Potenziamenti Promozione:** Acquistabili con i PP, forniscono vantaggi strategici persistenti:
    * **Sinergia Manageriale:** Aumenta l'efficacia di ogni PP dello 0.1% aggiuntivo (Acquisto multiplo).
    * **Accelerazione Iniziale:** Inizia ogni run con 1 `Stagista QA` gratuito.
    * **Ticket Premium:** Dimezza il tempo di spawn dei Ticket Critici.

### V. Meta-Progressione e Stato

| Funzionalità | Descrizione | Persistenza |
| :--- | :--- | :--- |
| **Salvataggio** | Il gioco salva automaticamente lo stato locale (`gameState`) ogni 5 secondi. | Locale (`localStorage`). |
| **Podio Online** | Il punteggio attuale e il livello Promozione sono inviati al server ogni 30 secondi. | Server MySQL. Il punteggio viene aggiornato solo se è un nuovo record. |
| **Obiettivi (Achievements)** | Sbloccati al raggiungimento di pietre miliari specifiche (es. `primoClick`, `unodiTutto`). | Permanenti, anche dopo il Reset. |
| **Statistiche** | Accessibile tramite modale, mostra metriche totali (tempo di gioco, click totali, bug di sempre, ecc.). | Permanenti. |
| **Impostazioni** | Permette di regolare il volume e di resettare completamente il gioco, cancellando anche i punteggi dal Podio Online. | Locale (Volume) e Server (Punteggio). |
