/**
 * Client wrapper per i Worker — promise-based.
 *
 * Vite supporta `new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' })`
 * e fa il bundling automatico.
 *
 * Fallback: se Worker non disponibile (vecchi browser, no module worker support)
 * gira in main thread sincrono.
 */
import { computeOffline } from './offline.worker';
import type { OfflineInput, OfflineResult } from './offline.worker';

let _offlineWorker: Worker | null = null;
let _saveWorker: Worker | null = null;
let _saveSeq = 0;
const _saveCallbacks = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getOfflineWorker(): Worker | null {
  if (_offlineWorker) return _offlineWorker;
  if (typeof Worker === 'undefined') return null;
  try {
    _offlineWorker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
    return _offlineWorker;
  } catch {
    return null;
  }
}

function getSaveWorker(): Worker | null {
  if (_saveWorker) return _saveWorker;
  if (typeof Worker === 'undefined') return null;
  try {
    _saveWorker = new Worker(new URL('./save.worker.ts', import.meta.url), { type: 'module' });
    _saveWorker.addEventListener('message', (e: MessageEvent) => {
      const msg = e.data as { type: string; id: number; payload?: string; data?: unknown; error?: string };
      const cb = _saveCallbacks.get(msg.id);
      if (!cb) return;
      _saveCallbacks.delete(msg.id);
      if (msg.type === 'error') cb.reject(new Error(msg.error ?? 'worker error'));
      else if (msg.type === 'encoded') cb.resolve(msg.payload);
      else if (msg.type === 'decoded') cb.resolve(msg.data);
    });
    return _saveWorker;
  } catch {
    return null;
  }
}

/** Calcola guadagno offline. Async-safe anche senza worker. */
export function computeOfflineAsync(input: OfflineInput): Promise<OfflineResult> {
  const w = getOfflineWorker();
  if (!w) {
    return Promise.resolve(computeOffline(input));
  }
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as { type: string; payload?: OfflineResult; error?: string };
      w.removeEventListener('message', handler);
      if (msg.type === 'result' && msg.payload) resolve(msg.payload);
      else reject(new Error(msg.error ?? 'unknown'));
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'compute', payload: input });
  });
}

/** Encode (compress) save in worker. Fallback main thread. */
export function encodeSaveAsync(data: unknown): Promise<string> {
  const w = getSaveWorker();
  if (!w) {
    // fallback dinamico — evita import sincrono che porterebbe lz-string nel bundle main
    return import('../core/save/codec').then((m) => m.encodeSave(data));
  }
  const id = ++_saveSeq;
  return new Promise((resolve, reject) => {
    _saveCallbacks.set(id, {
      resolve: (v) => resolve(v as string),
      reject,
    });
    w.postMessage({ type: 'encode', id, data });
  });
}

/** Decode save in worker. Fallback main thread. */
export function decodeSaveAsync<T = unknown>(payload: string): Promise<T | null> {
  const w = getSaveWorker();
  if (!w) {
    return import('../core/save/codec').then((m) => m.decodeSave<T>(payload));
  }
  const id = ++_saveSeq;
  return new Promise((resolve, reject) => {
    _saveCallbacks.set(id, {
      resolve: (v) => resolve(v as T | null),
      reject,
    });
    w.postMessage({ type: 'decode', id, payload });
  });
}

/** Termina worker (utile per cleanup test/pagina). */
export function terminateWorkers(): void {
  _offlineWorker?.terminate();
  _saveWorker?.terminate();
  _offlineWorker = null;
  _saveWorker = null;
  _saveCallbacks.clear();
}
