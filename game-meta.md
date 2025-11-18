## ⚙️ Schema del Gameplay di Espòòò Clicker

Il gioco è un *clicker* incrementale in cui l'obiettivo è massimizzare la produzione di "Bug Risolti" (Bug), la valuta principale, attraverso click manuali e automazioni.

### I. Obiettivo e Valuta

| Elemento | Descrizione | Note |
| :--- | :--- | :--- |
| **Valuta Principale** | **Bug Risolti** (`score`) | Utilizzati per acquistare tutti gli upgrade e i potenziamenti del Team. |
| **Punto di Partenza** | Dopo aver inserito il nome utente. | Inizia con un valore di click base di 1. |

### II. Meccaniche di Produzione (BPS)

La produzione di Bug si divide tra risoluzione manuale (click) e automatica (BPS).

#### A. Risoluzione Manuale (Click)
| Componente | Meccanica | Effetto Principale |
| :--- | :--- | :--- |
| **Click Base** | Cliccare sull'immagine del manager Espòòò. | Aggiunge Bug direttamente al saldo (`score`). |
| **Potenziamenti Click** | Acquisti unici nella colonna sinistra. | Aumentano il valore base del click (`Caffè Forte`) o aggiungono una percentuale del BPS al valore del click (`Mano Bionica`, `Click Divino`). |

#### B. Produzione Automatica (BPS - Bugs Per Second)
| Tipo di Acquisto | Esempio | Funzione | Costo |
| :--- | :--- | :--- | :--- |
| **Squadra (Team)** | `Stagista QA`, `Task Force Jira`, `Squadra Agile`. | Generano BPS costante. | Aumenta esponenzialmente del 15% per ogni unità acquistata. |
| **Migliorie Team** | `Caffè Doppio`, `Framework Selenium`. | Potenziamenti unici che moltiplicano il BPS di un elemento del Team specifico (es. x2, x3). | Sbloccati solo dopo aver raggiunto un certo conteggio di quel dato elemento. |

**Formula BPS (Semplificata):**
$$BPS = (\sum \text{BPS Team Base} \times \prod \text{Moltiplicatori}) \times \text{Bonus Promozione} \times \text{Bonus Click-CPS} \times \text{Bluescreen}$$


### III. Eventi Dinamici e Moltiplicatori

| Evento | Descrizione | Impatto sul Gameplay |
| :--- | :--- | :--- |
| **Ticket Critico** | Un'icona di Bug dorata appare casualmente. | Cliccarlo fornisce un grande bonus istantaneo basato su BPS e Click Value. |
| **ERRORE DI SISTEMA!** | Evento raro (innescato in parte da numeri '404' nel punteggio/click). | Attiva il `bluescreenMultiplier` (x2-x4) per 30 secondi. |

### IV. Promozione (Prestige)

La Promozione è il meccanismo di soft-reset del gioco, necessario per la progressione a lungo termine.

| Meccanica | Dettagli | Criteri e Effetti |
| :--- | :--- | :--- |
| **Sblocco** | Punteggio totale di sempre (`totalScore`) raggiunge **1.000.000**. | |
| **Punti Promozione (PP)** | Calcolati dalla formula: $\text{floor}(\sqrt{\frac{\text{Bug Risolti Totali}}{1.000.000}} \times 1.5)$. | Vengono mantenuti dopo il reset. |
| **Reset** | Riporta il gioco allo stato iniziale (punteggio 0, Team 0, upgrade click persi). | Mantieni PP, Obiettivi e Potenziamenti Promozione. |
| **Bonus PP** | Ogni PP fornisce un aumento cumulativo di base dell'**1%** al BPS e al Click Value. | |
| **Potenziamenti Promozione** | Acquistati con i PP. | Forniscono bonus permanenti, come `Accelerazione Iniziale` (inizia con 1 Stagista QA gratuito). |

### V. Progressi Secondari

| Elemento | Funzione | Permanenza |
| :--- | :--- | :--- |
| **Obiettivi** (Achievements) | Sbloccati al raggiungimento di traguardi (es. 100 click, 1.000 bug). | Permanenti, mantenuti tra le run. |
| **Statistiche** | Tracciano metriche come click totali, tempo di gioco, bug totali di sempre. | Permanenti. |
| **Podio Online** | La classifica dei migliori punteggi e livelli Promozione, aggiornata ogni 30 secondi. | I dati vengono salvati su server. |
