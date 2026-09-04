/**
 * Censimento dei save PRE-LANCIO congelati in `founder_backup_prelancio` (prod).
 *
 * Perche' esiste: al lancio il Fondatore tiene 5 skin non-default e il picker, alla
 * conferma, fa `delete gs.founderCandidateSkins` (src/ui/render/index.ts). Dopo la
 * scelta la lista originale NON e' piu' recuperabile dal save. La tabella
 * `founder_backup_prelancio` (creata il 25/08/2026) congela i save di chi non e'
 * ancora rientrato; questo script li legge e dice quanto pesa la decisione.
 *
 * E' SOLA LETTURA: non scrive niente, ne' su Supabase ne' su disco.
 *
 * La service_role key NON va scritta in nessun file: si passa dall'ambiente.
 *
 *   PowerShell (Windows):
 *     $env:SUPABASE_URL = 'https://dcauqlpxbrqywfcpzvbh.supabase.co'
 *     $env:SUPABASE_SERVICE_KEY = '<incolla qui la key>'
 *     node scripts/censimento-fondatori.js
 *     Remove-Item Env:SUPABASE_SERVICE_KEY   # ripulisce la sessione
 *
 *   Git Bash:
 *     SUPABASE_URL=https://dcauqlpxbrqywfcpzvbh.supabase.co \
 *     SUPABASE_SERVICE_KEY=<key> node scripts/censimento-fondatori.js
 *
 * La key sta in Supabase -> Project Settings -> API -> service_role. E' un secret:
 * bypassa la RLS, quindi non va committata, incollata in chat, ne' lasciata in un file.
 */
const LZString = require('lz-string');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) {
    console.error('Mancano SUPABASE_URL e/o SUPABASE_SERVICE_KEY nell\'ambiente.');
    console.error('Vedi le istruzioni in testa a questo file.');
    process.exit(1);
}

/** Stessa regola di src/core/migrations/v2-to-v3.ts — se cambia la', cambiala qui. */
const MAX_KEPT = 5;
function idoneoFondatore(s) {
    if ((Number(s.totalResets) || 0) >= 1) return true;
    return (s.skins && Array.isArray(s.skins.unlocked) ? s.skins.unlocked : [])
        .some((x) => x && x !== 'default');
}

/**
 * Dice A COLPO D'OCCHIO se la chiave e' quella giusta, senza stamparla.
 * Le chiavi Supabase legacy sono JWT: il payload (in chiaro, non e' la firma)
 * porta `ref` = progetto e `role` = anon/service_role. Con due progetti in giro
 * — dev `mqdwhqau...` e prod `dcauqlpx...` — lo scambio e' l'errore n.1, e da
 * fuori si vede solo un 401 muto.
 */
function diagnosiChiave(key, urlAtteso) {
    const refAtteso = (urlAtteso.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
    console.log(`Chiave: ${key.length} caratteri, inizia per "${key.slice(0, 3)}…"`);

    if (key.startsWith('sb_secret_')) { console.log('Formato: secret key nuova. Ok.'); return; }
    if (key.startsWith('sb_publishable_')) {
        console.log('⚠️  Questa e\' la chiave PUBBLICABILE, non la secret: non legge la tabella.');
        return;
    }
    if (!key.startsWith('eyJ')) {
        console.log('⚠️  Non sembra ne\' un JWT ne\' una chiave sb_*. Forse hai copiato il');
        console.log('    "JWT Secret" o la password del database invece della API key.');
        return;
    }
    try {
        const p = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'));
        console.log(`Formato: JWT legacy — progetto "${p.ref}", ruolo "${p.role}".`);
        if (refAtteso && p.ref !== refAtteso)
            console.log(`⚠️  PROGETTO SBAGLIATO: la chiave e' di "${p.ref}", l'URL punta a "${refAtteso}".`);
        if (p.role !== 'service_role')
            console.log(`⚠️  RUOLO SBAGLIATO: serve "service_role", questa e' "${p.role}".`);
    } catch (e) {
        console.log('⚠️  JWT illeggibile: probabilmente e\' troncata (copia incompleta).');
    }
}

(async () => {
    diagnosiChiave(KEY, URL);

    const url = URL.replace(/\/+$/, '')
        + '/rest/v1/founder_backup_prelancio'
        + '?select=username,save_data&prelancio_intatto=eq.true';

    const res = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!res.ok) {
        console.error('\nHTTP', res.status, await res.text());
        // process.exit() con una richiesta ancora aperta fa crashare libuv su
        // Windows ("Assertion failed ... async.c"). Si esce col codice, non a forza.
        process.exitCode = 1;
        return;
    }

    const righe = await res.json();
    console.log(`Save pre-lancio ancora intatti: ${righe.length}\n`);

    const out = [];
    for (const r of righe) {
        let s = null;
        try {
            // save_data e' JSONB di tipo string: PostgREST lo restituisce gia' come
            // stringa JS, quindi il blob LZString-UTF16 arriva pronto.
            s = JSON.parse(LZString.decompressFromUTF16(r.save_data) || 'null');
        } catch (e) { /* gestito sotto */ }

        if (!s) { out.push({ username: r.username, esito: 'BLOB ILLEGGIBILE' }); continue; }

        const skins = (s.skins && Array.isArray(s.skins.unlocked) ? s.skins.unlocked : [])
            .filter((x) => x && x !== 'default');
        const ok = idoneoFondatore(s);

        out.push({
            username: r.username,
            ver: s.version ? `${s.version.major}.${s.version.minor}` : '?',
            schema: s.schemaVersion ?? '<3',
            resets: Number(s.totalResets) || 0,
            fmt: Number(s.totalFormattazioni) || 0,
            skin: skins.length,
            fondatore: ok ? 'SI' : 'no',
            perse: ok ? Math.max(0, skins.length - MAX_KEPT) : skins.length,
        });
    }

    out.sort((a, b) => (b.perse || 0) - (a.perse || 0));
    console.table(out);

    const idonei = out.filter((r) => r.fondatore === 'SI');
    const perse = out.reduce((n, r) => n + (r.perse || 0), 0);
    console.log(`\nIdonei al Fondatore : ${idonei.length}/${out.length}`);
    console.log(`Skin che il tetto a ${MAX_KEPT} cancellerebbe: ${perse}`);
    console.log('\n(Sola lettura: non e\' stato modificato niente.)');
})();
