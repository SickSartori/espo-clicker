import { describe, it, expect, vi } from 'vitest';
import { AssetManager, type PackagesMap } from './manager';

// Manager di test: preload sincrono controllabile, niente idle/delay reali
function mkManager(
  packages: PackagesMap,
  overrides: Partial<ConstructorParameters<typeof AssetManager>[0]> = {},
) {
  return new AssetManager({
    getPackages: () => packages,
    loadImage: () => Promise.resolve(true),
    delayFn: () => Promise.resolve(),
    runIdle: (fn) => fn(),
    jitterFn: () => 0,
    ...overrides,
  });
}

describe('AssetManager.load', () => {
  it('carica un pacchetto e lo marca loaded, con evento', async () => {
    const events: string[] = [];
    const mgr = mkManager(
      { CORE: { label: 'Core', images: ['a.webp', 'b.webp'] } },
      { onPackageLoaded: (name) => events.push(name) },
    );
    await mgr.load('CORE');
    expect(mgr.isLoaded('CORE')).toBe(true);
    expect(mgr.isLoading('CORE')).toBe(false);
    expect(events).toEqual(['CORE']);
  });

  it('idempotente: già caricato → resolve subito; in corso → stessa Promise', async () => {
    let resolveIdle: (() => void) | null = null;
    const mgr = mkManager(
      { P: { label: 'P', images: ['x.webp'] } },
      { runIdle: (fn) => { resolveIdle = fn; } }, // idle sospeso → resta in loading
    );
    const p1 = mgr.load('P');
    const p2 = mgr.load('P');
    expect(p1).toBe(p2);
    expect(mgr.isLoading('P')).toBe(true);
    resolveIdle!();
    await p1;
    expect(mgr.isLoaded('P')).toBe(true);
  });

  it('pacchetto senza immagini → loaded subito (dichiarativo)', async () => {
    const mgr = mkManager({ VIDEO: { label: 'Video' } });
    await mgr.load('VIDEO');
    expect(mgr.isLoaded('VIDEO')).toBe(true);
  });

  it('pacchetto sconosciuto → warn, nessun throw', async () => {
    const warns: string[] = [];
    const mgr = mkManager({}, { onWarn: (m) => warns.push(m) });
    await expect(mgr.load('BOH')).resolves.toBeUndefined();
    expect(warns[0]).toContain('sconosciuto');
  });
});

describe('retry con backoff', () => {
  it('riprova maxRetries volte poi rinuncia silenziosamente', async () => {
    const attempts: number[] = [];
    const delays: number[] = [];
    const warns: string[] = [];
    const mgr = mkManager(
      { P: { label: 'P', images: ['rotto.webp'] } },
      {
        loadImage: () => { attempts.push(1); return Promise.resolve(false); },
        delayFn: (ms) => { delays.push(ms); return Promise.resolve(); },
        maxRetries: 3,
        retryDelayMs: 800,
        onWarn: (m) => warns.push(m),
      },
    );
    await mgr.load('P'); // non deve mai rigettare
    expect(attempts.length).toBe(4); // 1 + 3 retry
    expect(delays).toEqual([800, 1600, 3200]); // backoff esponenziale (jitter 0)
    expect(warns[0]).toContain('Asset perso');
    expect(mgr.isLoaded('P')).toBe(true); // il pacchetto completa comunque
  });

  it('successo al secondo tentativo → nessun warn', async () => {
    let calls = 0;
    const warns: string[] = [];
    const mgr = mkManager(
      { P: { label: 'P', images: ['flaky.webp'] } },
      { loadImage: () => Promise.resolve(++calls >= 2), onWarn: (m) => warns.push(m) },
    );
    await mgr.load('P');
    expect(calls).toBe(2);
    expect(warns).toEqual([]);
  });
});

describe('semaforo di concorrenza', () => {
  it('mai più di maxConcurrent preload in volo', async () => {
    let active = 0;
    let peak = 0;
    const resolvers: Array<() => void> = [];
    const mgr = mkManager(
      { BIG: { label: 'Big', images: ['1', '2', '3', '4', '5', '6'] } },
      {
        maxConcurrent: 2,
        loadImage: () =>
          new Promise<boolean>((resolve) => {
            active++;
            peak = Math.max(peak, active);
            resolvers.push(() => { active--; resolve(true); });
          }),
      },
    );
    let finished = false;
    const done = mgr.load('BIG').then(() => { finished = true; });
    // Svuota progressivamente la coda: il drenaggio avanza per microtask,
    // quindi cediamo il controllo con un macrotask a ogni giro.
    while (!finished) {
      if (resolvers.length > 0) resolvers.shift()!();
      await new Promise((r) => setTimeout(r, 0));
    }
    await done;
    expect(peak).toBe(2);
    expect(mgr.isLoaded('BIG')).toBe(true);
  });
});

describe('progressivePlan', () => {
  const packages: PackagesMap = {
    LATE: { label: 'Late', priority: 30, trigger: { type: 'afterBoot', delay: 20000 } },
    CORE: { label: 'Core', priority: 0 }, // niente trigger → escluso
    EARLY: { label: 'Early', priority: 10, trigger: { type: 'afterBoot', delay: 5000 } },
    MANUAL: { label: 'Manual', priority: 20, trigger: { type: 'onDemand' } }, // escluso
    NODELAY: { label: 'NoDelay', priority: 15, trigger: { type: 'afterBoot' } }, // delay default 5000
  };

  it('solo afterBoot, ordinati per priority, delay default 5000', () => {
    const mgr = mkManager(packages);
    expect(mgr.progressivePlan(false)).toEqual([
      { name: 'EARLY', delay: 5000 },
      { name: 'NODELAY', delay: 5000 },
      { name: 'LATE', delay: 20000 },
    ]);
  });

  it('host lento (Altervista) → delay raddoppiati', () => {
    const mgr = mkManager(packages);
    expect(mgr.progressivePlan(true).map((p) => p.delay)).toEqual([10000, 10000, 40000]);
  });

  it('status() riflette lo stato dei pacchetti', async () => {
    const mgr = mkManager(packages);
    await mgr.load('EARLY');
    const st = mgr.status();
    expect(st.EARLY).toEqual({ label: 'Early', loaded: true, loading: false });
    expect(st.CORE!.loaded).toBe(false);
  });
});
