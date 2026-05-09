/**
 * SaveDB — wrapper IndexedDB tipato.
 *
 * Sostituisce js/save-db.js (window.SaveDB). Identica struttura DB (EspoClickerDB.saves)
 * per zero-friction migration: un save scritto con la nuova classe è leggibile dal vecchio
 * codice e viceversa, finché lo schemaVersion del JSON è coerente.
 */

const DB_NAME = 'EspoClickerDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const DEFAULT_KEY = 'espotoolClickerSaveV9';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

export class SaveDB {
  constructor(private readonly key: string = DEFAULT_KEY) {}

  async write(payload: string): Promise<void> {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(payload, this.key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async read(): Promise<string | null> {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(this.key);
      req.onsuccess = (e) => {
        const v = (e.target as IDBRequest<string | undefined>).result;
        resolve(v ?? null);
      };
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async clear(): Promise<void> {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(this.key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }
}

/** Factory default che riusa la stessa chiave del codice legacy. */
export const defaultSaveDB = new SaveDB();
