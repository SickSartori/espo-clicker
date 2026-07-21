/**
 * Save worker.
 *
 * Sposta LZString compress + JSON.stringify fuori main thread.
 * Beneficio: save di gameState pesante (~50KB+) non blocca animazioni.
 *
 * Protocollo:
 *   main → worker: { type: 'encode', id, data }
 *   main → worker: { type: 'decode', id, payload }
 *   worker → main: { type: 'encoded', id, payload } | { type: 'decoded', id, data }
 *   worker → main: { type: 'error', id, error }
 */
import LZString from 'lz-string';

declare const self: DedicatedWorkerGlobalScope;

interface EncodeMsg { type: 'encode'; id: number; data: unknown }
/**
 * Variante da stringa GIÀ serializzata: il main thread fa JSON.stringify
 * (così i Decimal usano il loro toJSON/serializzazione nativa — un clone
 * strutturato li appiattirebbe in modo diverso) e il worker fa solo la parte
 * costosa: la compressione LZString.
 */
interface EncodeStringMsg { type: 'encodeString'; id: number; payload: string }
interface DecodeMsg { type: 'decode'; id: number; payload: string }
type InMsg = EncodeMsg | EncodeStringMsg | DecodeMsg;

if (typeof self !== 'undefined' && typeof (self as { postMessage?: unknown }).postMessage === 'function') {
  self.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data as InMsg;
    try {
      if (msg.type === 'encode') {
        const payload = LZString.compressToUTF16(JSON.stringify(msg.data));
        self.postMessage({ type: 'encoded', id: msg.id, payload });
      } else if (msg.type === 'encodeString') {
        const payload = LZString.compressToUTF16(msg.payload);
        self.postMessage({ type: 'encoded', id: msg.id, payload });
      } else if (msg.type === 'decode') {
        const json = LZString.decompressFromUTF16(msg.payload);
        const data = json ? JSON.parse(json) : null;
        self.postMessage({ type: 'decoded', id: msg.id, data });
      }
    } catch (err) {
      self.postMessage({
        type: 'error',
        id: (msg as { id: number }).id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
