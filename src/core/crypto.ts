/**
 * Crypto helpers — solo Web Crypto API.
 *
 * Sostituisce sha256_fallback in js/script.js:28-104 (ASCII-only, broken su unicode).
 * PWA gira sempre via HTTPS o localhost, quindi crypto.subtle è sempre disponibile.
 * Se manca, lanciamo: meglio errore esplicito che hash silenziosamente sbagliato.
 */

const subtle = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API non disponibile. Richiede HTTPS o localhost.');
  }
  return globalThis.crypto.subtle;
};

const toHex = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
};

/**
 * SHA-256 hash di una stringa, ritorna hex lowercase.
 */
export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await subtle().digest('SHA-256', data);
  return toHex(digest);
}

/**
 * HMAC-SHA256 con chiave string, ritorna hex lowercase.
 */
export async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await subtle().importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await subtle().sign('HMAC', cryptoKey, enc.encode(message));
  return toHex(sig);
}

/**
 * Random hex token di N byte (default 16 = 128 bit).
 */
export function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < buf.length; i++) out += buf[i]!.toString(16).padStart(2, '0');
  return out;
}
