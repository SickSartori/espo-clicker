/* =====================================================================
 * backend-config.js — Config UNICO del backend cloud (Supabase).
 * ---------------------------------------------------------------------
 * Punto SINGOLO per scegliere l'ambiente DEV o PROD. Le anon key sono
 * chiavi PUBBLICHE (pensate per stare nel client), quindi possono
 * risiedere qui senza problemi di sicurezza: l'accesso reale al DB è
 * protetto da RLS + service_role lato Edge Functions.
 *
 * Per andare in PRODUZIONE: cambiare ACTIVE in 'production'.
 * (dev = Altervista /test/ + MAMP/localhost; production = root Altervista)
 * ===================================================================== */
(function () {
    'use strict';

    const BACKENDS = {
        dev: {
            url:  'https://mqdwhqaugldddazvoful.supabase.co',
            anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZHdocWF1Z2xkZGRhenZvZnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzk5MzIsImV4cCI6MjA5ODcxNTkzMn0.to5svZfwrT60TKuSAHmUVWcKcKROOipskNu6tOMZDLs',
        },
        production: {
            url:  'https://dcauqlpxbrqywfcpzvbh.supabase.co',
            anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYXVxbHB4YnJxeXdmY3B6dmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDYzODgsImV4cCI6MjA5ODMyMjM4OH0.3WBqyFyVzDsY983OypHocOobP5yNqoL6xHo3VWJ7_1c',
        },
    };

    // >>> AMBIENTE ATTIVO <<< — auto-rilevato dall'URL, così UN SOLO build
    // funziona in entrambe le posizioni senza flip manuale né rebuild:
    //   - localhost / 127.0.0.1 / *.local / *.test (MAMP, Laragon) → dev
    //   - path che contiene /test/ (Altervista)                    → dev
    //   - qualsiasi altra cosa (root prod)                         → production
    // La cheatboard (dev-only) segue automaticamente: mai attiva in produzione.
    function detectEnv() {
        try {
            var h = location.hostname || '';
            var p = location.pathname || '';
            if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.slice(-6) === '.local' || h.slice(-5) === '.test') return 'dev';
            if (p.indexOf('/test/') !== -1) return 'dev';
        } catch (e) { /* contesto senza location: default prod */ }
        return 'production';
    }
    const ACTIVE = detectEnv();

    const cfg = BACKENDS[ACTIVE];

    /* POST verso una Edge Function con l'header Authorization richiesto da
       verify_jwt=true. Ritorna la Response di fetch (il chiamante fa .json()),
       così i call-site restano quasi identici a prima.
       `extra` permette opzioni fetch aggiuntive (es. { keepalive: true }). */
    function call(slug, payload, extra) {
        return fetch(cfg.url + '/functions/v1/' + slug, Object.assign({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + cfg.anon,
                'apikey': cfg.anon,
            },
            body: JSON.stringify(payload || {}),
        }, extra || {}));
    }

    window.EspoBackend = { env: ACTIVE, url: cfg.url, call: call };

    /* Cheatboard / Admin Console: dev-only. Gattata su EspoBackend.env (NON più
       su config.php lato server, che sul dominio Altervista /test/ la spegnerebbe).
       Iniettata come script separato (non è nel bundle): parte come fetch e viene
       eseguita dopo il bundle → i globali del gioco (Decimal, recalculateCPS…)
       sono già definiti, come col vecchio <script defer>.
       In build di PRODUZIONE (ACTIVE='production') NON viene caricata. */
    if (ACTIVE === 'dev' && !window.__cheatboardLoaded) {
        window.__cheatboardLoaded = true;
        var s = document.createElement('script');
        s.src = 'js/cheatboard.js?v=' + Date.now(); // dev: sempre fresco
        s.defer = true;
        (document.head || document.documentElement).appendChild(s);
        console.warn('⚠️ DEV MODE (EspoBackend): Cheatboard attiva.');
    }
})();
