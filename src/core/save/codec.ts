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
