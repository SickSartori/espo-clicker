const DB_NAME = 'EspoClickerDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'espotoolClickerSaveV9';

let _db = null;

// --- Delega V3 (Fase 1 strangler) -------------------------------------------
// dist-v3/game.modules.js è caricato PRIMA di questo bundle (vedi index.php),
// quindi se window.EspoV3 esiste è già pronto qui: la delega è sincrona, senza
// eventi "ready". EspoV3.save è il gemello TypeScript testato di questo file:
// stesso DB (EspoClickerDB.saves), stessa chiave, stesso codec LZString UTF16
// → un save scritto da V3 è leggibile dal legacy e viceversa.
// Fallback legacy (implementazioni sotto) solo se la build v3 manca/fallisce.
const v3save = () => (window.EspoV3 && window.EspoV3.save) || null;

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
  const v3 = v3save();
  if (v3) return v3.db.write(v3.encode(data)); // reject su errore tx, come il legacy

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
  const v3 = v3save();
  if (v3) {
    // Semantica legacy: null su QUALSIASI errore (db, payload corrotto, parse)
    try { return v3.decode(await v3.db.read()); } catch { return null; }
  }

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
  const v3 = v3save();
  if (v3) return v3.db.clear(); // reject su errore, come il legacy (caller fa try/catch)

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
