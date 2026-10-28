// Prove delle parti pure di trello-to-github.mjs e github-backlog-setup.mjs: niente rete, niente gh.
import { classifyList, parseTitle, stripContext, labelToMilestone, buildIssues, toCsv, summarize, marker, TYPE_LABELS } from './trello-to-github.mjs';
import { LABELS, MILESTONES, STATUS_OPTIONS, VIEWS } from './github-backlog-setup.mjs';

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
  it('senza prefisso lascia il titolo e non inventa un tipo', () => {
    expect(parseTitle('Espostino con loghi finti')).toEqual({ title: 'Espostino con loghi finti', type: null });
  });
  it('titolo vuoto e titolo lunghissimo', () => {
    expect(parseTitle('').title).toBe('(senza titolo)');
    expect(parseTitle('x'.repeat(400)).title).toHaveLength(250);
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
  it('una card scritta a mano passa intatta', () => {
    expect(stripContext('Idea: un tema primavera')).toEqual({ body: 'Idea: un tema primavera', fromGame: false });
  });
});

describe('labelToMilestone', () => {
  it('versioni → milestone vX.Y', () => {
    expect(labelToMilestone(['3.2'])).toBe('v3.2');
    expect(labelToMilestone(['Altro', 'v3.1.7'])).toBe('v3.1');
    expect(labelToMilestone(['Altro', 'test'])).toBeNull();
  });
});

