# Area di test chiusa (issue #40)

Su `/test/` il gioco si apre solo dopo un login. Chi ci arriva per sbaglio vede la richiesta di accesso e basta: il bundle del gioco, la sala giochi ed Espofy non partono. In produzione non cambia niente.

## Come funziona

- **Dove**: `php/test-gate.php` (logica e pagine) e `php/test-access.php` (login, uscita, cambio password, pannello admin). Il cancello è in cima a `index.php`, `arcade.php` e `music/index.php`.
- **Quando è acceso**: solo se il percorso dello script contiene `/test/` (come `espo_is_production()` di `php/launch-gate.php`), mai per un parametro nell'URL. Fuori da `/test/` le pagine non lo vedono e `php/test-access.php` risponde 404.
- **Account**: li tiene un file sul server, `php/data/test-gate.php`, creato al primo accesso. Contiene nomi, password cifrate (bcrypt) e la chiave che firma i cookie. Non sta in git (`.gitignore`) e l'FTP non lo carica né lo cancella. Comincia con un `exit` PHP, quindi dal web è illeggibile anche dove `.htaccess` non vale. Se si perde, i tester vanno ricreati; l'admin si ricrea da solo dai secret.
- **Sessione**: un cookie firmato che dura 30 giorni, limitato a `/test/`. Reset, cambio password e disattivazione lo invalidano subito, su tutti i dispositivi.
- **Tentativi sbagliati**: dopo 10 in 15 minuti sullo stesso nome dallo stesso indirizzo, quel nome aspetta. Il blocco è per nome perché, se l'hosting mostrasse a tutti lo stesso indirizzo (un proxy), gli errori di uno non devono chiudere fuori l'admin.
- **Service worker**: la pagina di login risponde 401, mai 200, e toglie service worker e cache del gioco: altrimenti la copia in cache servirebbe il login al posto del gioco, o il gioco a chi non ha più l'accesso. Resta un caso limite accettato: chi aveva già il gioco in cache e ha la rete lentissima (oltre 2,5 s) può rivedere la copia vecchia fino al caricamento successivo.

## Ruoli

- **Admin**: entra con le credenziali dei secret. Dal pannello (`/test/php/test-access.php`) crea i tester, reimposta le password, cambia il ruolo (tester ↔ admin), disattiva, riattiva ed elimina. Le azioni di ogni riga sono icone: il nome completo compare passandoci sopra. Il cambio di ruolo vale subito, senza far rientrare nessuno. Un admin non può cambiare il proprio ruolo, disattivarsi o eliminarsi, e deve restare almeno un admin attivo. L'admin dei secret, se qualcuno lo riporta a tester, torna admin solo cambiando il secret.
- **Tester**: riceve dall'admin una password temporanea, che il pannello mostra una volta sola e non salva in chiaro. Al primo accesso deve sceglierne una sua (almeno 10 caratteri), prima di poter aprire il gioco. Se la dimentica, solo l'admin può reimpostarla.

## Login unico

Dopo il cancello il gioco entra da solo: un login, non due.

