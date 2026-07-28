import { describe, it, expect } from 'vitest';
import { sha256, hmacSha256, randomHex } from './crypto';

describe('sha256', () => {
  it('hash di stringa vuota = SHA-256 noto', async () => {
    expect(await sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('hash deterministico', async () => {
    const a = await sha256('Espo Clicker');
    const b = await sha256('Espo Clicker');
    expect(a).toBe(b);
  });

  it('hash differente per input differenti', async () => {
    const a = await sha256('a');
    const b = await sha256('b');
    expect(a).not.toBe(b);
  });

  it('gestisce unicode (fallback originale falliva qui)', async () => {
    const out = await sha256('Promozione 🚀 äéìòù');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  it('vector test SHA-256 ufficiale "abc"', async () => {
    expect(await sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('hmacSha256', () => {
  it('output deterministico', async () => {
    const a = await hmacSha256('secret', 'payload');
    const b = await hmacSha256('secret', 'payload');
    expect(a).toBe(b);
  });

  it('chiave differente = output differente', async () => {
    const a = await hmacSha256('k1', 'msg');
    const b = await hmacSha256('k2', 'msg');
    expect(a).not.toBe(b);
  });

  it('lunghezza 64 hex', async () => {
    const out = await hmacSha256('key', 'msg');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('randomHex', () => {
  it('lunghezza default 32 chars (16 byte)', () => {
    expect(randomHex()).toHaveLength(32);
  });

  it('lunghezza custom', () => {
    expect(randomHex(8)).toHaveLength(16);
    expect(randomHex(32)).toHaveLength(64);
  });

  it('non collisione su 100 chiamate', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(randomHex());
    expect(set.size).toBe(100);
  });
});
