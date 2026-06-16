// Dev check (no dipendenze): valida le voci achievement aggiunte.
// - struttura IT corretta, condition è una funzione
// - parità i18n: ogni id ha overlay EN con desc
// - nessuna condizione DUPLICATA (stesso sorgente) fra tutti gli achievement
// Uso: node check-achievements.js   → exit 0 se ok, 1 se errori.
const fs = require('fs');
const path = require('path');

// Shim minimale: i file dati usano window.* e new Decimal() a livello top.
class Decimal { constructor(v) { this._v = v; } gte() { return false; } gt() { return false; } }
global.Decimal = Decimal;
global.window = { gameData: { i18n: { en: {} } } };
global.IS_XMAS_TIME = false;
global.gameState = null;
global.bps = new Decimal(0);

const root = __dirname;
const loadFile = (rel) => { (0, eval)(fs.readFileSync(path.join(root, rel), 'utf8')); };
loadFile('js/data/achievements.js');
loadFile('js/data-en/achievements.js');

const ach = global.window.gameData.achievements || {};
const en = (global.window.gameData.i18n.en && global.window.gameData.i18n.en.achievements) || {};

const NEW_IDS = ['theAnswer', 'over9000', 'leetHaxor', 'shinyHunter', 'comboBreaker', 'doge', 'stonks', 'gottaGoFast', 'shutUpTakeMoney', 'groundhogDay', 'quantumLeap', 'bugClicker', 'marioCastle', 'oneUp', 'bazinga', 'catchEmAll', 'imagination', 'moneyMoneyMoney'];

const errors = [];
for (const id of NEW_IDS) {
  const a = ach[id];
  if (!a) { errors.push(`IT mancante: ${id}`); continue; }
  if (!a.name) errors.push(`${id}: name mancante`);
  if (!a.desc) errors.push(`${id}: desc mancante`);
  if (!a.type) errors.push(`${id}: type mancante`);
  if (typeof a.condition !== 'function') errors.push(`${id}: condition non è una funzione`);
  if (!('isSecret' in a)) errors.push(`${id}: isSecret mancante`);
  if (!('reward' in a)) errors.push(`${id}: reward mancante (usa null)`);
  const e = en[id];
  if (!e) errors.push(`EN mancante: ${id}`);
  else if (!e.desc) errors.push(`${id}: desc EN mancante`);
}

// Nessuna condizione duplicata (stesso sorgente) fra TUTTI gli achievement.
const bySrc = {};
for (const id in ach) {
  if (typeof ach[id].condition !== 'function') continue;
  const src = ach[id].condition.toString().replace(/\s+/g, ' ').trim();
  (bySrc[src] = bySrc[src] || []).push(id);
}
for (const src in bySrc) if (bySrc[src].length > 1) errors.push(`condizione duplicata: ${bySrc[src].join(', ')}`);

if (errors.length) { console.error('CHECK FALLITO:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: ${NEW_IDS.length} achievement validati (IT + EN), nessuna condizione duplicata.`);
