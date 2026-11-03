/**
 * Genera php/secrets.php dai secret del repository (GitHub Actions).
 *
 * Perché esiste: php/secrets.php contiene la secret_key R2 e il token Trello,
 * e il repo è PUBBLICO — committarlo significherebbe pubblicarli. Ma il file
 * deve comunque arrivare sul server, altrimenti il signer R2 risponde 500 e
 * gli asset vanno in 404. La via di mezzo è questa: i 5 valori segreti stanno
 * nei secret del repo, la STRUTTURA (board, liste, etichette, referer, ttl)
 * resta in php/secrets.example.php, che è tracciato e passa dalla review.
 *
 * Non è una divisione estetica: il bug delle card Trello senza etichetta
 * (07/08/2026) è nato proprio perché `labels` viveva solo in un file fuori dal
 * controllo di versione, quindi nessun deploy poteva portarlo. Con questo
 * assetto una voce nuova arriva in test da sola.
 *
 * Il file generato NON viene committato: vive nel workspace del runner il
 * tempo del deploy. php/secrets.php resta in .gitignore, che protegge il file
 * locale dello sviluppatore.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT     = path.join(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'php', 'secrets.example.php');
const OUTPUT   = path.join(ROOT, 'php', 'secrets.php');

// Segnaposto del template -> nome del secret nel repo.
// <ACCOUNT_ID> compare DUE volte (endpoint + campo account_id): vanno
// sostituite entrambe, ed è il motivo per cui sotto non si usa replace().
const SEGNAPOSTO = [
    ['<ACCOUNT_ID>',                    'R2_ACCOUNT_ID'],
    ['INSERISCI_ACCESS_KEY_ID_QUI',     'R2_ACCESS_KEY'],
    ['INSERISCI_SECRET_ACCESS_KEY_QUI', 'R2_SECRET_KEY'],
    ['INSERISCI_TRELLO_KEY_QUI',        'TRELLO_KEY'],
    ['INSERISCI_TRELLO_TOKEN_QUI',      'TRELLO_TOKEN'],
];

// Facoltativi: se il secret manca il segnaposto resta, e secrets_is_placeholder()
// lo legge come «non configurato». L'admin dell'area di test serve solo a test.yml:
// renderlo obbligatorio fermerebbe anche il deploy di produzione.
const FACOLTATIVI = [
    ['INSERISCI_TEST_ADMIN_USER_QUI',     'TEST_ADMIN_USER'],
    ['INSERISCI_TEST_ADMIN_PASSWORD_QUI', 'TEST_ADMIN_PASSWORD'],
];

function errore(msg) {
    // ::error:: lo evidenzia nel riepilogo del workflow.
    console.error(`::error::${msg}`);
    process.exit(1);
}

if (!fs.existsSync(TEMPLATE)) errore(`template mancante: ${path.relative(ROOT, TEMPLATE)}`);

let contenuto = fs.readFileSync(TEMPLATE, 'utf8');
const mancanti = [];

for (const [segnaposto, secret] of SEGNAPOSTO) {
    const valore = process.env[secret];
    if (!valore) { mancanti.push(secret); continue; }
    // split/join = sostituzione LETTERALE di ogni occorrenza. Le altre strade
    // sono entrambe sbagliate qui: replace(stringa) cambierebbe solo la prima
    // (e <ACCOUNT_ID> ne ha due), mentre una regex interpreterebbe i caratteri
    // speciali. Stesso motivo per cui questo step non si scrive con `sed`: le
    // chiavi R2 possono contenere '/', che per sed è il delimitatore.
    contenuto = contenuto.split(segnaposto).join(valore);
}

if (mancanti.length) {
    errore(`secret mancanti nel repository: ${mancanti.join(', ')}. `
        + 'Impostarli in Settings > Secrets and variables > Actions.');
}

const assenti = [];
for (const [segnaposto, secret] of FACOLTATIVI) {
    const valore = process.env[secret];
    if (!valore) { assenti.push(secret); continue; }
    // Questi li sceglie una persona (una password può contenere apici): escape per la
    // stringa PHP fra apici singoli, altrimenti secrets.php non si caricherebbe più.
    contenuto = contenuto.split(segnaposto).join(valore.replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}
if (assenti.length) {
    console.log(`::notice::secret facoltativi assenti: ${assenti.join(', ')} (l'area di test resta chiusa finché non ci sono).`);
}
// Le stesse regole di php/test-gate.php: un admin non valido lascia /test/ chiuso, meglio saperlo qui.
if (process.env.TEST_ADMIN_USER && !/^[A-Za-z0-9][A-Za-z0-9_.-]{2,19}$/.test(process.env.TEST_ADMIN_USER)) {
    console.log('::warning::TEST_ADMIN_USER non valido (3-20 caratteri fra lettere, numeri, . _ -): /test/ resterà chiuso.');
}
if (process.env.TEST_ADMIN_PASSWORD && process.env.TEST_ADMIN_PASSWORD.length < 10) {
    console.log('::warning::TEST_ADMIN_PASSWORD sotto i 10 caratteri: /test/ resterà chiuso.');
}

// Nessun segnaposto deve sopravvivere. Fermare il deploy qui è meglio che
// caricare un file che secrets_configured() rifiuterebbe a runtime: là il
// sintomo sarebbe un 500 sul signer e il gioco muto, con la causa lontana.
const residui = SEGNAPOSTO.map(([s]) => s).filter(s => contenuto.includes(s));
if (residui.length) errore(`segnaposto non sostituiti: ${residui.join(', ')}`);

fs.writeFileSync(OUTPUT, contenuto);
// Mai stampare il contenuto: finirebbe nel log del workflow.
console.log(`php/secrets.php generato da ${path.basename(TEMPLATE)} `
    + `(${contenuto.length} byte, ${SEGNAPOSTO.length} valori dai secret del repo).`);
