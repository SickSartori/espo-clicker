# Backlog su GitHub (al posto di Trello)

Le idee, i problemi e le proposte vivono nelle **Issues** del repo, organizzate da un **Project** privato. Il roadmap (`roadmap.md`) resta il racconto delle release; le issue sono le singole voci.

## Come sono organizzate

Su Trello le liste mescolavano il *tipo* e lo *stato*. Qui sono due cose separate.

| Sezione di Trello | Su GitHub |
|---|---|
| Skin proposte | etichetta `skin` |
| Temi | etichetta `tema` |
| Musica (OST) | etichetta `musica` |
| Nuove aggiunte | etichetta `nuova-funzione` |
| Migliorie | etichetta `miglioria` |
| Problemi | etichetta `bug` |
| Da valutare | non un'etichetta: lo **Stato** «Da valutare» del Project, dove nasce ogni issue nuova |

- **Stato** (campo del Project): Da valutare → Pianificato → In corso → Fatto, più Scartato.
- **Release**: una milestone per `v3.3`, `v3.4`, `v3.5`, `v4.0`, come nel roadmap. Senza milestone = backlog.
- **Etichette di servizio**: `segnalazione` (arrivata dal pulsante Segnala del gioco), `test` (di prova, fuori produzione), `diritti` (marchi, loghi o persone reali da controllare: il caso Espostino), `consegna` (le cose da fare per consegnare una release: prove da telefono, caricamenti su R2, promozioni).
- **Viste del Project**: Lavagna, Da valutare, una lavagna per sezione (Skin, Temi, Musica, Funzioni, Migliorie, Problemi), Consegna, Tabella, Roadmap. Ogni vista di sezione è un filtro per etichetta con le colonne dello Stato.
- **Colonne del Project** (contesto che su Trello stava nella card): `Versione`, `Ambiente` (Produzione o Test, dall'URL: `/test/` è l'area di prova), `Lingua`, `Schermo` e `Creata su Trello`. Le mostrano le due tabelle (Da valutare, Tabella) e, con meno colonne, Lavagna e Problemi. Le riempie `scripts/trello-to-github.mjs --fields`.
- **Moduli** (`.github/ISSUE_TEMPLATE/`): uno per tipo, con i campi che servono (per la skin: rarità, arte, diritti, evento video; per la musica: dove suona, fonte e licenza). Mettono già l'etichetta giusta.

Il commit resta «solo la riga di soggetto»: `v3.4: skin — Espostino (#12)` collega la issue, `closes #12` nell'oggetto la chiude quando il commit arriva su `main`, cioè al rilascio.

## Come si mette in piedi

1. **Permesso** (una volta): `gh auth refresh -s project`, e conferma nel browser.
2. **Setup**: `node scripts/github-backlog-setup.mjs` mostra cosa farebbe; con `--apply` crea etichette, milestone, Project, stati e viste. Si può rilanciare: crea solo ciò che manca.
3. **Regole automatiche** (a mano, non hanno API): nel Project, ⋯ → Workflows: *Auto-add to project* (`is:issue`), *Item added* → Da valutare, *Item closed* → Fatto, *Pull request merged* → Fatto. Nella vista Roadmap, segnaposto «Milestone».
4. **Import da Trello**: esporta la board (Menu → Stampa, esporta e condividi → Esporta in JSON) e lanciane l'anteprima:
   `node scripts/trello-to-github.mjs export.json`
   Rivedi `trello-export/trello-import-preview.csv` (tipo assegnato, avvisi) e poi importa:
   `node scripts/trello-to-github.mjs export.json --apply --project <numero del Project>`
   Poi le colonne del Project: `node scripts/trello-to-github.mjs export.json --fields --project <numero>` (anteprima; con `--apply` scrive). Si può rilanciare: riscrive gli stessi valori.
   L'export e l'anteprima restano in `trello-export/`, ignorata da git: contengono i nomi utente dei giocatori.
5. **Dopo**: archivia la board Trello (sola lettura) e tieni l'export in un posto privato.

## Come l'import ha trattato il board (28/10/2026)

Il board vero non aveva le sette sezioni ma NEW, BUG, IMPROVED e molte liste «Release vX» archiviate: 194 card, 155 archiviate. Sono state importate le **37 card aperte** (9 delle quali nate dalla separazione delle liste di idee «Skin», «OST» e «Arcade» in una issue per voce). Restano fuori, elencate nell'anteprima con il motivo: la storia archiviata, le note di rilascio e le card già fatte (verificate nel codice). Il tipo si decide da titolo, lista e prefisso, in quest'ordine; lo script `ALREADY_DONE` e `RULES` in `scripts/trello-to-github.mjs` dicono cosa è già fatto e cosa il roadmap ha già collocato (le skin di Natale sono in v3.4).

⚠️ **La spunta di una checklist di Trello non vuol dire «fatto».** «Musica: Josespo Joestar» era spuntata e non lo era; «Musica: Halloween» non era spuntata ed era già uscita nella 3.2. Le voci nascono quindi sempre aperte, a Da valutare, con l'avviso di verificarle.

## Cosa l'import non porta

- **Le date di creazione sulla issue**: GitHub non le fa retrodatare. La data vera sta nella colonna `Creata su Trello` del Project (per le segnalazioni è l'ora di ricezione, per le altre card quella dell'id di Trello; per le voci di un elenco, quando la voce è stata aggiunta). Nel corpo c'è anche «ultima attività» e il link alla card.
- **Le immagini**: l'API non le carica, e i file di Trello si aprono solo con l'accesso alla board. Gli allegati sono elencati come link; per le skin l'arte è già in `assets/image/future/`.
- **Chi ha scritto cosa**: i nomi dei commentatori compaiono nel testo (`--no-authors` li toglie), ma non diventano assegnazioni.
- **Il nome utente dei giocatori** nelle segnalazioni dal gioco: viene tolto di proposito, il repo e il Project sono pubblici. Restano versione, lingua, schermo e URL (nel corpo e nelle colonne). Chi vuole pubblicarlo lo decide caso per caso: `--fields --users all` o `--users nome1,nome2` crea la colonna `Segnalata da` e la compila. Il 28/10/2026 è stata scritta solo per i due account di sviluppo (`TheLonelyGodEspo` e `TheLonelyGodEspoDev`, 8 schede); la segnalazione di un giocatore (#9) resta senza nome.
- **Chi era assegnato a una card** su Trello: non diventa un'assegnazione né una colonna (i nomi di Trello non sono quelli di GitHub, e sono nomi di persone).

## Da fare dopo il 17/11

Il pulsante «Segnala» del gioco crea ancora card su Trello (`php/trello-submit.php`). Passarlo a GitHub vuol dire: creare una issue con un token fine-grained (solo *Issues: scrittura* su questo repo, scade al massimo in un anno) al posto di key e token Trello, con le etichette per tipo più `segnalazione` e `test` fuori produzione, e senza username. Tocca `php/trello-submit.php`, `php/secrets.example.php`, `php/secrets-load.php`, `scripts/generate-secrets.js`, i due workflow (`TRELLO_KEY`/`TRELLO_TOKEN`) e la riga privacy in `langs/it.php` e `langs/en.php`. Non prima del rilascio: è codice di consegna e di segreti.