describe('buildIssues', () => {
  const board = {
    name: 'Espòòò Clicker',
    lists: [
      { id: 'L1', name: 'BUG' }, { id: 'L2', name: 'Skin proposte' }, { id: 'L3', name: 'Da valutare' },
      { id: 'L4', name: 'Fatto' }, { id: 'L5', name: 'Vecchie', closed: true },
    ],
    labels: [{ id: 'T', name: 'TEST' }, { id: 'V', name: '3.2' }, { id: 'X', name: 'urgente' }],
    cards: [
      { id: 'a1', idList: 'L1', pos: 1, name: 'BUG: Fury coperto', idLabels: ['T', 'V', 'X'], shortUrl: 'https://trello.com/c/a1',
        desc: 'Si vede male.\n\n---\n**Contesto tecnico** (allegato automaticamente)\n- 👤 Utente: `Mario123`\n- 🎮 Versione: `3.2.0`\n' },
      { id: 'b2', idList: 'L2', pos: 1, name: 'Espostino', desc: 'Postino con divisa.', idLabels: [],
        attachments: [{ name: 'bozzetto.png', url: 'https://trello.com/1/x.png' }] },
      { id: 'c3', idList: 'L3', pos: 1, name: 'Qualcosa da decidere', desc: '', idLabels: [] },
      { id: 'd4', idList: 'L4', pos: 1, name: 'MIGLIORIA: già uscita', desc: '', idLabels: [], dateLastActivity: '2026-09-01T10:00:00Z' },
      { id: 'e5', idList: 'L5', pos: 1, name: 'Archiviata', desc: 'vecchia', idLabels: [] },
      { id: 'f6', idList: 'L1', pos: 2, closed: true, name: 'BUG: già chiusa', desc: '', idLabels: [] },
      { id: 'g7', idList: 'L2', pos: 2, name: 'BUG: nella lista sbagliata', desc: '', idLabels: [] },
    ],
    checklists: [{ id: 'k', idCard: 'b2', name: 'Da fare', checkItems: [{ name: 'Disegno', state: 'complete', pos: 1 }, { name: 'Frame click', state: 'incomplete', pos: 2 }] }],
    actions: [{ type: 'commentCard', date: '2026-08-02T09:00:00Z', data: { card: { id: 'b2' }, text: 'Occhio ai loghi.' }, memberCreator: { fullName: 'Gabriel Sartori' } }],
  };
  const by = (issues, id) => issues.find((i) => i.cardId === id);

  it('salta le card archiviate per default, le importa chiuse con --include-archived', () => {
    const base = buildIssues(board);
    expect(base.map((i) => i.cardId).sort()).toEqual(['a1', 'b2', 'c3', 'd4', 'g7']);
    const all = buildIssues(board, { includeArchived: true });
    expect(by(all, 'e5')).toMatchObject({ state: 'closed', stateReason: 'not_planned', status: 'Scartato' });
    expect(by(all, 'f6')).toMatchObject({ state: 'closed' });
  });

  it('segnalazione dal gioco: tipo dalla lista, segnalazione + test, milestone dalla versione, niente nome utente', () => {
    const i = by(buildIssues(board), 'a1');
    expect(i.title).toBe('Fury coperto');
    expect(i.labels).toEqual(expect.arrayContaining(['bug', 'segnalazione', 'test']));
    expect(i.milestone).toBe('v3.2');
    expect(i.body).not.toContain('Mario123');
    expect(i.body).toContain('Versione: `3.2.0`');
    expect(i.body).toContain('Etichette Trello: urgente');
    expect(i.body).toContain('https://trello.com/c/a1');
    expect(i.body).toContain(marker('a1'));
  });

  it('checklist, commenti e allegati arrivano nel corpo; gli allegati generano un avviso', () => {
    const i = by(buildIssues(board), 'b2');
    expect(i.labels).toContain('skin');
    expect(i.body).toContain('- [x] Disegno');
    expect(i.body).toContain('- [ ] Frame click');
    expect(i.body).toContain('Occhio ai loghi.');
    expect(i.body).toContain('Gabriel Sartori');
    expect(i.body).toContain('[bozzetto.png](https://trello.com/1/x.png)');
    expect(i.warnings.join(' ')).toContain('allegat');
  });

  it('--no-authors toglie i nomi dei commenti', () => {
    expect(by(buildIssues(board, { authors: false }), 'b2').body).not.toContain('Gabriel Sartori');
  });

  it('«Da valutare» senza prefisso resta senza tipo e lo dice; «Fatto» si importa chiusa come completata', () => {
    const c = by(buildIssues(board), 'c3');
    expect(c.labels.filter((l) => TYPE_LABELS.includes(l))).toEqual([]);
    expect(c.warnings.join(' ')).toContain('nessun tipo');
    expect(c.status).toBe('Da valutare');
    expect(by(buildIssues(board), 'd4')).toMatchObject({ state: 'closed', stateReason: 'completed', status: 'Fatto', labels: ['miglioria'] });
  });

  it('lista e prefisso in conflitto: vince la lista e si avvisa', () => {
    const g = by(buildIssues(board), 'g7');
    expect(g.labels).toContain('skin');
    expect(g.labels).not.toContain('bug');
    expect(g.warnings.join(' ')).toContain('non coincidono');
  });

  it('ogni issue porta il marcatore che rende l\'import rilanciabile', () => {
    for (const i of buildIssues(board)) expect(i.body).toContain(marker(i.cardId));
  });

  it('il CSV di anteprima mette tra virgolette i titoli con virgole e virgolette', () => {
    const csv = toCsv([{ listName: 'L', title: 'Ciao, "mondo"', labels: ['bug'], milestone: null, state: 'open', status: 'Da valutare', warnings: [] }]);
    expect(csv.split('\n')[1]).toContain('"Ciao, ""mondo"""');
    expect(summarize(buildIssues(board))).toMatchObject({ bug: 1, skin: 2, miglioria: 1 });
  });
});

describe('coerenza fra i due script', () => {
  const nomiEtichette = LABELS.map((l) => l.name);

  it('ogni tipo e ogni etichetta che l\'import può mettere è creata dal setup', () => {
    for (const t of TYPE_LABELS) expect(nomiEtichette, t).toContain(t);
    for (const l of ['segnalazione', 'test', 'diritti']) expect(nomiEtichette, l).toContain(l);
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

  it('gli stati che l\'import assegna esistono, e le sei sezioni hanno ciascuna la sua vista', () => {
    const stati = STATUS_OPTIONS.map((s) => s.name);
    for (const s of ['Da valutare', 'Fatto', 'Scartato']) expect(stati).toContain(s);
    for (const t of TYPE_LABELS) expect(VIEWS.some((v) => v.filter.includes(`label:${t} `)), `vista per ${t}`).toBe(true);
  });

  it('le milestone sono quelle del roadmap e le date, dove ci sono, sono ISO', () => {
    expect(MILESTONES.map((m) => m.title)).toEqual(['v3.3', 'v3.4', 'v3.5', 'v4.0']);
    for (const m of MILESTONES.filter((x) => x.due)) expect(Number.isNaN(Date.parse(m.due))).toBe(false);
  });
});
