/**
 * Asset manager — gemello V3 di js/asset-manager.js (F4 strangler).
 *
 * Contiene la LOGICA (retry+backoff, semaforo di concorrenza, stato pacchetti,
 * piano di caricamento progressivo) con le primitive d'ambiente INIETTABILI:
 * il preload reale via Image(), requestIdleCallback, CustomEvent e i listener
 * DOM restano nel wrapper legacy (o nei default browser qui sotto).
 *
 * Semantica replicata dal legacy:
 * - retry con backoff esponenziale + jitter, poi rinuncia silenziosa (false)
 * - max N preload concorrenti (semaforo con coda FIFO)
 * - load() idempotente: già caricato → resolve subito; in corso → stessa Promise
 * - pacchetti senza immagini → marcati loaded subito (dichiarativi)
 * - piano progressivo: solo trigger afterBoot, ordinati per priority,
 *   delay raddoppiato su host lenti (Altervista)
 */

export interface AssetPackage {
  label?: string;
  images?: string[];
  priority?: number;
  trigger?: { type?: string; delay?: number };
}
export type PackagesMap = Record<string, AssetPackage>;

export interface AssetManagerOptions {
  /** Getter (binding tardivo: window.ASSET_PACKAGES arriva da un file legacy). */
  getPackages: () => PackagesMap | undefined;
  /** Preload di UNA immagine, senza retry (il retry lo fa il manager). */
  loadImage?: (filename: string) => Promise<boolean>;
  /** Prefisso path immagini per il loadImage di default. */
  imgBase?: string;
  maxConcurrent?: number; // default 3
  maxRetries?: number; // default 3
  retryDelayMs?: number; // default 800
  /** Attesa iniettabile (test: immediata). */
  delayFn?: (ms: number) => Promise<void>;
  /** Esegui nel tempo libero del browser (default requestIdleCallback). */
  runIdle?: (fn: () => void) => void;
  /** Jitter del backoff in ms (default random 0..400; nei test deterministico). */
  jitterFn?: () => number;
  onPackageLoaded?: (name: string, pkg: AssetPackage) => void;
  onLog?: (msg: string) => void;
  onWarn?: (msg: string) => void;
}

function defaultLoadImage(imgBase: string) {
  return (filename: string): Promise<boolean> =>
    new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      // NB: niente loading='lazy' — un'Image() staccata dal DOM con lazy non
      // scarica mai, bloccando la coda di preload.
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imgBase + filename;
    });
}

function defaultRunIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: 8000 });
  } else {
    setTimeout(fn, 200);
  }
}

const defaultDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class AssetManager {
  private readonly opts: Required<
    Pick<AssetManagerOptions, 'maxConcurrent' | 'maxRetries' | 'retryDelayMs'>
  > &
    AssetManagerOptions;
  private readonly loadImage: (filename: string) => Promise<boolean>;
  private readonly delayFn: (ms: number) => Promise<void>;
  private readonly runIdle: (fn: () => void) => void;
  private readonly jitterFn: () => number;

  private loaded = new Set<string>();
  private loading = new Map<string, Promise<void>>();
  private active = 0;
  private queue: Array<{ filename: string; resolve: () => void }> = [];

  constructor(options: AssetManagerOptions) {
    this.opts = {
      maxConcurrent: 3,
      maxRetries: 3,
      retryDelayMs: 800,
      ...options,
    };
    this.loadImage = options.loadImage ?? defaultLoadImage(options.imgBase ?? 'assets/image/');
    this.delayFn = options.delayFn ?? defaultDelay;
    this.runIdle = options.runIdle ?? defaultRunIdle;
    this.jitterFn = options.jitterFn ?? (() => Math.floor(Math.random() * 400));
  }

  /** Preload con retry: backoff esponenziale + jitter, poi rinuncia (false). */
  private async preloadWithRetry(filename: string): Promise<boolean> {
    for (let attempt = 0; ; attempt++) {
      if (await this.loadImage(filename)) return true;
      if (attempt >= this.opts.maxRetries) {
        this.opts.onWarn?.(`[AssetManager] Asset perso dopo retry: ${filename}`);
        return false;
      }
      await this.delayFn(this.opts.retryDelayMs * Math.pow(2, attempt) + this.jitterFn());
    }
  }

  /** Semaforo: max N preload concorrenti, coda FIFO. */
  private enqueue(filename: string): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ filename, resolve });
      this.drainQueue();
    });
  }

  private drainQueue(): void {
    while (this.active < this.opts.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.active++;
      void this.preloadWithRetry(item.filename).then(() => {
        this.active--;
        item.resolve();
        this.drainQueue();
      });
    }
  }

  isLoaded(name: string): boolean {
    return this.loaded.has(name);
  }

  isLoading(name: string): boolean {
    return this.loading.has(name);
  }

  load(name: string): Promise<void> {
    if (this.loaded.has(name)) return Promise.resolve();
    const inFlight = this.loading.get(name);
    if (inFlight) return inFlight;

    const packages = this.opts.getPackages();
    const pkg = packages?.[name];
    if (!pkg) {
      this.opts.onWarn?.(`[AssetManager] Pacchetto sconosciuto: ${name}`);
      return Promise.resolve();
    }

    const images = pkg.images ?? [];
    if (images.length === 0) {
      // Pacchetto dichiarativo (es. VIDEO_EVENTS): pronto subito
      this.loaded.add(name);
      this.opts.onPackageLoaded?.(name, pkg);
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve) => {
      this.runIdle(() => {
        this.opts.onLog?.(
          `[AssetManager] 📦 Caricamento: ${pkg.label} (${images.length} immagini)`,
        );
        void Promise.all(images.map((f) => this.enqueue(f))).then(() => {
          this.loaded.add(name);
          this.loading.delete(name);
          this.opts.onLog?.(`[AssetManager] ✅ Pronto: ${pkg.label}`);
          this.opts.onPackageLoaded?.(name, pkg);
          resolve();
        });
      });
    });

    this.loading.set(name, promise);
    return promise;
  }

  loadMultiple(names: string[]): Promise<void[]> {
    return Promise.all(names.map((n) => this.load(n)));
  }

  status(): Record<string, { label: string | undefined; loaded: boolean; loading: boolean }> {
    const packages = this.opts.getPackages() ?? {};
    const result: Record<string, { label: string | undefined; loaded: boolean; loading: boolean }> = {};
    for (const name of Object.keys(packages)) {
      result[name] = {
        label: packages[name]!.label,
        loaded: this.loaded.has(name),
        loading: this.loading.has(name),
      };
    }
    return result;
  }

  /**
   * Piano di caricamento progressivo post-boot (PURO, il caller fa i setTimeout):
   * solo pacchetti con trigger afterBoot, in ordine di priority, con delay
   * raddoppiato su host lenti (Altervista smaltisce meglio se distanziati).
   */
  progressivePlan(slowHost: boolean): Array<{ name: string; delay: number }> {
    const packages = this.opts.getPackages();
    if (!packages) return [];
    return Object.keys(packages)
      .sort((a, b) => (packages[a]!.priority ?? 0) - (packages[b]!.priority ?? 0))
      .filter((name) => packages[name]!.trigger?.type === 'afterBoot')
      .map((name) => {
        let delay = packages[name]!.trigger?.delay ?? 5000;
        if (slowHost) delay *= 2;
        return { name, delay };
      });
  }
}

export function createAssetManager(options: AssetManagerOptions): AssetManager {
  return new AssetManager(options);
}
