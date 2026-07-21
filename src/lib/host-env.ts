/**
 * Rilevamento host "locale" (macchina di sviluppo / LAN) — PURO e testabile.
 *
 * Serve a decidere DOVE vivono gli asset pesanti (assets/sounds, assets/video,
 * music/songs):
 *   - host locale  → path relativi serviti dal server di sviluppo (MAMP/Laragon)
 *   - host remoto  → Cloudflare R2 via signed URL (QUALSIASI deploy: sottodominio
 *                    Altervista, dominio custom, futuro Cloudflare Pages)
 *
 * Sostituisce il vecchio check hardcoded `/altervista\.org$/`: quello legava il
 * routing R2 al nome host letterale, quindi su un dominio custom (o su Pages) gli
 * asset andavano 404. Con "non-locale" il routing sopravvive al cambio dominio.
 *
 * ⚠️ NON confondere con detectEnv() in backend-config.ts: quello sceglie il
 * backend Supabase dev/prod e considera "dev" anche il path /test/ su Altervista
 * — che però serve comunque gli asset da R2. Qui conta SOLO se siamo su una
 * macchina locale, indipendentemente dal path.
 */
export function isLocalHost(hostname: string): boolean {
    var h = (hostname || '').toLowerCase();
    if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true;
    if (h.slice(-6) === '.local' || h.slice(-5) === '.test') return true;
    // Loopback + range IP privati (LAN): es. test da telefono verso MAMP.
    //   127.0.0.0/8 · 10.0.0.0/8 · 192.168.0.0/16 · 172.16.0.0/12
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return true;
    return false;
}

/**
 * True se gli asset pesanti vanno instradati su Cloudflare R2 (host deployato,
 * non locale). È il criterio che rimpiazza il vecchio IS_ALTERVISTA.
 *
 * Retro-compatibile: sul sottodominio Altervista attuale ritorna true come prima;
 * in locale ritorna false come prima. Cambia SOLO i casi nuovi (dominio custom,
 * Pages), dove ora ritorna true anziché rompere il caricamento.
 */
export function useR2Assets(hostname: string): boolean {
    return !isLocalHost(hostname);
}
