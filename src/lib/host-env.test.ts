import { describe, it, expect } from 'vitest';
import { isLocalHost, useR2Assets } from './host-env';

describe('lib/host-env isLocalHost', () => {
  it('true per host locali (localhost, loopback, LAN, .local/.test)', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
    expect(isLocalHost('::1')).toBe(true);
    expect(isLocalHost('0.0.0.0')).toBe(true);
    expect(isLocalHost('192.168.1.42')).toBe(true);   // telefono → MAMP
    expect(isLocalHost('10.0.0.5')).toBe(true);
    expect(isLocalHost('172.16.0.9')).toBe(true);
    expect(isLocalHost('espo.local')).toBe(true);
    expect(isLocalHost('espo.test')).toBe(true);
  });

  it('false per host deployati (Altervista, dominio custom, Pages)', () => {
    expect(isLocalHost('espooclicker.altervista.org')).toBe(false);
    expect(isLocalHost('www.espooclicker.altervista.org')).toBe(false);
    expect(isLocalHost('espoclicker.it')).toBe(false);
    expect(isLocalHost('espo-clicker.pages.dev')).toBe(false);
    // Fuori dal range privato 172.16–172.31 → host pubblico.
    expect(isLocalHost('172.15.0.1')).toBe(false);
    expect(isLocalHost('172.32.0.1')).toBe(false);
  });
});

describe('lib/host-env useR2Assets (retro-compat Altervista)', () => {
  it('R2 resta ON dove lo era: sottodominio Altervista attuale', () => {
    // Garanzia di no-op: dove oggi R2 è attivo, resta attivo dopo il refactor.
    expect(useR2Assets('espooclicker.altervista.org')).toBe(true);
    expect(useR2Assets('www.espooclicker.altervista.org')).toBe(true);
  });

  it('R2 ora ON anche su dominio custom e Pages (prima davano 404)', () => {
    expect(useR2Assets('espoclicker.it')).toBe(true);
    expect(useR2Assets('espo-clicker.pages.dev')).toBe(true);
  });

  it('R2 resta OFF in locale: path relativi come oggi', () => {
    expect(useR2Assets('localhost')).toBe(false);
    expect(useR2Assets('192.168.1.42')).toBe(false);
  });
});
