import { describe, it, expect } from 'vitest';
import { ThemeCssLoader } from './css-loader';

function mkLoader(overrides: Partial<ConstructorParameters<typeof ThemeCssLoader>[0]> = {}) {
  const injected: Array<{ href: string; onDone: () => void }> = [];
  const scheduled: Array<{ fn: () => void; ms: number }> = [];
  const loader = new ThemeCssLoader({
    inject: (href, onDone) => injected.push({ href, onDone }),
    cacheVer: () => '3.0.0',
    schedule: (fn, ms) => scheduled.push({ fn, ms }),
    ...overrides,
  });
  return { loader, injected, scheduled };
}

describe('ThemeCssLoader', () => {
  it('inietta il link con cache buster e marca loaded al done', () => {
    const { loader, injected } = mkLoader();
    const calls: string[] = [];
    loader.load('theme-neon.css', () => calls.push('ready'));
    expect(injected).toHaveLength(1);
    expect(injected[0]!.href).toBe('css/theme-neon.css?v=3.0.0');
    expect(loader.isLoaded('theme-neon.css')).toBe(false);
    injected[0]!.onDone();
    expect(loader.isLoaded('theme-neon.css')).toBe(true);
    expect(calls).toEqual(['ready']);
  });

  it('già caricato → callback sincrona, nessun nuovo link', () => {
    const { loader, injected } = mkLoader();
    loader.load('t.css');
    injected[0]!.onDone();
    const calls: string[] = [];
    loader.load('t.css', () => calls.push('subito'));
    expect(calls).toEqual(['subito']);
    expect(injected).toHaveLength(1);
  });

  it('in volo → coalesce le callback sullo stesso link', () => {
    const { loader, injected } = mkLoader();
    const calls: string[] = [];
    loader.load('t.css', () => calls.push('a'));
    loader.load('t.css', () => calls.push('b'));
    expect(injected).toHaveLength(1); // nessun duplicato
    injected[0]!.onDone();
    expect(calls).toEqual(['a', 'b']);
  });

  it('themeFile vuoto → callback subito', () => {
    const { loader, injected } = mkLoader();
    const calls: string[] = [];
    loader.load('', () => calls.push('x'));
    loader.load(null, () => calls.push('y'));
    expect(calls).toEqual(['x', 'y']);
    expect(injected).toHaveLength(0);
  });

  it('failsafe: il timeout completa anche senza onload', () => {
    const { loader, scheduled } = mkLoader();
    const calls: string[] = [];
    loader.load('t.css', () => calls.push('ready'));
    expect(scheduled[0]!.ms).toBe(2500);
    scheduled[0]!.fn(); // scatta il failsafe
    expect(calls).toEqual(['ready']);
    expect(loader.isLoaded('t.css')).toBe(true);
  });

  it('finish idempotente: onload + failsafe → callback UNA volta', () => {
    const { loader, injected, scheduled } = mkLoader();
    const calls: string[] = [];
    loader.load('t.css', () => calls.push('ready'));
    injected[0]!.onDone();
    scheduled[0]!.fn();
    expect(calls).toEqual(['ready']);
  });

  it('callback che lancia non blocca le altre', () => {
    const warns: string[] = [];
    const { loader, injected } = mkLoader({ onWarn: (m) => warns.push(m) });
    const calls: string[] = [];
    loader.load('t.css', () => { throw new Error('boom'); });
    loader.load('t.css', () => calls.push('ok'));
    injected[0]!.onDone();
    expect(calls).toEqual(['ok']);
    expect(warns).toHaveLength(1);
  });
});
