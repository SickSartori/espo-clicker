import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardia di js/cheatboard.js (3.2): il file è pubblico nell'area /test/, sulla
 * stessa origine della produzione, quindi chiunque potrebbe iniettarlo da
 * console nella pagina di produzione. Lo script deve rifiutarsi di partire —
 * e senza aver toccato niente — se la pagina non è di sviluppo o se il backend
 * attivo non è quello di dev.
 *
 * Si esegue il sorgente VERO con `window` e `location` finti: se la guardia
 * lascia passare, la prima riga dopo di lei scrive `window.cheatBPSBonus`
 * (e poi va a costruire il DOM). Il caso "passa" in un browser vero lo coprono
 * gli e2e (dev/tests/e2e/cheatboard.spec.ts, su localhost).
 */
const SRC = readFileSync(join(process.cwd(), 'js', 'cheatboard.js'), 'utf8');

function run(hostname: string, pathname: string, backendEnv: string | null) {
    const win: any = { recalculateCPS: () => {} };
    if (backendEnv) win.EspoBackend = { env: backendEnv };
    const errors: string[] = [];
    const fakeConsole = { error: (m: string) => errors.push(m), warn: () => {}, log: () => {} };
    let threw: unknown = null;
    try {
        // eslint-disable-next-line no-new-func
        new Function('window', 'location', 'console', 'Decimal', 'document', SRC)(
            win, { hostname, pathname }, fakeConsole, class { constructor() {} }, undefined);
    } catch (e) { threw = e; }
    return { win, errors, threw };
}

describe('js/cheatboard.js — guardia produzione', () => {
    it('pagina di produzione: si ferma subito, non tocca window', () => {
        const r = run('espooclicker.altervista.org', '/index.php', 'production');
        expect(r.threw).toBeNull();
        expect(r.win.__cheatboardBlocked).toBe(true);
        expect(r.win.cheatBPSBonus).toBeUndefined();
        expect(r.errors[0]).toContain('[Cheatboard] Bloccata');
    });
    it('anche col backend "dev" finto: la pagina di produzione basta a bloccarla', () => {
        const r = run('espooclicker.altervista.org', '/', 'dev');
        expect(r.win.__cheatboardBlocked).toBe(true);
        expect(r.win.cheatBPSBonus).toBeUndefined();
    });
    it('pagina di sviluppo ma backend di produzione (o assente): bloccata', () => {
        expect(run('localhost', '/Espo-Clicker/index.php', 'production').win.__cheatboardBlocked).toBe(true);
        expect(run('localhost', '/Espo-Clicker/index.php', null).win.__cheatboardBlocked).toBe(true);
    });
    it('area /test/ e localhost col backend dev: la guardia lascia passare', () => {
        for (const [h, p] of [['espooclicker.altervista.org', '/test/index.php'], ['localhost', '/Espo-Clicker/'], ['127.0.0.1', '/']]) {
            const r = run(h!, p!, 'dev');
            expect(r.win.__cheatboardBlocked, `${h}${p}`).toBeUndefined();
            // superata la guardia, la prima istruzione del pannello ha scritto su window
            expect(r.win.cheatBPSBonus, `${h}${p}`).toBeDefined();
        }
    });
});
