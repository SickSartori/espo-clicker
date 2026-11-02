// Prove delle parti pure di trello-to-github.mjs e github-backlog-setup.mjs: niente rete, niente gh.
import {
  classifyList, parseTitle, inferType, stripContext, labelToMilestone, safeText, assignComments,
  buildAll, buildIssues, toCsv, summarize, summarizeSkipped, marker, TYPE_LABELS,
  contextFields, ambienteFromUrl, createdFromId, projectFields, allowedReporters,
} from './trello-to-github.mjs';
import { LABELS, MILESTONES, STATUS_OPTIONS, VIEWS, PROJECT_FIELDS, REPORTER_FIELD } from './github-backlog-setup.mjs';

describe('classifyList', () => {
  it.each([
    ['Skin proposte', { type: 'skin' }],
    ['Temi', { type: 'tema' }],
    ['Musica (OST)', { type: 'musica' }],
    ['Nuove aggiunte', { type: 'nuova-funzione' }],
    ['Migliorie', { type: 'miglioria' }],
    ['Problemi', { type: 'bug' }],
    ['Da valutare', { type: null, valutare: true }],
    // le tre liste che riempie il pulsante «Segnala» del gioco
    ['NEW', { type: 'nuova-funzione' }],
    ['BUG', { type: 'bug' }],
    ['IMPROVED', { type: 'miglioria' }],
    // le liste che ha davvero il board
    ['TO BE DEFINE', { type: null, valutare: true }],
    ['TO DO', { type: null, status: 'Pianificato' }],
    ['IN DEVELOPMENT', { type: null, status: 'In corso' }],
    ['Release v3.4', { type: null, legacy: true }],
    ['Release (v2.2)', { type: null, legacy: true }],
    ['Release Notes', { type: null, skip: 'note di rilascio' }],
    ['Fatto', { type: null, done: true }],
    ['Qualcos\'altro', { type: null }],
  ])('«%s»', (nome, atteso) => {
    expect(classifyList(nome)).toEqual(atteso);
  });
});

describe('parseTitle', () => {
  it('toglie il prefisso dell\'endpoint e lo restituisce come tipo', () => {
    expect(parseTitle('BUG: il bottone è coperto')).toEqual({ title: 'il bottone è coperto', type: 'bug' });
    expect(parseTitle('NUOVO: sfida a due')).toEqual({ title: 'sfida a due', type: 'nuova-funzione' });
    expect(parseTitle('MIGLIORIA: più grande')).toEqual({ title: 'più grande', type: 'miglioria' });
  });
  it('toglie l\'emoji iniziale, senza inventare un tipo', () => {
    expect(parseTitle('💡 Classifica Arcade')).toEqual({ title: 'Classifica Arcade', type: null });
  });
  it('senza prefisso lascia il titolo e non inventa un tipo', () => {
    expect(parseTitle('Espostino con loghi finti')).toEqual({ title: 'Espostino con loghi finti', type: null });
  });
  it('titolo vuoto e titolo lunghissimo', () => {
    expect(parseTitle('').title).toBe('(senza titolo)');
    expect(parseTitle('x'.repeat(400)).title).toHaveLength(250);
  });
});

describe('inferType', () => {
  it('la prima parola decide skin, tema e musica', () => {
    expect(inferType('Skin di Natale: Elfespò').strong).toBe('skin');
    expect(inferType('Skin').strong).toBe('skin');
    expect(inferType('Tema primavera').strong).toBe('tema');
    expect(inferType('OST').strong).toBe('musica');
    expect(inferType('limite acquisto Sinergia Manageriale').strong).toBeNull();
  });
  it('gli indizi sul verbo coprono bug e migliorie, compresa la «è» accentata', () => {
    expect(inferType('Pulsante Promozione non è cliccabile').weak).toBe('bug');
    expect(inferType('Bottone Visualizza Password non funzionante').weak).toBe('bug');
    expect(inferType('Problemi sincronizzazione Audio').weak).toBe('bug');
    expect(inferType('Suddividere i file grossi in file più piccoli').weak).toBe('miglioria');
    expect(inferType('Rifare i video di Rick Roll con qualità migliore').weak).toBe('miglioria');
  });
  it('un titolo senza indizi non riceve un tipo a caso', () => {
    expect(inferType('Requisito errato per Framework SAFe')).toEqual({ strong: null, weak: null });
    expect(inferType('sfida a due')).toEqual({ strong: null, weak: null });
  });
});

