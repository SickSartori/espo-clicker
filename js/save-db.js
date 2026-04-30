const DB_NAME = 'EspoClickerDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'espotoolClickerSaveV9';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

async function saveToIndexedDB(data) {
  const compressed = LZString.compressToUTF16(JSON.stringify(data));
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(compressed, SAVE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

async function loadFromIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      req.onsuccess = e => {
        const raw = e.target.result;
        if (!raw) { resolve(null); return; }
        try {
          resolve(JSON.parse(LZString.decompressFromUTF16(raw)));
        } catch {
          resolve(null);
        }
      };
      req.onerror = e => reject(e.target.error);
    });
  } catch {
    return null;
  }
}

async function clearIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(SAVE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

// Esposizione globale (concatenazione, no ES modules)
window.SaveDB = { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB };
