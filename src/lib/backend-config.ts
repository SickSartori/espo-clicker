/**
 * Config UNICO del backend cloud Supabase (ex js/backend-config.js — reorg
 * C-thin, 2026-07-12). Le anon key sono chiavi PUBBLICHE (pensate per il
 * client): l'accesso reale al DB è protetto da RLS + service_role lato Edge
 * Functions. installBackend() pubblica window.EspoBackend e, in dev, inietta
 * la cheatboard (script separato, non bundlato).
 */
import { installCheatboardBridge } from '../state/cheatboard-bridge';
import { detectEnv } from './env';

const BACKENDS = {
    dev: {
        url:  'https://mqdwhqaugldddazvoful.supabase.co',
        anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZHdocWF1Z2xkZGRhenZvZnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzk5MzIsImV4cCI6MjA5ODcxNTkzMn0.to5svZfwrT60TKuSAHmUVWcKcKROOipskNu6tOMZDLs',
    },
    production: {
        url:  'https://dcauqlpxbrqywfcpzvbh.supabase.co',
        anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYXVxbHB4YnJxeXdmY3B6dmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDYzODgsImV4cCI6MjA5ODMyMjM4OH0.3WBqyFyVzDsY983OypHocOobP5yNqoL6xHo3VWJ7_1c',
    },
} as const;

/**
 * Ambiente auto-rilevato dall'URL (UN solo build per dev e prod). La funzione è
 * stata spostata in lib/env.ts — la decide anche core/save/keys.ts, che non può
 * importare questo modulo. Ri-esportata qui: i call-site (e il test) restano.
 */
export { detectEnv };

export function installBackend(): void {
    if (typeof window === 'undefined') return;

    let ACTIVE: 'dev' | 'production';
    try {
        ACTIVE = detectEnv(location.hostname || '', location.pathname || '');
    } catch (e) {
        ACTIVE = 'production'; // contesto senza location: default prod
    }
    const cfg = BACKENDS[ACTIVE];

    /* POST verso una Edge Function con l'header Authorization richiesto da
       verify_jwt=true. Ritorna la Response di fetch (il chiamante fa .json()),
       così i call-site restano identici. `extra` = opzioni fetch aggiuntive
       (es. { keepalive: true }). */
    function call(slug: string, payload?: unknown, extra?: RequestInit): Promise<Response> {
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

    (window as any).EspoBackend = { env: ACTIVE, url: cfg.url, call: call };

    /* Cheatboard / Admin Console: dev-only, gattata su env (NON su config.php:
       sul dominio Altervista /test/ la spegnerebbe). Iniettata come script
       separato: la fetch parte ora ma l'esecuzione avviene dopo il bundle
       (latenza rete; la cheatboard è comunque difensiva sui globali).
       In build di PRODUZIONE non viene caricata. */
    if (ACTIVE === 'dev' && !(window as any).__cheatboardLoaded) {
        (window as any).__cheatboardLoaded = true;
        installCheatboardBridge();
        var s = document.createElement('script');
        s.src = 'js/cheatboard.js?v=' + Date.now(); // dev: sempre fresco
        s.defer = true;
        (document.head || document.documentElement).appendChild(s);
        console.warn('⚠️ DEV MODE (EspoBackend): Cheatboard attiva.');
    }
}