describe('stripContext — il nome del giocatore non finisce su un repo pubblico', () => {
  const desc = 'Il bottone Fury è sotto il badge.\n\n---\n**Contesto tecnico** (allegato automaticamente)\n- 👤 Utente: `Mario123`\n- 🎮 Versione: `3.2.0`\n- 🗣️ Lingua: `it`\n- 🖥️ Schermo: `1366x768`\n';
  it('toglie la riga dell\'utente e tiene il resto', () => {
    const { body, fromGame } = stripContext(desc);
    expect(fromGame).toBe(true);
    expect(body).not.toContain('Mario123');
    expect(body).not.toContain('Utente');
    expect(body).toContain('Versione: `3.2.0`');
    expect(body).toContain('Schermo: `1366x768`');
  });
  it('se l\'utente era l\'unica riga del contesto, non resta un blocco vuoto', () => {
    const { body } = stripContext('Idea per l\'arcade.\n\n---\n**Contesto tecnico** (allegato automaticamente)\n- 👤 Utente: `Dario Moccia`\n');
    expect(body).toBe('Idea per l\'arcade.');
  });
  it('l\'URL della pagina perde i parametri: ci può essere lo sblocco dei tester', () => {
    const { body } = stripContext('Boh.\n\n---\n**Contesto tecnico** (allegato automaticamente)\n- 🎮 Versione: `3.2.0`\n- 🌐 URL: https://sito.example/test/?unlock=SEGRETO&stagione=christmas#x\n');
    expect(body).toContain('- 🌐 URL: https://sito.example/test/');
    expect(body).not.toContain('unlock');
    expect(body).not.toContain('SEGRETO');
    expect(body).not.toContain('stagione');
  });
  it('una card scritta a mano passa intatta', () => {
    expect(stripContext('Idea: un tema primavera')).toEqual({ body: 'Idea: un tema primavera', fromGame: false });
  });
});

describe('labelToMilestone', () => {
  it('versioni → milestone vX.Y, solo se la milestone esiste', () => {
    const known = new Set(['v3.3', 'v3.4']);
    expect(labelToMilestone(['3.3'], known)).toBe('v3.3');
    expect(labelToMilestone(['Altro', 'v3.4.1'], known)).toBe('v3.4');
    expect(labelToMilestone(['v3.0'], known)).toBeNull();   // la 3.0 è storia: niente milestone
    expect(labelToMilestone(['Altro', 'test'], known)).toBeNull();
  });
});

describe('safeText — le menzioni di Trello non avvisano sconosciuti su GitHub', () => {
  it('chiude @nome nel codice inline e lascia stare le email', () => {
    expect(safeText('@gabrielsartori27 aggiungo che…')).toBe('`@gabrielsartori27` aggiungo che…');
    expect(safeText('scrivi a @a e a @b_c')).toBe('scrivi a `@a` e a `@b_c`');
    expect(safeText('mail: nome@dominio.it')).toBe('mail: nome@dominio.it');
    expect(safeText('già `@x` nel codice')).toBe('già `@x` nel codice');
  });
  it('anche «#12» non deve puntare a una issue di GitHub', () => {
    expect(safeText('come nel #12 e (#3)')).toBe('come nel `#12` e (`#3`)');
    expect(safeText('Q#bert')).toBe('Q#bert');
  });
});

describe('assignComments', () => {
  const items = [{ id: 'i1', name: 'Barone Esphura' }, { id: 'i2', name: 'Josespo Joestar (come descrizione "Nigerunda")' }, { id: 'i3', name: 'Doom' }];
  const c = (text) => ({ data: { text }, date: '2026-09-28' });

  it('un commento va alla voce il cui nome sta nella prima riga; senza nome segue il precedente', () => {
    const { byItem, orphans } = assignComments(items, [c('Barone Esphura:\nUn antagonista.'), c('@x aggiungo: sono due persone'), c('Josespo Joestar:\n"Nigerunda"')]);
    expect(byItem.get('i1')).toHaveLength(2);
    expect(byItem.get('i2')).toHaveLength(1);
    expect(byItem.get('i3')).toHaveLength(0);
    expect(orphans).toHaveLength(0);
  });
  it('il nome può comparire dentro un titolo più lungo (DoomEspo, EspoDoom)', () => {
    const { byItem } = assignComments(items, [c('Espoom, DoomEspo o EspoDoom?'), c('@y EspoDoom')]);
    expect(byItem.get('i3')).toHaveLength(2);
  });
  it('un commento che non è di nessuno e viene prima di tutto resta orfano e non finisce a caso', () => {
    const { byItem, orphans } = assignComments(items, [c('Ciao a tutti')]);
    expect(orphans).toHaveLength(1);
    for (const list of byItem.values()) expect(list).toHaveLength(0);
  });
});

