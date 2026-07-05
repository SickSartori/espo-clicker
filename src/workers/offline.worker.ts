/**
 * Offline progress worker.
 *
 * Calcola guadagni durante l'assenza dell'utente fuori dal main thread.
 * Sostituisce checkOfflineProgress() inline (script.js) che blocca al resume con calcoli grossi.
 *
 * Protocollo:
 *   main → worker:  { type: 'compute', payload: OfflineInput }
 *   worker → main:  { type: 'result',  payload: OfflineResult }
 *   worker → main:  { type: 'error',   error: string }
 */

import Decimal from 'break_eternity.js';

export interface OfflineInput {
  /**
   * Bug per secondo correnti. Stringa per i big number del gioco (oltre 1e308
   * un `number` diventa Infinity — a endgame bps supera il range double).
   */
  bps: number | string;
  /** Millisecondi di assenza. */
  awayMs: number;
  /** Cap massimo di secondi accreditabili (default 8h). */
  maxSeconds?: number;
  /** Efficienza server (0..1). Default 0.3 (30%). */
  efficiency?: number;
}

export interface OfflineResult {
  /** Guadagno totale accreditato — stringa Decimal (big-number safe). */
  earned: string;
  /** Secondi effettivi conteggiati (clamped). */
  effectiveSeconds: number;
  /** Efficienza usata. */
  efficiency: number;
}

export function computeOffline(input: OfflineInput): OfflineResult {
  const maxSec = input.maxSeconds ?? 8 * 3600;
  const eff = input.efficiency ?? 0.3;
  const seconds = Math.min(Math.max(0, input.awayMs / 1000), maxSec);
  // Stessa formula del legacy (bps.mul(sec).mul(eff)). NON bit-identico al
  // calcolo inline break_infinity della pagina: break_eternity sopra 9e15 lavora
  // in log10 → differenza relativa ~1e-13 sull'ultima cifra della mantissa.
  // Irrilevante per il gameplay (il guadagno offline è mostrato arrotondato).
  const earned = new Decimal(input.bps).max(0).mul(seconds).mul(eff);
  return { earned: earned.toString(), effectiveSeconds: seconds, efficiency: eff };
}

// === Worker entry point ===
// Si attiva solo quando importato in contesto Worker.
declare const self: DedicatedWorkerGlobalScope;
if (typeof self !== 'undefined' && typeof (self as { postMessage?: unknown }).postMessage === 'function') {
  self.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data as { type: string; payload?: OfflineInput };
    if (msg.type !== 'compute' || !msg.payload) return;
    try {
      const result = computeOffline(msg.payload);
      self.postMessage({ type: 'result', payload: result });
    } catch (err) {
      self.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  });
}
