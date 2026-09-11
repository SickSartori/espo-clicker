import { describe, it, expect } from 'vitest';
import { compareDecimalStrings, decideRollback, saveBelongsToOtherUser } from './anti-rollback';

describe('compareDecimalStrings', () => {
  it('numeri uguali → 0', () => expect(compareDecimalStrings('100', '100')).toBe(0));
  it('a > b numerico', () => expect(compareDecimalStrings('200', '100')).toBe(1));
  it('a < b numerico', () => expect(compareDecimalStrings('50', '100')).toBe(-1));
  it('mix string/number', () => expect(compareDecimalStrings(100, '50')).toBe(1));
  it('exp notation grossa: e+50 > e+10', () =>
    expect(compareDecimalStrings('1.5e+50', '9e+10')).toBe(1));
  it('exp notation: stesso esponente, mantissa decide', () =>
    expect(compareDecimalStrings('2e+30', '1e+30')).toBe(1));
  it('zero vs numero', () => expect(compareDecimalStrings('0', '1')).toBe(-1));
  it('null/undefined → 0 vs 0', () => expect(compareDecimalStrings(null, undefined)).toBe(0));

  // --- Oltre il range double (segnalazione 10/09/2026) ---
  // Il client manda Decimal.toFixed(0), cioè l'espansione decimale COMPLETA:
  // 401 cifre per 1e400. Number() la porta a Infinity e il vecchio confronto
  // rispondeva "pari" a qualunque coppia là sopra, azzerando l'anti-rollback.
  const pieno = (esp: number, guida = '1') => guida + '0'.repeat(esp);

  it('oltre 1,8e308 in cifre piene: decide l\'ordine di grandezza', () => {
    expect(compareDecimalStrings(pieno(400), pieno(399))).toBe(1);
    expect(compareDecimalStrings(pieno(399), pieno(400))).toBe(-1);
    expect(compareDecimalStrings(pieno(1000), pieno(400))).toBe(1);
  });

  it('oltre 1,8e308 a parità di grandezza: decide la prima cifra diversa', () => {
    expect(compareDecimalStrings(pieno(400, '2'), pieno(400))).toBe(1);
    expect(compareDecimalStrings(pieno(400), pieno(400, '2'))).toBe(-1);
    expect(compareDecimalStrings(pieno(400), pieno(400))).toBe(0);
    // Differenza sepolta in fondo a 400 cifre: float8 la perdeva, qui no.
    expect(compareDecimalStrings('1' + '0'.repeat(399) + '1', '1' + '0'.repeat(400))).toBe(1);
  });

  it('cifre piene ed esponenziale sono la stessa cosa', () => {
    expect(compareDecimalStrings(pieno(400), '1e400')).toBe(0);
    expect(compareDecimalStrings('1e400', pieno(399))).toBe(1);
    expect(compareDecimalStrings(pieno(20), '1e20')).toBe(0);
  });

  it('la precisione regge anche sotto il range double, dove float8 arrotonda', () => {
    // A 5e20 float8 non distingue due valori a meno di ~65.000 di distanza.
    expect(compareDecimalStrings('500000000000000000001', '500000000000000000000')).toBe(1);
    expect(compareDecimalStrings('204500069255931000001', '204500069255931000000')).toBe(1);
  });

  it('zeri, decimali e segni non spostano il verdetto', () => {
    expect(compareDecimalStrings('0007', '7')).toBe(0);
    expect(compareDecimalStrings('7.0', '7')).toBe(0);
    expect(compareDecimalStrings('0.5', '0.05')).toBe(1);
    expect(compareDecimalStrings('0', '-1')).toBe(1);
    expect(compareDecimalStrings('-5', '-10')).toBe(1); // fra negativi l'ordine si rovescia
    expect(compareDecimalStrings('-0', '0')).toBe(0);
  });

  it('spazzatura → 0, cioè "non so", non un verdetto inventato', () => {
    expect(compareDecimalStrings('abc', '100')).toBe(0);
    expect(compareDecimalStrings('', '100')).toBe(0);
    expect(compareDecimalStrings('1e', '100')).toBe(0);
  });
});

describe('decideRollback', () => {
  it('cloud null → local', () => expect(decideRollback({ lifetimeScore: '10' }, null)).toBe('local'));
  it('local null → cloud', () => expect(decideRollback(null, { lifetimeScore: '10' })).toBe('cloud'));
  it('entrambi null → local', () => expect(decideRollback(null, null)).toBe('local'));

  it('formattazione locale più alta vince', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 2, lifetimeScore: '0' },
        { totalFormattazioni: 1, lifetimeScore: '999999' },
      ),
    ).toBe('local');
  });

  it('formattazione cloud più alta vince', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 0, lifetimeScore: '999999' },
        { totalFormattazioni: 5, lifetimeScore: '0' },
      ),
    ).toBe('cloud');
  });

  it('parità formattazione → prestige decide', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 1, lifetimePrestigePoints: '500', lifetimeScore: '0' },
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '999' },
      ),
    ).toBe('local');
  });

  it('parità formattazione+prestige → score decide', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '500' },
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '1000' },
      ),
    ).toBe('cloud');
  });

  it('tutto identico → equal', () => {
    expect(
      decideRollback(
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '500' },
        { totalFormattazioni: 1, lifetimePrestigePoints: '100', lifetimeScore: '500' },
      ),
    ).toBe('equal');
  });

  it('campi mancanti trattati come 0', () => {
    expect(decideRollback({}, { lifetimeScore: '100' })).toBe('cloud');
    expect(decideRollback({ lifetimeScore: '100' }, {})).toBe('local');
  });
});

describe('saveBelongsToOtherUser', () => {
  it('due account diversi → estraneo (e' + "'" + ' il bug delle due schede: /test/ e produzione condividono lo slot locale)', () =>
    expect(saveBelongsToOtherUser('utente-test', 'ufficiale')).toBe(true));

  it('stesso account → non estraneo', () =>
    expect(saveBelongsToOtherUser('ufficiale', 'ufficiale')).toBe(false));

  it('spazi ai bordi: il backend trimma, il client mette in sessione la stringa grezza', () =>
    expect(saveBelongsToOtherUser('Mario', ' Mario ')).toBe(false));

  it('differenza di sole maiuscole → non estraneo (meglio non disarmare l' + "'" + 'anti-rollback per un dubbio)', () =>
    expect(saveBelongsToOtherUser('MARIO', 'mario')).toBe(false));

  it('stato di default (segnaposto) → intestatario ignoto, non estraneo', () =>
    expect(saveBelongsToOtherUser('Giocatore', 'ufficiale')).toBe(false));

  it('save senza username → non estraneo', () => {
    expect(saveBelongsToOtherUser('', 'ufficiale')).toBe(false);
    expect(saveBelongsToOtherUser(null, 'ufficiale')).toBe(false);
    expect(saveBelongsToOtherUser(undefined, 'ufficiale')).toBe(false);
  });

  it('nessun utente loggato → non estraneo (niente con cui confrontare)', () =>
    expect(saveBelongsToOtherUser('utente-test', null)).toBe(false));
});