describe('contesto della segnalazione → colonne del Project', () => {
  const game = 'Boh.\n\n---\n**Contesto tecnico** (allegato automaticamente)\n- 👤 Utente: `Mario123`\n- 🎮 Versione: `v3.2`\n- 🗣️ Lingua: `it`\n- 🖥️ Schermo: `1536x864`\n- 🌐 URL: https://www.espooclicker.altervista.org/test/?stagione=christmas\n- 🕒 Ricevuto: `2026-10-05 10:47:10 CEST`\n';

  it('legge le righe dopo l\'intestazione, solo le chiavi note', () => {
    expect(contextFields(game)).toEqual({
      utente: 'Mario123', versione: 'v3.2', lingua: 'it', schermo: '1536x864',
      url: 'https://www.espooclicker.altervista.org/test/?stagione=christmas', ricevuto: '2026-10-05 10:47:10 CEST',
    });
  });
  it('una riga «- parola: …» fuori dal contesto non è contesto (bonus, note di rilascio)', () => {
    expect(contextFields('- bonus: 12%\n- Versione: `9.9`\n')).toEqual({});
    expect(contextFields('**Contesto tecnico** (allegato automaticamente)\n- 📱 UA: `Mozilla/5.0`\n- bonus: 12%\n')).toEqual({});
  });
  it('il link che Trello fa dell\'URL incollato torna un URL', () => {
    const d = '**Contesto tecnico** (allegato automaticamente)\n- 🌐 URL: [https://sito.example/](https://sito.example/ "smartCard-inline")\n';
    expect(contextFields(d).url).toBe('https://sito.example/');
  });

  it('ambiente: /test/ o macchina locale è Test, il resto del sito è Produzione, senza URL valido niente', () => {
    expect(ambienteFromUrl('https://www.espooclicker.altervista.org/test/')).toBe('Test');
    expect(ambienteFromUrl('https://www.espooclicker.altervista.org/test/?stagione=christmas')).toBe('Test');
    expect(ambienteFromUrl('http://localhost:8888/Espo-Clicker/')).toBe('Test');
    expect(ambienteFromUrl('https://espooclicker.altervista.org/')).toBe('Produzione');
    expect(ambienteFromUrl('https://espooclicker.altervista.org/testimonial')).toBe('Produzione');
    expect(ambienteFromUrl('')).toBeNull();
    expect(ambienteFromUrl(undefined)).toBeNull();
  });

  it('la data di nascita sta nell\'id di Trello (secondi in esadecimale), nel giorno italiano', () => {
    expect(createdFromId('6ac3640e58a020bb3021fa11')).toBe('2026-10-05');
    // 22:30 UTC del 4 ottobre = 00:30 del 5 in Italia
    expect(createdFromId((Date.UTC(2026, 9, 4, 22, 30) / 1000).toString(16) + '0000000000000000')).toBe('2026-10-05');
  });
  it('un id che non è un ObjectId non dà una data inventata', () => {
    expect(createdFromId('a1')).toBeNull();
    expect(createdFromId('')).toBeNull();
    expect(createdFromId('zzzzzzzzzzzz')).toBeNull();
    expect(createdFromId('00000001aaaaaaaaaaaaaaaa')).toBeNull();   // 1970
  });

  it('i campi: contesto tecnico e data; per le segnalazioni vale l\'ora di ricezione, mai l\'utente', () => {
    const f = projectFields(contextFields(game), '2026-10-04');
    expect(f).toEqual({ Versione: 'v3.2', Lingua: 'it', Schermo: '1536x864', Ambiente: 'Test', 'Creata su Trello': '2026-10-05' });
    expect(JSON.stringify(f)).not.toContain('Mario123');
    expect(projectFields({}, '2026-08-03')).toEqual({ 'Creata su Trello': '2026-08-03' });
    expect(projectFields({}, null)).toEqual({});
  });
  it('ogni colonna scritta esiste fra quelle create dal setup', () => {
    const names = new Set(PROJECT_FIELDS.map((f) => f.name));
    const f = projectFields(contextFields(game), '2026-10-04');
    for (const k of Object.keys(f)) expect(names.has(k)).toBe(true);
    expect(names.has(REPORTER_FIELD.name)).toBe(false);   // «Segnalata da» non nasce da sola
    const amb = PROJECT_FIELDS.find((x) => x.name === 'Ambiente');
    expect(amb.options.map((o) => o.name)).toEqual(['Produzione', 'Test']);
    expect(amb.options.every((o) => o.color && o.description)).toBe(true);   // l'API le vuole tutte e tre
  });

  it('le colonne che le viste mostrano esistono: o sono nostre o sono di GitHub', () => {
    const known = new Set([...PROJECT_FIELDS.map((f) => f.name), REPORTER_FIELD.name, 'Labels', 'Milestone']);
    const shown = VIEWS.filter((v) => v.show);
    expect(shown.length).toBeGreaterThan(0);
    for (const v of shown) for (const n of v.show) expect(known.has(n), `${v.name}: ${n}`).toBe(true);
    // «Segnalata da» (facoltativa, nome di persone) solo nelle tabelle, mai sulle schede delle lavagne
    for (const v of VIEWS) if ((v.show || []).includes(REPORTER_FIELD.name)) expect(v.layout).toBe('TABLE_LAYOUT');
  });

  it('--users: nessuno di default, «all», oppure una lista senza badare alle maiuscole', () => {
    expect(allowedReporters(null)('Mario123')).toBe(false);
    expect(allowedReporters('all')('Mario123')).toBe(true);
    expect(allowedReporters('all')('')).toBe(false);
    const own = allowedReporters('TheLonelyGodEspo, thelonelygodespodev');
    expect(own('thelonelygodespo')).toBe(true);
    expect(own('TheLonelyGodEspoDev')).toBe(true);
    expect(own('Dario Moccia')).toBe(false);
  });
});

