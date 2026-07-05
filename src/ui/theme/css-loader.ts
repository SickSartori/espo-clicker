/**
 * Theme CSS lazy-loader — gemello V3 di loadThemeCSS (js/ui-functions.js, F5 fetta 2).
 *
 * Logica: dedup (già caricato → callback subito), coalescing dei caricamenti
 * in volo (niente <link> duplicati), failsafe timeout (onload sui <link> non è
 * garantito ovunque), errore = successo (meglio un tema senza CSS che un equip
 * bloccato). L'iniezione DOM reale è una primitiva iniettata dal wrapper.
 */

export interface ThemeCssLoaderOptions {
  /** Crea il <link> e chiama onDone su load O error (mai due volte richiesto: ci pensa il loader). */
  inject: (href: string, onDone: () => void) => void;
  /** Cache buster (getter: CACHE_VER arriva da PHP a runtime). */
  cacheVer: () => string | number;
  /** Prefisso path CSS. Default 'css/'. */
  cssBase?: string;
  /** Failsafe: dopo questo timeout il tema è considerato pronto comunque. Default 2500ms. */
  failsafeMs?: number;
  /** setTimeout iniettabile (test). */
  schedule?: (fn: () => void, ms: number) => void;
  onLog?: (msg: string) => void;
  onWarn?: (msg: string, err?: unknown) => void;
}

export class ThemeCssLoader {
  private readonly opts: ThemeCssLoaderOptions;
  private readonly loaded = new Set<string>();
  private readonly pending = new Map<string, Array<() => void>>();

  constructor(options: ThemeCssLoaderOptions) {
    this.opts = options;
  }

  isLoaded(themeFile: string): boolean {
    return this.loaded.has(themeFile);
  }

  load(themeFile: string | null | undefined, onReady?: () => void): void {
    if (!themeFile || this.loaded.has(themeFile)) {
      if (onReady) onReady();
      return;
    }

    const inFlight = this.pending.get(themeFile);
    if (inFlight) {
      if (onReady) inFlight.push(onReady);
      return;
    }
    this.pending.set(themeFile, onReady ? [onReady] : []);

    const cssBase = this.opts.cssBase ?? 'css/';
    const schedule = this.opts.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    const href = `${cssBase}${themeFile}?v=${this.opts.cacheVer()}`;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.loaded.add(themeFile);
      const cbs = this.pending.get(themeFile) ?? [];
      this.pending.delete(themeFile);
      for (const cb of cbs) {
        try {
          cb();
        } catch (e) {
          this.opts.onWarn?.('[Tema] callback equip fallita', e);
        }
      }
      this.opts.onLog?.(`[Tema] Caricato dinamicamente: ${themeFile}`);
    };

    this.opts.inject(href, finish);
    schedule(finish, this.opts.failsafeMs ?? 2500);
  }
}

export function createThemeCssLoader(options: ThemeCssLoaderOptions): ThemeCssLoader {
  return new ThemeCssLoader(options);
}
