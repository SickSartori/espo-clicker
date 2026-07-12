/**
 * Interop TEMPORANEO (reorg filone A → si rimuove a fine filone C).
 * Espone i campi dello store come accessor su window: il bundle legacy
 * continua a usare `bps`, `gameState = x`, `typeof gameState` come globali
 * bare, ma ogni accesso colpisce lo store. Va installato PRIMA che il
 * bundle legacy esegua (main.ts è caricato prima — contratto F0).
 * defineProperty fallirebbe su una proprietà `var` preesistente (le var
 * globali sono non-configurabili): in quel caso si logga FORTE l'elenco
 * (stile guard di boot F8) invece di rompere in silenzio.
 */
import { store, STORE_KEYS } from './store';

export function installInterop(
  target: any = typeof window !== 'undefined' ? window : undefined,
): void {
  if (!target) return;
  const failed: string[] = [];
  for (const k of STORE_KEYS) {
    try {
      Object.defineProperty(target, k, {
        get: () => (store as any)[k],
        set: (v: unknown) => { (store as any)[k] = v; },
        configurable: true,
      });
    } catch {
      failed.push(k as string);
    }
  }
  if (failed.length) {
    console.error(
      '[EspoV3.state] interop NON installato per: ' + failed.join(', ') +
      ' — proprietà già definite e non-configurabili (una var legacy è stata caricata prima del modulo V3?)',
    );
  }
}