describe('buildAll', () => {
  const board = {
    name: 'Espòòò Clicker',
    lists: [
      { id: 'L1', name: 'BUG' }, { id: 'L2', name: 'Skin proposte' }, { id: 'L3', name: 'Da valutare' }, { id: 'L4', name: 'Fatto' },
      { id: 'L5', name: 'Release v3.4', closed: true }, { id: 'L6', name: 'Release Notes' }, { id: 'L7', name: 'NEW' },
    ],
    labels: [{ id: 'T', name: 'TEST' }, { id: 'V', name: '3.3' }, { id: 'X', name: 'urgente' }, { id: 'O', name: 'v3.0' }],
    cards: [
      { id: 'a1', idList: 'L1', pos: 1, name: 'BUG: Fury coperto', idLabels: ['T', 'V', 'X', 'O'], shortUrl: 'https://trello.com/c/a1',
        desc: 'Si vede male.\n\n---\n**Contesto tecnico** (allegato automaticamente)\n- 👤 Utente: `Mario123`\n- 🎮 Versione: `3.2.0`\n' },
      { id: 'b2', idList: 'L2', pos: 1, name: 'Espostino', desc: 'Postino con divisa. Scrive @gianni.', idLabels: [],
        attachments: [{ name: 'bozzetto.png', url: 'https://trello.com/1/x.png' }] },
      { id: 'c3', idList: 'L3', pos: 1, name: 'Qualcosa da decidere', desc: '', idLabels: [] },
      { id: 'd4', idList: 'L4', pos: 1, name: 'MIGLIORIA: già uscita', desc: '', idLabels: [], dateLastActivity: '2026-09-01T10:00:00Z' },
      { id: 'e5', idList: 'L5', pos: 1, name: 'Pulsante Promozione non è cliccabile', desc: '', idLabels: [] },
      { id: 'f6', idList: 'L1', pos: 2, closed: true, name: 'BUG: già chiusa', desc: '', idLabels: [] },
      { id: 'g7', idList: 'L2', pos: 2, name: 'BUG: nella lista sbagliata', desc: '', idLabels: [] },
      { id: 'h8', idList: 'L6', pos: 1, name: 'Release Notes - v3.1', desc: 'testo', idLabels: [] },
      { id: 'i9', idList: 'L7', pos: 1, name: 'Skin', desc: '', idLabels: [] },
      { id: 'j10', idList: 'L5', pos: 2, name: 'Refactoring nomenclatura degli "Edifici" con "Teams"', desc: '', idLabels: [] },
      { id: 'k11', idList: 'L7', pos: 2, name: '💡 Classifica Arcade', desc: 'Una classifica per gioco.', idLabels: [] },
      { id: 'l12', idList: 'L7', pos: 3, name: 'NUOVO: Skin di Natale: Elfespò', desc: 'Elfo di Babbo Natale', idLabels: ['T'] },
      { id: 'm13', idList: 'L7', pos: 4, name: 'OST', desc: '', idLabels: [] },
    ],
    checklists: [
      { id: 'k', idCard: 'b2', name: 'Da fare', checkItems: [{ name: 'Disegno', state: 'complete', pos: 1 }, { name: 'Frame click', state: 'incomplete', pos: 2 }] },
      { id: 'k2', idCard: 'i9', name: 'Skin', checkItems: [
        { id: 'it1', name: 'Barone Esphura', state: 'incomplete', pos: 1 },
        { id: 'it2', name: 'Josespo Joestar (video)', state: 'complete', pos: 2 },
      ] },
    ],
    actions: [
      { type: 'commentCard', date: '2026-08-02T09:00:00Z', data: { card: { id: 'b2' }, text: 'Occhio ai loghi, scrive @paolo.' }, memberCreator: { fullName: 'Gabriel Sartori' } },
      { type: 'commentCard', date: '2026-09-28T09:00:00Z', data: { card: { id: 'i9' }, text: 'Barone Esphura:\nAntagonista di Mazinga.' }, memberCreator: { fullName: 'Davide Canale' } },
    ],
  };
  const by = (list, id) => list.find((i) => i.cardId === id);
  const run = (opts) => buildAll(board, opts);

  it('importa le card aperte, anche quelle rimaste in una lista archiviata; salta la storia, le note di rilascio e i segnaposto', () => {
    const { issues, skipped } = run();
    expect(issues.map((i) => i.cardId).sort()).toEqual(['a1', 'b2', 'c3', 'd4', 'e5', 'g7', 'i9-it1', 'i9-it2', 'k11', 'l12']);
    const why = (id) => skipped.find((s) => s.cardId === id)?.why;
    expect(why('f6')).toBe('archiviata');
    expect(why('h8')).toBe('note di rilascio');
    expect(why('m13')).toBe('segnaposto vuoto');
    expect(why('j10')).toContain('già fatta');
  });

  it('--include-archived porta le archiviate come issue chiuse, non pianificate', () => {
    const f6 = by(run({ includeArchived: true }).issues, 'f6');
    expect(f6).toMatchObject({ state: 'closed', stateReason: 'not_planned', status: 'Scartato' });
  });

  it('segnalazione dal gioco: tipo dalla lista, niente nome utente, TEST non diventa l\'etichetta `test`', () => {
    const i = by(run().issues, 'a1');
    expect(i.title).toBe('Fury coperto');
    expect(i.labels).toEqual(expect.arrayContaining(['bug', 'segnalazione']));
    expect(i.labels).not.toContain('test');
    expect(i.body).toContain('Creata dall\'area di test');
    expect(i.milestone).toBe('v3.3');
    expect(i.body).not.toContain('Mario123');
    expect(i.body).toContain('Versione: `3.2.0`');
    expect(i.body).toContain('Etichette Trello: urgente, v3.0');   // la 3.0 non ha milestone: resta come nota
    expect(i.body).toContain('https://trello.com/c/a1');
  });

  it('ogni issue porta le colonne del Project; l\'utente resta a parte e fuori dai campi', () => {
    const i = by(run().issues, 'a1');
    expect(i.fields).toEqual({ Versione: '3.2.0' });   // la card di prova non ha id Trello veri, quindi niente data
    expect(i.reporter).toBe('Mario123');
    expect(JSON.stringify(i.fields)).not.toContain('Mario123');
    expect(by(run().issues, 'b2').reporter).toBeNull();
  });

  it('una voce di checklist nasce quando è stata aggiunta, non quando è nato l\'elenco', () => {
    const itemId = (Date.UTC(2026, 8, 30, 10) / 1000).toString(16) + 'aaaaaaaaaaaaaaaa';
    const cardId = (Date.UTC(2025, 10, 26, 10) / 1000).toString(16) + 'bbbbbbbbbbbbbbbb';
    const mini = {
      lists: [{ id: 'L', name: 'NEW' }], labels: [], actions: [],
      cards: [{ id: cardId, idList: 'L', pos: 1, name: 'Skin', desc: '', idLabels: [] }],
      checklists: [{ id: 'k', idCard: cardId, name: 'Skin', checkItems: [{ id: itemId, name: 'Barone Esphura', state: 'incomplete', pos: 1 }] }],
    };
    const [i] = buildAll(mini).issues;
    expect(i.fields).toEqual({ 'Creata su Trello': '2026-09-30' });
  });

  it('checklist, commenti e allegati arrivano nel corpo; menzioni neutralizzate; i nomi dei commentatori no, di default', () => {
    const i = by(run().issues, 'b2');
    expect(i.labels).toContain('skin');
    expect(i.body).toContain('- [x] Disegno');
    expect(i.body).toContain('- [ ] Frame click');
    expect(i.body).toContain('Occhio ai loghi');
    expect(i.body).toContain('`@paolo`');
    expect(i.body).toContain('`@gianni`');
    expect(i.body).not.toMatch(/(^|[^`\w])@(paolo|gianni)/);
    expect(i.body).not.toContain('Gabriel Sartori');
    expect(i.body).toContain('[bozzetto.png](https://trello.com/1/x.png)');
    expect(i.warnings.join(' ')).toContain('allegat');
  });

  it('--authors scrive i nomi dei commentatori', () => {
    expect(by(run({ authors: true }).issues, 'b2').body).toContain('Gabriel Sartori');
  });

  it('«Da valutare» senza indizi resta senza tipo e lo dice; «Fatto» si importa chiusa come completata', () => {
    const c = by(run().issues, 'c3');
    expect(c.labels.filter((l) => TYPE_LABELS.includes(l))).toEqual([]);
    expect(c.warnings.join(' ')).toContain('nessun tipo');
    expect(c.status).toBe('Da valutare');
    expect(by(run().issues, 'd4')).toMatchObject({ state: 'closed', stateReason: 'completed', status: 'Fatto', labels: ['miglioria'] });
  });

  it('card vecchia in lista archiviata: aperta, tipo dedotto dal titolo, con l\'avviso di verificarla', () => {
    const e = by(run().issues, 'e5');
    expect(e).toMatchObject({ state: 'open', status: 'Da valutare', labels: ['bug'] });
    expect(e.warnings.join(' ')).toContain('dedotto');
    expect(e.warnings.join(' ')).toContain('lista vecchia');
    expect(e.body).toContain('lista vecchia di Trello');
  });

  it('lista e prefisso in conflitto: vince la lista e si avvisa', () => {
    const g = by(run().issues, 'g7');
    expect(g.labels).toContain('skin');
    expect(g.labels).not.toContain('bug');
    expect(g.warnings.join(' ')).toContain('non coincidono');
  });

  it('il titolo vince sulla lista: «NUOVO: Skin di Natale» sta in NEW ma è una skin; il roadmap la mette in v3.4', () => {
    const n = by(run().issues, 'l12');
    expect(n.labels).toContain('skin');
    expect(n).toMatchObject({ milestone: 'v3.4', status: 'Pianificato' });
    expect(n.warnings.join(' ')).toContain('dal titolo');
  });

  it('un\'emoji davanti al titolo sparisce', () => {
    expect(by(run().issues, 'k11').title).toBe('Classifica Arcade');
  });

  it('una card contenitore (Skin) diventa una issue per voce, col suo commento; una voce spuntata resta aperta, con l\'avviso', () => {
    const { issues } = run();
    const barone = by(issues, 'i9-it1');
    expect(barone.title).toBe('Skin: Barone Esphura');
    expect(barone.labels).toEqual(['skin']);
    expect(barone.state).toBe('open');
    expect(barone.body).toContain('Antagonista di Mazinga');
    expect(barone.body).not.toContain('Davide Canale');
    // la spunta di Trello non vuol dire «fatto»: la voce spuntata nasce comunque aperta, a Da valutare
    const josespo = by(issues, 'i9-it2');
    expect(josespo).toMatchObject({ state: 'open', stateReason: null, status: 'Da valutare' });
    expect(josespo.body).toContain('non vuol dire che sia fatta');
    expect(josespo.warnings.join(' ')).toContain('nessun commento');
    expect(josespo.warnings.join(' ')).toContain('spuntata su Trello');
    expect(issues.filter((i) => i.cardId.startsWith('i9-')).every((i) => i.state === 'open')).toBe(true);
    // ogni voce ha un marcatore suo, così un secondo import non duplica
    expect(barone.body).toContain(marker('i9-it1'));
    expect(josespo.body).toContain(marker('i9-it2'));
  });

  it('ogni issue porta il marcatore che rende l\'import rilanciabile, e i marcatori sono unici', () => {
    const issues = run().issues;
    for (const i of issues) expect(i.body).toContain(marker(i.cardId));
    expect(new Set(issues.map((i) => i.cardId)).size).toBe(issues.length);
  });

  it('buildIssues è la sola lista delle issue', () => {
    expect(buildIssues(board)).toEqual(run().issues);
  });

  it('anteprima e riepilogo: virgolette nel CSV, saltate con il motivo, conteggi per tipo e per motivo', () => {
    const { issues, skipped } = run();
    const csv = toCsv([{ listName: 'L', title: 'Ciao, "mondo"', labels: ['bug'], milestone: null, state: 'open', status: 'Da valutare', warnings: [] }], skipped);
    expect(csv.split('\n')[1]).toContain('"Ciao, ""mondo"""');
    expect(csv).toContain('segnaposto vuoto');
    expect(csv).not.toContain('archiviata');      // la storia è solo un conteggio
    expect(summarize(issues)).toEqual({ bug: 2, skin: 5, miglioria: 1, 'nuova-funzione': 1, '(senza tipo)': 1 });
    expect(summarizeSkipped(skipped)).toMatchObject({ archiviata: 1, 'note di rilascio': 1, 'segnaposto vuoto': 1 });
  });
});

describe('coerenza fra i due script', () => {
  const nomiEtichette = LABELS.map((l) => l.name);

  it('ogni tipo e ogni etichetta che l\'import può mettere è creata dal setup', () => {
    for (const t of TYPE_LABELS) expect(nomiEtichette, t).toContain(t);
    for (const l of ['segnalazione', 'diritti']) expect(nomiEtichette, l).toContain(l);
  });

  it('i filtri delle viste usano solo etichette e stati che esistono', () => {
    const stati = STATUS_OPTIONS.map((s) => s.name);
    for (const v of VIEWS) {
      for (const m of v.filter.matchAll(/label:([\w-]+)/g)) expect(nomiEtichette, `${v.name}: label:${m[1]}`).toContain(m[1]);
      for (const m of v.filter.matchAll(/status:"?([^"\s]+(?: [^"\s]+)*)"?/g)) {
        expect(stati, `${v.name}: status ${m[1]}`).toContain(m[1].replace(/^-/, ''));
      }
    }
  });

  it('gli stati che l\'import può assegnare esistono, e le sei sezioni hanno ciascuna la sua vista', () => {
    const stati = STATUS_OPTIONS.map((s) => s.name);
    for (const s of ['Da valutare', 'Pianificato', 'In corso', 'Fatto', 'Scartato']) expect(stati).toContain(s);
    for (const t of TYPE_LABELS) expect(VIEWS.some((v) => v.filter.includes(`label:${t} `)), `vista per ${t}`).toBe(true);
  });

  it('le milestone sono quelle del roadmap e le date, dove ci sono, sono ISO', () => {
    expect(MILESTONES.map((m) => m.title)).toEqual(['v3.3', 'v3.4', 'v3.5', 'v4.0']);
    for (const m of MILESTONES.filter((x) => x.due)) expect(Number.isNaN(Date.parse(m.due))).toBe(false);
  });
});
