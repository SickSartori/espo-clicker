/**
 * Ambiente auto-rilevato dall'URL — PURO e testabile.
 *
 * Un solo build serve dev e produzione: è l'URL a dire quale dei due è.
 *   - localhost / 127.0.0.1 / ::1 / *.local / *.test (MAMP, Laragon) → dev
 *   - path che contiene /test/ (Altervista)                          → dev
 *   - qualsiasi altra cosa (root prod)                               → production
 *
 * Viveva in backend-config.ts, dove sceglieva solo il progetto Supabase. Sta qui
 * perché ora decide anche le chiavi del salvataggio locale (core/save/keys.ts) e
 * quel modulo non deve tirarsi dietro backend-config (che al caricamento inietta
 * la cheatboard e lo store).
 *
 * ⚠️ NON confondere con isLocalHost() in host-env.ts: quello dice se siamo su una
 * macchina di sviluppo (routing asset R2 sì/no) e ignora il path. Qui /test/ su
 * Altervista è "dev" pur essendo un host remoto a tutti gli effetti.
 */
export function detectEnv(hostname: string, pathname: string): 'dev' | 'production' {
    var h = hostname || '';
    var p = pathname || '';
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.slice(-6) === '.local' || h.slice(-5) === '.test') return 'dev';
    if (p.indexOf('/test/') !== -1) return 'dev';
    return 'production';
}

/** Ambiente della pagina corrente. Fuori dal browser (test, SSR) → 'production'. */
export function currentEnv(): 'dev' | 'production' {
    try {
        return detectEnv(location.hostname || '', location.pathname || '');
    } catch (e) {
        return 'production';
    }
}