- **Come**: `index.php` e `arcade.php` caricano in testa `php/test-access.php?seed`, uno script che passa al gioco nome e password del suo account di gioco (progetto Supabase di sviluppo). Il nome è quello del cancello, scritto esattamente così (`login-register` distingue le maiuscole). La password deriva dalla chiave dell'archivio e non si salva da nessuna parte. Al primo accesso `login-register` crea l'account da sé.
- **Perché in `php/`**: il service worker mette in cache le pagine, mai quello che sta in `php/`; e lo script contiene la password dell'account di gioco. Arriva sempre `no-store`.
- **Profilo**: nella scheda Account compare «Area di test», con chi sei, «Gestisci tester» (solo admin) e «Cambia password». Il cambio di nome e di password del gioco e «Elimina account» sono nascosti: romperebbero il collegamento. Il reset dei progressi resta, con la password del gioco già inserita.
- **Esci**: l'«Esci» del gioco chiude anche l'area di test.
- **Nome già usato su dev**: se un tester ha lo stesso nome di un account di gioco che esiste già con un'altra password, il login automatico fallisce. Il gioco lo dice una volta e apre il login col nome già scritto: il tester inserisce la password di quell'account e in quella scheda non si riprova da solo. Niente viene sovrascritto. Su dev i nomi distinguono le maiuscole (indice unico su `username` così com'è): «Mario» e «mario» sono due account diversi, e un nome scritto diverso porta a un account nuovo e vuoto. Per ritrovare i progressi di un account esistente il nome nel cancello va scritto identico; altrimenti conviene un nome nuovo, anche perché `login-register` blocca un indirizzo dopo 10 password sbagliate in 15 minuti, e da un ufficio con un solo indirizzo i tester si bloccherebbero a vicenda. Collegare in automatico un account esistente richiederebbe una funzione sul progetto dev e un secret condiviso: per ora no.
- **Se si perde l'archivio** (`php/data/`), cambia la chiave e con lei tutte le password derivate: gli account di gioco creati dal login unico non si aprono più. Si rimedia cancellandoli dal progetto dev (tabelle `users` e `sessions`), così vengono ricreati vuoti, o reimpostando a mano la loro password.
- **Nomi**: da 3 a 20 caratteri fra lettere, numeri, `.` `_` `-`, perché sono anche i nomi nel gioco.
- **Togliere un tester**: disattivarlo o eliminarlo chiude l'area di test, ma l'account di gioco su dev resta, con la stessa password. Chi l'aveva cercata negli strumenti del browser potrebbe ancora usarlo da fuori (solo i suoi dati di prova). Per chiuderlo del tutto si cancella anche dal progetto dev. Un tester ricreato con lo stesso nome riceve comunque una password di gioco nuova: non ritrova l'account di prima.
- **Solo dalla stessa origine**: lo script del login unico risponde solo a richieste `Sec-Fetch-Site: same-origin`. Sui browser che non mandano l'intestazione (Safari prima della 16.4) il login unico non parte e il gioco chiede il suo login.
- **Intro**: col login automatico l'intro cinematica non parte, come dopo un F5.

## Accenderlo su test

1. In GitHub → Settings → Secrets and variables → Actions, creare **`TEST_ADMIN_USER`** (3-20 caratteri fra lettere, numeri, `.` `_` `-`) e **`TEST_ADMIN_PASSWORD`** (almeno 10 caratteri).
2. Promuovere su test. `scripts/generate-secrets.js` li scrive in `php/secrets.php`. Se mancano il deploy prosegue lo stesso e `/test/` resta chiuso con l'avviso «Area di test chiusa»; se ci sono ma non rispettano le regole, il workflow lo segnala con un avviso e il server lo scrive nel suo log.
3. Entrare su `/test/` con quelle credenziali e creare i tester dal pannello.

In produzione (`main.yml`) i due secret non servono: il cancello lì è spento.

## Recupero

- **Password dell'admin persa**: cambiare `TEST_ADMIN_PASSWORD` nei secret e rifare il deploy su test. Al primo accesso dopo il deploy l'admin viene reimpostato con la nuova password (il server confronta un'impronta del secret, non la password in chiaro).
- **Un tester non entra più**: l'admin gli reimposta la password dal pannello.

## Provarlo in locale

Il cancello si accende anche fuori da `/test/` con `ESPO_TEST_GATE=1`, ma solo su `localhost` o `127.0.0.1`: il flag può accenderlo, mai spegnerlo. Con il flag si possono passare anche `ESPO_TEST_ADMIN_USER`, `ESPO_TEST_ADMIN_PASSWORD` e `ESPO_TEST_GATE_DIR` (cartella dell'archivio). È quello che fa `dev/tests/e2e/test-gate.spec.ts`, che avvia un server PHP tutto suo: gli altri E2E girano senza cancello.
