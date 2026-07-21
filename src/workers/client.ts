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
let _offlineWorkerDead = false;
let _saveWorker: Worker | null = null;
let _saveWorkerDead = false;
let _saveSeq = 0;
const _saveCallbacks = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getOfflineWorker(): Worker | null {
  if (_offlineWorker) return _offlineWorker;
  // Worker morto (404 dello script, crash) → da qui in poi fallback main thread.
  if (_offlineWorkerDead) return null;
  if (typeof Worker === 'undefined') return null;
  try {
    _offlineWorker = new Worker(new URL('./offline.worker.ts', import.meta.url), { type: 'module' });
    // Senza questo, un fallimento di CARICAMENTO (es. 404) non arriva mai come
    // message → le promise pendenti resterebbero appese per sempre.
    _offlineWorker.addEventListener('error', () => {
      _offlineWorkerDead = true;
      _offlineWorker?.terminate();
      _offlineWorker = null;
    });
    return _offlineWorker;
  } catch {
    _offlineWorkerDead = true;
    return null;
  }
}

function getSaveWorker(): Worker | null {
  if (_saveWorker) return _saveWorker;
  if (_saveWorkerDead) return null;
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
    // Fallimento di caricamento/crash: rigetta TUTTE le pendenti (i caller hanno
    // il fallback sync) e marca il worker morto → future chiamate in main thread.
    _saveWorker.addEventListener('error', (e: ErrorEvent) => {
      _saveWorkerDead = true;
      _saveWorker?.terminate();
      _saveWorker = null;
      const err = new Error(e.message || 'save worker load/runtime error');
      for (const cb of _saveCallbacks.values()) cb.reject(err);
      _saveCallbacks.clear();
    });
    return _saveWorker;
  } catch {
    _saveWorkerDead = true;
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
    const cleanup = () => {
      w.removeEventListener('message', handler);
      w.removeEventListener('error', errHandler);
    };
    const handler = (e: MessageEvent) => {
      const msg = e.data as { type: string; payload?: OfflineResult; error?: string };
      cleanup();
      if (msg.type === 'result' && msg.payload) resolve(msg.payload);
      else reject(new Error(msg.error ?? 'unknown'));
    };
    // Worker mai partito (404) o crashato → calcolo sync in main thread,
    // il caller riceve comunque un risultato (mai promise appesa).
    const errHandler = () => {
      cleanup();
      resolve(computeOffline(input));
    };
    w.addEventListener('message', handler);
    w.addEventListener('error', errHandler);
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

/**
 * Comprimi una stringa JSON già serializzata, nel worker. Fallback main thread.
 * Il caller fa JSON.stringify (Decimal serializzati con la semantica del main
 * thread) e riusa lo stesso payload per IndexedDB / localStorage / cloud.
 */
export function encodeSaveStringAsync(json: string): Promise<string> {
  const w = getSaveWorker();
  if (!w) {
    return import('../core/save/codec').then((m) => m.encodeSaveString(json));
  }
  const id = ++_saveSeq;
  return new Promise((resolve, reject) => {
    _saveCallbacks.set(id, {
      resolve: (v) => resolve(v as string),
      reject,
    });
    w.postMessage({ type: 'encodeString', id, payload: json });
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
