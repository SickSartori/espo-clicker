/**
 * Codec save: JSON ↔ stringa compressa LZString UTF16.
 *
 * Sostituisce uso inline di `LZString.compressToUTF16` sparso in script.js / save-db.js.
 * Errori di parse → null (caller decide cosa fare).
 */
import LZString from 'lz-string';

export function encodeSave(data: unknown): string {
  return LZString.compressToUTF16(JSON.stringify(data));
}

/**
 * Comprimi una stringa JSON GIÀ serializzata dal caller.
 * Usata quando il caller ha bisogno dello stesso identico payload per più
 * destinazioni (IndexedDB / localStorage / cloud) o quando la serializzazione
 * deve avvenire nel main thread (Decimal custom) e solo la compressione va
 * spostata nel worker.
 */
export function encodeSaveString(json: string): string {
  return LZString.compressToUTF16(json);
}

export function decodeSave<T = unknown>(payload: string | null | undefined): T | null {
  if (!payload) return null;
  try {
    const json = LZString.decompressFromUTF16(payload);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
