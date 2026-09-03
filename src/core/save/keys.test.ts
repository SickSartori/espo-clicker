import { describe, it, expect } from 'vitest';
import { saveKeysFor } from './keys';
import { detectEnv } from '../../lib/env';

describe('saveKeysFor', () => {
  // Il valore è hardcoded di proposito: se qualcuno cambia la chiave di
  // produzione, ogni giocatore riparte dalla cache locale vuota al primo
  // caricamento. Questo test è lì per far fallire la build prima che succeda.
  it('produzione: chiavi storiche, INVARIATE', () => {
    expect(saveKeysFor('production')).toEqual({
      save: 'espotoolClickerSaveV9',
      legacyBackup: 'espotoolClickerSaveV9_Backup_Legacy',
    });
  });

  it('dev: chiavi separate, così /test/ non scrive nello slot della produzione', () => {
    const dev = saveKeysFor('dev');
    const prod = saveKeysFor('production');
    expect(dev.save).toBe('espotoolClickerSaveV9__dev');
    expect(dev.save).not.toBe(prod.save);
    expect(dev.legacyBackup).not.toBe(prod.legacyBackup);
  });

  it('le due chiavi di un ambiente sono distinte fra loro', () => {
    for (const env of ['dev', 'production'] as const) {
      const k = saveKeysFor(env);
      expect(new Set([k.save, k.legacyBackup]).size).toBe(2);
    }
  });

  // Lo slot `<save>_Backup` non esiste più: nessun client lo ha mai scritto
  // dal passaggio a IndexedDB, quindi non deve tornare per sbaglio.
  it('nessuna chiave di backup accanto al record principale', () => {
    for (const env of ['dev', 'production'] as const) {
      expect(Object.keys(saveKeysFor(env)).sort()).toEqual(['legacyBackup', 'save']);
    }
  });

  // Il senso della separazione è il deploy reale: `/test/` è una sottocartella
  // dello STESSO host della produzione (FTP_REMOTE_PATH in test.yml), quindi
  // stessa origine e stesso localStorage/IndexedDB.
  it('gli URL di test e produzione cadono su chiavi diverse', () => {
    const host = 'espooclicker.altervista.org';
    const test = saveKeysFor(detectEnv(host, '/test/index.php'));
    const prod = saveKeysFor(detectEnv(host, '/index.php'));
    expect(test.save).not.toBe(prod.save);
    expect(prod.save).toBe('espotoolClickerSaveV9');
  });
});
