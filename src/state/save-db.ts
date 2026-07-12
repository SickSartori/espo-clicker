/**
 * API window.SaveDB per il legacy (ex js/save-db.js, post-F8 — reorg C-thin,
 * 2026-07-12). Implementazione DIRETTA sui moduli core (niente hop via
 * window.EspoV3): stesso DB (EspoClickerDB.saves), stessa chiave, stesso
 * codec LZString UTF16. Il save in scrittura NON passa da qui (script.js
 * scrive direttamente il payload già compresso dal worker — F8).
 */
import { defaultSaveDB } from '../core/save/db';
import { decodeSave } from '../core/save/codec';

async function loadFromIndexedDB(): Promise<unknown> {
    // Semantica legacy: null su QUALSIASI errore (db, payload corrotto, parse).
    try { return decodeSave(await defaultSaveDB.read()); } catch { return null; }
}

async function clearIndexedDB(): Promise<void> {
    return defaultSaveDB.clear(); // reject su errore (caller fa try/catch)
}

export function installSaveDb(): void {
    if (typeof window === 'undefined') return;
    (window as any).SaveDB = { loadFromIndexedDB, clearIndexedDB };
}
