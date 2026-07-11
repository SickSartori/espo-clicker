// --- Delega V3 (Fase 1 strangler → F8: fallback legacy rimosso) ---------------
// dist-v3/game.modules.js è caricato PRIMA di questo bundle (vedi index.php),
// quindi window.EspoV3.save è già pronto qui: la delega è sincrona, senza eventi
// "ready". EspoV3.save è il gemello TypeScript testato: stesso DB
// (EspoClickerDB.saves), stessa chiave, stesso codec LZString UTF16.
// Dalla F8 il ramo V3 è l'UNICO: niente più fallback IndexedDB inline qui.

// F8 — guard di contratto: dalla F8 in poi la build V3 è un requisito HARD (i
// fallback legacy dietro le deleghe EspoV3 sono stati rimossi in tutto il
// bundle). save-db.js è il primo file bundlato che delega a EspoV3, quindi è il
// punto giusto per segnalare UNA volta e in chiaro l'assenza dei moduli invece
// di far esplodere TypeError criptici sparsi. Non lancia: lascia fallire il boot
// naturalmente subito dopo, ma con la causa già scritta in console.
(function () {
  var req = ['save', 'economy', 'prestige', 'events', 'format', 'theme',
    'toast', 'rules', 'i18n', 'assets', 'workers', 'loop', 'migrations'];
  var missing = !window.EspoV3 ? ['(nessun modulo)'] : req.filter(function (k) { return !window.EspoV3[k]; });
  if (missing.length) {
    console.error('[EspoV3] build V3 mancante o incompleta — moduli assenti: ' +
      missing.join(', ') + '. Dalla F8 il legacy non ha piu fallback: esegui `npm run build`.');
  }
})();

// NB: nessun saveToIndexedDB qui — dalla F8 il save scrive direttamente
// `window.EspoV3.save.db.write(payload)` in script.js (payload già compresso dal
// worker, unico snapshot per IDB/localStorage/cloud). SaveDB espone solo load/clear.

async function loadFromIndexedDB() {
  const v3 = window.EspoV3.save;
  // null su QUALSIASI errore (db, payload corrotto, parse) — semantica invariata.
  try { return v3.decode(await v3.db.read()); } catch { return null; }
}

async function clearIndexedDB() {
  return window.EspoV3.save.db.clear(); // reject su errore (caller fa try/catch)
}

// Esposizione globale (concatenazione, no ES modules)
window.SaveDB = { loadFromIndexedDB, clearIndexedDB };
