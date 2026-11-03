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

- **Admin**: entra con le credenziali dei secret. Dal pannello (`/test/php/test-access.php`) crea i tester, reimposta le password, disattiva, riattiva ed elimina. Non può disattivare o eliminare se stesso, e deve restare almeno un admin attivo.
- **Tester**: riceve dall'admin una password temporanea, che il pannello mostra una volta sola e non salva in chiaro. Al primo accesso deve sceglierne una sua (almeno 10 caratteri), prima di poter aprire il gioco. Se la dimentica, solo l'admin può reimpostarla.

Il login del gioco resta quello di sempre (account del progetto Supabase di sviluppo): il cancello decide chi può aprire la pagina, non chi è il giocatore.

## Accenderlo su test

1. In GitHub → Settings → Secrets and variables → Actions, creare **`TEST_ADMIN_USER`** (3-24 caratteri fra lettere, numeri, `.` `_` `-`) e **`TEST_ADMIN_PASSWORD`** (almeno 10 caratteri).
2. Promuovere su test. `scripts/generate-secrets.js` li scrive in `php/secrets.php`. Se mancano il deploy prosegue lo stesso e `/test/` resta chiuso con l'avviso «Area di test chiusa»; se ci sono ma non rispettano le regole, il workflow lo segnala con un avviso e il server lo scrive nel suo log.
3. Entrare su `/test/` con quelle credenziali e creare i tester dal pannello.

In produzione (`main.yml`) i due secret non servono: il cancello lì è spento.

## Recupero

- **Password dell'admin persa**: cambiare `TEST_ADMIN_PASSWORD` nei secret e rifare il deploy su test. Al primo accesso dopo il deploy l'admin viene reimpostato con la nuova password (il server confronta un'impronta del secret, non la password in chiaro).
- **Un tester non entra più**: l'admin gli reimposta la password dal pannello.

## Provarlo in locale

Il cancello si accende anche fuori da `/test/` con `ESPO_TEST_GATE=1`, ma solo su `localhost` o `127.0.0.1`: il flag può accenderlo, mai spegnerlo. Con il flag si possono passare anche `ESPO_TEST_ADMIN_USER`, `ESPO_TEST_ADMIN_PASSWORD` e `ESPO_TEST_GATE_DIR` (cartella dell'archivio). È quello che fa `dev/tests/e2e/test-gate.spec.ts`, che avvia un server PHP tutto suo: gli altri E2E girano senza cancello.
