#!/usr/bin/env node
// ============================================================
// Trello → GitHub Issues
// ------------------------------------------------------------
// Uso:
//   node scripts/trello-to-github.mjs <export.json>                 anteprima (non crea nulla)
//   node scripts/trello-to-github.mjs <export.json> --apply          crea le issue
//
// Opzioni:
//   --repo owner/nome       default: il repo della cartella corrente (gh repo view)
//   --project <numero>      aggiunge ogni issue al Project dell'utente e ne imposta lo Stato
//   --include-archived      importa anche le card archiviate (come issue chiuse)
//   --authors               scrive nei commenti il nome di chi li ha firmati (di default NO: il repo è pubblico)
//   --out <cartella>        dove scrivere anteprima e mappa (default: trello-export/, ignorata da git)
//
// L'export è il JSON della board: Menu → Stampa, esporta e condividi → Esporta in JSON.
// Contiene i nomi utente dei giocatori e i nomi dei collaboratori: tienilo fuori dal repo.
//
// Cosa porta e cosa no (la ragione di ogni scelta sta accanto al codice):
//   - le card APERTE, qualunque sia la loro lista (anche quelle rimaste in liste archiviate);
//   - il tipo si decide da titolo, lista e prefisso (NUOVO:/BUG:/MIGLIORIA:), in quest'ordine;
//   - NON porta: card archiviate (la storia), note di rilascio, segnaposto vuoti, card già fatte
//     (ALREADY_DONE) — tutte elencate nell'anteprima con il motivo, così niente sparisce in silenzio;
//   - il nome utente del giocatore nelle segnalazioni dal gioco viene tolto.
//
// Sicuro da rilanciare: ogni issue porta nel corpo un marcatore <!-- trello:ID --> e le card
// già importate vengono saltate. Non usa nessuna chiave: passa da `gh`, già autenticato.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MILESTONES } from './github-backlog-setup.mjs';

// ── Mappe ────────────────────────────────────────────────────

/** Etichette GitHub per tipo (vedi scripts/github-backlog-setup.mjs: devono esistere). */
export const TYPE_LABELS = ['skin', 'tema', 'musica', 'nuova-funzione', 'miglioria', 'bug'];

/**
 * Card già fatte, verificate nel codice il 28/10/2026 e quindi NON importate:
 *  - «Refactoring Edifici → Teams» e «Promozione Pronta: Edifici»: nelle stringhe (langs, data, includes) non resta nessun «edific…»;
 *  - potenziamenti dei team nuovi: 55 potenziamenti = 5 per ciascuno degli 11 team;
 *  - «Crunch time → Espo Fury»: il frame dell'Espo Fury c'è (logic.ts, espo-fury-click.webp);
 *  - «Full Stack»: la condizione scorre tutti i team dello stato, quindi include i nuovi.
 */
export const ALREADY_DONE = [
  { match: /refactoring nomenclatura/i, why: 'già fatta: nessun «Edifici» nelle stringhe' },
  { match: /promozione pronta: sostituire/i, why: 'già fatta: nessun «Edifici» nelle stringhe' },
  { match: /aggiungere potenziamenti a quantum server/i, why: 'già fatta: 5 potenziamenti per ciascuno degli 11 team' },
  { match: /crunch time\s*(->|→)\s*espo fury/i, why: 'già fatta: c\'è il frame Espo Fury' },
  { match: /obiettivo\s+["“]?full stack/i, why: 'già fatta: la condizione scorre tutti i team' },
];

/** Regole di pianificazione: dove il roadmap ha già deciso, la card nasce già collocata. */
export const RULES = [
  // roadmap v3.4: «2-3 skin natalizie nuove + evento a tempo»
  { match: /natale|christmas/i, milestone: 'v3.4', status: 'Pianificato' },
];

/** Nome della lista Trello → tipo/stato/azione. Le liste dell'endpoint «Segnala» sono NEW, BUG, IMPROVED. */
export function classifyList(listName) {
  const n = String(listName || '').trim().toLowerCase();
  if (/release notes/.test(n)) return { type: null, skip: 'note di rilascio' };
  if (/(^|\b)(fatt[oa]|done|completat[oae]|rilasciat[oae]|released)(\b|$)/.test(n)) return { type: null, done: true };
  if (/da valutare|valutare|inbox|idee|to be defin|\btbd\b/.test(n)) return { type: null, valutare: true };
  if (/^release\b/.test(n)) return { type: null, legacy: true };
  if (/to ?do|da fare/.test(n)) return { type: null, status: 'Pianificato' };
  if (/in development|in sviluppo|in esecuzione/.test(n)) return { type: null, status: 'In corso' };
  if (/skin/.test(n)) return { type: 'skin' };
  if (/music|\bost\b|colonna/.test(n)) return { type: 'musica' };
  if (/\btem[ai]\b/.test(n)) return { type: 'tema' };
  if (/problem|\bbug\b|error/.test(n)) return { type: 'bug' };
  if (/miglior|improv/.test(n)) return { type: 'miglioria' };
  if (/nuov|\bnew\b|aggiunt/.test(n)) return { type: 'nuova-funzione' };
  return { type: null };
}

const PREFIXES = [
  [/^\s*NUOVO:\s*/i, 'nuova-funzione'],
  [/^\s*BUG:\s*/i, 'bug'],
  [/^\s*MIGLIORIA:\s*/i, 'miglioria'],
];

/** Toglie l'emoji iniziale (💡 Classifica Arcade) e il prefisso messo dall'endpoint «Segnala». */
export function parseTitle(name) {
  let title = String(name || '').trim().replace(/^[\p{Extended_Pictographic}️\s]+/u, '');
  let type = null;
  for (const [re, t] of PREFIXES) {
    if (re.test(title)) { type = t; title = title.replace(re, ''); break; }
  }
  if (!title) title = '(senza titolo)';
  return { title: title.slice(0, 250), type };
}

/**
 * Il titolo dice spesso più della lista: «NUOVO: Skin di Natale…» sta in NEW ma è una skin.
 * `strong` = tipi sicuri (prima parola); `weak` = indizi sul verbo, usati solo quando lista e prefisso non dicono nulla.
 */
export function inferType(title) {
  const t = String(title || '').trim();
  let strong = null;
  if (/^skin\b/i.test(t)) strong = 'skin';
  else if (/^(tem[ai]|theme)\b/i.test(t)) strong = 'tema';
  else if (/^(ost|musica|brano|colonna sonora)\b/i.test(t)) strong = 'musica';
  let weak = null;
  // niente \b dopo «è»: in JS la è accentata non conta come lettera e il confine non scatterebbe mai
  if (/(\bnon (è|si|sono|viene|funziona|funzionante|aggiorna|salva|visibil[ei]|cliccabile)(?=\W|$)|\b(problem[ai]|errore|bug)\b)/i.test(t)) weak = 'bug';
  else if (/^(aggiungere|rendere|rifare|rimuovere|suddividere|refactoring|ridurre|sostituire|limitare|impostare)\b/i.test(t)) weak = 'miglioria';
  return { strong, weak };
}

const CONTEXT_HEADER = /\*\*Contesto tecnico\*\* \(allegato automaticamente\)/;

/**
 * Le segnalazioni dal gioco portano il nome utente del giocatore. Su un repo pubblico non va:
 * si toglie la riga, il resto del contesto (versione, lingua, schermo, URL) resta.
 */
export function stripContext(desc) {
  const text = String(desc || '');
  const fromGame = CONTEXT_HEADER.test(text);
  const body = text
    .split(/\r?\n/)
    .filter((l) => !/^\s*-\s*👤\s*Utente:/.test(l))
    .join('\n')
    .replace(/(\n\s*---\s*)?\n\*\*Contesto tecnico\*\* \(allegato automaticamente\)\s*$/, '')   // blocco rimasto senza righe
    .trim();
  return { body, fromGame };
}

/** Un'etichetta Trello che sembra una versione (3.1, v3.2.0) diventa la milestone vX.Y, se esiste. */
export function labelToMilestone(labelNames, known) {
  for (const l of labelNames || []) {
    const m = /^v?(\d+\.\d+)(?:\.\d+)?$/i.exec(String(l).trim());
    if (m && (!known || known.has(`v${m[1]}`))) return `v${m[1]}`;
  }
  return null;
}

export const marker = (cardId) => `<!-- trello:${cardId} -->`;
const day = (iso) => (iso ? String(iso).slice(0, 10) : '');
const KNOWN_MILESTONES = new Set(MILESTONES.map((m) => m.title));

/**
 * Su GitHub un `@nome` nel testo avvisa chi ha quel nome utente, e i nomi di Trello non sono quelli di GitHub:
 * finirebbero a sconosciuti. Dentro il codice inline restano leggibili e non avvisano nessuno. Lo stesso per «#12».
 */
export function safeText(text) {
  return String(text || '')
    .replace(/(^|[^\w`])@([A-Za-z0-9_-]+)/g, '$1`@$2`')
    .replace(/(^|[\s(])#(\d+)\b/g, '$1`#$2`');
}

// ── Card «contenitore»: una checklist di idee, non un'idea ──────

/** «Skin», «OST», «Arcade»: su Trello erano elenchi, su GitHub ogni voce è una issue. */
export const UMBRELLA = [
  { match: /^skin$/i, type: 'skin', prefix: 'Skin: ' },
  { match: /^(ost|musica)$/i, type: 'musica', prefix: 'Musica: ' },
  { match: /^arcade$/i, type: 'nuova-funzione', prefix: 'Gioco arcade: ' },
  { match: /^tem[ai]$/i, type: 'tema', prefix: 'Tema: ' },
];

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const baseName = (name) => norm(String(name).replace(/\s*\(.*$/, '').replace(/[:\s]+$/, ''));

/**
 * Assegna i commenti della card alle voci della checklist: un commento va alla voce il cui nome compare nella sua
 * prima riga («Barone Esphura: …», «Espobeat x Initial E: …»); uno senza nome è la risposta al precedente e lo segue.
 * @returns { byItem: Map<itemId, comment[]>, orphans: comment[] }
 */
export function assignComments(items, comments) {
  const byItem = new Map(items.map((i) => [i.id, []]));
  const orphans = [];
  let current = null;
  for (const a of comments) {
    const head = norm(String(a.data.text || '').split(/[:\n]/)[0]);
    const hits = items.filter((i) => baseName(i.name) && head.includes(baseName(i.name)));
    if (hits.length) current = hits.sort((x, y) => baseName(y.name).length - baseName(x.name).length)[0];
    if (current) byItem.get(current.id).push(a); else orphans.push(a);
  }
  return { byItem, orphans };
}

// ── Costruzione delle issue ─────────────────────────────────

/**
 * @param board  il JSON dell'export
 * @param opts   { includeArchived, authors, milestones }
 * @returns { issues: Array<{cardId,title,body,labels,milestone,state,stateReason,status,listName,warnings}>,
 *            skipped: Array<{cardId,title,listName,why}> }
 */
export function buildAll(board, opts = {}) {
  const known = opts.milestones || KNOWN_MILESTONES;
  const lists = new Map((board.lists || []).map((l) => [l.id, l]));
  const labelsById = new Map((board.labels || []).map((l) => [l.id, l]));
  const checklists = new Map();
  for (const c of board.checklists || []) {
    if (!checklists.has(c.idCard)) checklists.set(c.idCard, []);
    checklists.get(c.idCard).push(c);
  }
  const comments = new Map();
  for (const a of board.actions || []) {
    if (a.type !== 'commentCard' || !a.data || !a.data.card) continue;
    const id = a.data.card.id;
    if (!comments.has(id)) comments.set(id, []);
    comments.get(id).push(a);
  }

  const cards = [...(board.cards || [])].sort((a, b) =>
    String(lists.get(a.idList)?.name).localeCompare(String(lists.get(b.idList)?.name)) || (a.pos - b.pos));

  const issues = [];
  const skipped = [];
  for (const card of cards) {
    const list = lists.get(card.idList) || { name: '(lista sconosciuta)' };
    const cls = classifyList(list.name);
    const { title, type: prefixType } = parseTitle(card.name);
    const skip = (why) => skipped.push({ cardId: card.id, title, listName: list.name, why });

    // l'archiviazione è della CARD: una card aperta in una lista archiviata è lavoro dimenticato, non storia
    const archived = !!card.closed;
    if (archived && !opts.includeArchived) { skip('archiviata'); continue; }
    if (cls.skip) { skip(cls.skip); continue; }
    if (/^release notes?\b/i.test(title)) { skip('note di rilascio'); continue; }

    const { body: desc, fromGame } = stripContext(card.desc);
    const atts = card.attachments || [];
    const cm = (comments.get(card.id) || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const cl = (checklists.get(card.id) || []).filter((c) => (c.checkItems || []).length);
    if (!desc && !atts.length && !cm.length && !cl.length && /^(skin|ost|arcade|musica|tem[ai]|idee)$/i.test(title)) { skip('segnaposto vuoto'); continue; }
    const done = ALREADY_DONE.find((r) => r.match.test(title));
    if (done && !archived) { skip(done.why); continue; }

    // card contenitore (Skin / OST / Arcade): una issue per voce, col suo commento
    const umbrella = UMBRELLA.find((u) => u.match.test(title));
    if (umbrella && cl.length && !archived) {
      const items = cl.flatMap((c) => c.checkItems || []).sort((a, b) => a.pos - b.pos);
      const { byItem, orphans } = assignComments(items, cm);
      const link = card.shortUrl || card.url;
      const dc = card.dateLastActivity ? `, ultima attività ${day(card.dateLastActivity)}` : '';
      for (const it of items) {
        const name = String(it.name).trim().replace(/[:\s]+$/, '');
        const mine = byItem.get(it.id) || [];
        const parts = [];
        if (mine.length) {
          parts.push(mine.map((a) => {
            const who = opts.authors === true && a.memberCreator ? ` — ${a.memberCreator.fullName || a.memberCreator.username}` : '';
            return `> ${safeText(String(a.data.text || '').trim()).replace(/\n/g, '\n> ')}\n> _${day(a.date)}${who}_`;
          }).join('\n\n'));
        }
        parts.push(`---\n_Dall'elenco «${title}» di Trello (lista «${list.name}»${dc})_` + (link ? `\n_${link}_` : '') + (it.state === 'complete' ? '\n_Spuntata su Trello: non vuol dire che sia fatta, verificare._' : ''));
        parts.push(marker(`${card.id}-${it.id}`));
        // La spunta di una checklist di Trello NON è «fatto»: «Musica: Josespo Joestar» era spuntata e non lo era,
        // «Musica: Halloween» non era spuntata ed era già uscita nella 3.2. Le voci nascono sempre aperte, a Da valutare.
        const ticked = it.state === 'complete';
        issues.push({
          cardId: `${card.id}-${it.id}`,
          title: (umbrella.prefix + safeText(name)).slice(0, 250),
          body: parts.join('\n\n'),
          labels: [umbrella.type],
          milestone: null,
          state: 'open',
          stateReason: null,
          status: 'Da valutare',
          listName: `${list.name} › ${title}`,
          warnings: [...(mine.length ? [] : ['solo il nome: nessun commento su Trello']), ...(ticked ? ['spuntata su Trello: verificare se è davvero fatta'] : [])],
        });
      }
      for (const a of orphans) skipped.push({ cardId: card.id, title: `commento su «${title}»`, listName: list.name, why: 'commento senza voce: ' + String(a.data.text || '').slice(0, 60).replace(/\s+/g, ' ') });
      continue;
    }

    const warnings = [];
    const trelloLabels = (card.idLabels || []).map((id) => labelsById.get(id)?.name).filter(Boolean);

    // tipo: titolo (sicuro) > lista > prefisso > indizi sul verbo, solo se il resto tace
    const { strong, weak } = inferType(title);
    const listOrPrefix = cls.type || prefixType;
    let type = strong || listOrPrefix;
    if (!type && weak) { type = weak; warnings.push(`tipo «${weak}» dedotto dal titolo: controllalo`); }
    if (strong && listOrPrefix && strong !== listOrPrefix) warnings.push(`tipo «${strong}» dal titolo (la lista dice «${listOrPrefix}»)`);
    if (!strong && cls.type && prefixType && cls.type !== prefixType) warnings.push(`lista «${list.name}» e prefisso del titolo non coincidono (${cls.type} / ${prefixType}): vince la lista`);

    const labels = new Set();
    if (type) labels.add(type); else warnings.push('nessun tipo: assegnalo in triage');
    if (fromGame) labels.add('segnalazione');
    if (/diritti|licenz|copyright/i.test(trelloLabels.join(' '))) labels.add('diritti');

    const rule = RULES.find((r) => r.match.test(title));
    const labelMilestone = labelToMilestone(trelloLabels, known);
    const milestone = (rule && rule.milestone) || labelMilestone;
    // «TEST» su Trello era l'etichetta delle card create dall'area di test: spesso sono idee vere
    // (le skin di Natale lo sono), quindi NON diventa l'etichetta `test` di GitHub, solo una nota.
    const fromTest = trelloLabels.some((n) => /^test$/i.test(n));
    // un'etichetta di versione che è diventata la milestone non si ripete come nota; le altre (v3.0, IDEE, TBD…) sì
    const restLabels = trelloLabels.filter((n) => !/^test$/i.test(n) && !(milestone && labelToMilestone([n], known) === milestone));

    // corpo
    const parts = [];
    if (desc) parts.push(safeText(desc));

    for (const c of cl) {
      const items = (c.checkItems || []).slice().sort((a, b) => a.pos - b.pos);
      parts.push(`### ${c.name || 'Checklist'}\n` + items.map((i) => `- [${i.state === 'complete' ? 'x' : ' '}] ${safeText(i.name)}`).join('\n'));
    }

    if (cm.length) {
      parts.push('### Commenti da Trello\n' + cm.map((a) => {
        const who = opts.authors === true && a.memberCreator ? ` — ${a.memberCreator.fullName || a.memberCreator.username}` : '';
        const text = safeText(String(a.data.text || '').trim()).replace(/\n/g, '\n> ');
        return `> ${text}\n> _${day(a.date)}${who}_`;
      }).join('\n\n'));
    }

    if (atts.length) {
      parts.push('### Allegati\n' + atts.map((a) => `- [${a.name || a.url}](${a.url})`).join('\n'));
      warnings.push(`${atts.length} allegat${atts.length === 1 ? 'o' : 'i'}: i file di Trello si aprono solo con l'accesso alla board`);
    }

    const dc = card.dateLastActivity ? `, ultima attività ${day(card.dateLastActivity)}` : '';
    const link = card.shortUrl || card.url;
    let footer = `_Importata da Trello — lista «${list.name}»${dc}_` + (link ? `\n_${link}_` : '');
    if (cls.legacy) { footer += '\n_Era in una lista vecchia di Trello: verificare se è ancora valida._'; warnings.push('lista vecchia: verificare se è ancora valida'); }
    if (fromTest) footer += '\n_Creata dall\'area di test._';
    if (restLabels.length) footer += `\n_Etichette Trello: ${restLabels.join(', ')}_`;
    if (card.due) footer += `\n_Scadenza su Trello: ${day(card.due)}_`;
    parts.push('---\n' + footer);
    parts.push(marker(card.id));

    let bodyText = parts.join('\n\n');
    if (bodyText.length > 60000) { bodyText = bodyText.slice(0, 60000) + '\n\n_…testo troncato per il limite di GitHub_\n' + marker(card.id); warnings.push('testo troncato'); }

    const state = archived || cls.done ? 'closed' : 'open';
    issues.push({
      cardId: card.id,
      title: safeText(title),
      body: bodyText,
      labels: [...labels],
      milestone,
      state,
      stateReason: state === 'closed' ? (cls.done ? 'completed' : 'not_planned') : null,
      status: cls.done ? 'Fatto' : (archived ? 'Scartato' : ((rule && rule.status) || cls.status || 'Da valutare')),
      listName: list.name,
      warnings,
    });
  }
  return { issues, skipped };
}

export const buildIssues = (board, opts) => buildAll(board, opts).issues;

// ── CSV di anteprima ────────────────────────────────────────

export function toCsv(issues, skipped = []) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const head = ['lista', 'titolo', 'etichette', 'milestone', 'stato', 'stato project', 'avvisi'];
  const rows = issues.map((i) => [i.listName, i.title, i.labels.join(' '), i.milestone || '', i.state, i.status, i.warnings.join(' | ')].map(esc).join(','));
  // le archiviate sono la storia (155 righe di rumore): solo il conteggio, in console
  const skips = skipped.filter((s) => s.why !== 'archiviata').map((s) => [s.listName, s.title, '', '', 'saltata', '', s.why].map(esc).join(','));
  return [head.join(','), ...rows, ...skips].join('\n');
}

export function summarize(issues) {
  const byType = {};
  for (const i of issues) {
    const t = i.labels.find((l) => TYPE_LABELS.includes(l)) || '(senza tipo)';
    byType[t] = (byType[t] || 0) + 1;
  }
  return byType;
}

export function summarizeSkipped(skipped) {
  const by = {};
  for (const s of skipped) by[s.why] = (by[s.why] || 0) + 1;
  return by;
}

// ── gh ──────────────────────────────────────────────────────

const gh = (args, input) => execFileSync('gh', args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
const ghJson = (args, input) => JSON.parse(gh(args, input));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function gql(query, variables) {
  const res = ghJson(['api', 'graphql', '--input', '-'], JSON.stringify({ query, variables }));
  if (res.errors) throw new Error(JSON.stringify(res.errors));
  return res.data;
}

async function createIssue(repo, issue, milestones) {
  const payload = { title: issue.title, body: issue.body, labels: issue.labels };
  if (issue.milestone && milestones.has(issue.milestone)) payload.milestone = milestones.get(issue.milestone);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = ghJson(['api', `repos/${repo}/issues`, '-X', 'POST', '--input', '-'], JSON.stringify(payload));
      if (issue.state === 'closed') {
        gh(['api', `repos/${repo}/issues/${res.number}`, '-X', 'PATCH', '--input', '-'], JSON.stringify({ state: 'closed', state_reason: issue.stateReason }));
      }
      return res;
    } catch (e) {
      const msg = String(e.stderr || e.message || e);
      if (/rate limit|abuse|secondary|429|403/i.test(msg) && attempt < 4) {
        console.log(`  limite di GitHub raggiunto, aspetto 60 s (tentativo ${attempt}/3)…`);
        await sleep(60_000);
        continue;
      }
      throw e;
    }
  }
}

function existingMarkers(repo) {
  const found = new Map();
  const items = ghJson(['api', `repos/${repo}/issues?state=all&per_page=100`, '--paginate', '--slurp']);
  for (const page of items) for (const it of page) {
    const m = /<!-- trello:([0-9a-zA-Z-]+) -->/.exec(it.body || '');
    if (m) found.set(m[1], it.number);
  }
  return found;
}

function projectContext(number) {
  const d = gql(`query($n:Int!){viewer{projectV2(number:$n){id title fields(first:30){nodes{... on ProjectV2SingleSelectField{id name options{id name}}}}}}}`, { n: number });
  const p = d.viewer.projectV2;
  if (!p) throw new Error(`Project ${number} non trovato`);
  const status = p.fields.nodes.find((f) => f && f.name === 'Status');
  if (!status) throw new Error('Il Project non ha il campo Status');
  return { id: p.id, fieldId: status.id, options: new Map(status.options.map((o) => [o.name, o.id])) };
}

function addToProject(ctx, nodeId, statusName) {
  const add = gql(`mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}`, { p: ctx.id, c: nodeId });
  const optionId = ctx.options.get(statusName);
  if (!optionId) return;
  gql(`mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}}`,
    { p: ctx.id, i: add.addProjectV2ItemById.item.id, f: ctx.fieldId, o: optionId });
}

// ── main ────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const WITH_VALUE = ['--repo', '--out', '--project'];
  const file = argv.find((a, i) => !a.startsWith('--') && !WITH_VALUE.includes(argv[i - 1]));
  if (!file || !existsSync(file)) { console.error('Serve il JSON esportato da Trello: node scripts/trello-to-github.mjs <export.json> [--apply]'); process.exit(1); }
  const flag = (n) => argv.includes(n);
  const val = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
  const out = val('--out') || 'trello-export';
  mkdirSync(out, { recursive: true });

  const board = JSON.parse(readFileSync(file, 'utf8'));
  const { issues, skipped } = buildAll(board, { includeArchived: flag('--include-archived'), authors: flag('--authors') });

  const csv = join(out, 'trello-import-preview.csv');
  writeFileSync(csv, '﻿' + toCsv(issues, skipped));   // BOM: Excel apre l'UTF-8 senza storpiare gli accenti
  console.log(`Board «${board.name}»: ${(board.cards || []).length} card → ${issues.length} da importare, ${skipped.length} non importate.`);
  console.log('Da importare, per tipo:', summarize(issues));
  console.log('Non importate, per motivo:', summarizeSkipped(skipped));
  const warn = issues.filter((i) => i.warnings.length);
  console.log(`Con avvisi: ${warn.length}. Anteprima: ${csv}`);

  if (!flag('--apply')) { console.log('\nAnteprima soltanto: niente è stato creato. Per importare, aggiungi --apply.'); return; }

  const repo = val('--repo') || gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).trim();
  const haveLabels = new Set(ghJson(['api', `repos/${repo}/labels?per_page=100`, '--paginate', '--slurp']).flat().map((x) => x.name));
  const missing = TYPE_LABELS.concat(['segnalazione', 'diritti']).filter((l) => !haveLabels.has(l));
  if (missing.length) { console.error(`Mancano le etichette: ${missing.join(', ')}. Lancia prima scripts/github-backlog-setup.mjs --apply.`); process.exit(1); }

  const milestones = new Map(ghJson(['api', `repos/${repo}/milestones?state=all&per_page=100`, '--paginate', '--slurp']).flat().map((m) => [m.title, m.number]));
  const done = existingMarkers(repo);
  const proj = val('--project') ? projectContext(Number(val('--project'))) : null;

  const mapFile = join(out, 'trello-import-map.json');
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {};
  let created = 0, already = 0;
  for (const issue of issues) {
    if (done.has(issue.cardId)) { already++; map[issue.cardId] = done.get(issue.cardId); continue; }
    const res = await createIssue(repo, issue, milestones);
    map[issue.cardId] = res.number;
    if (proj) addToProject(proj, res.node_id, issue.status);
    created++;
    console.log(`  #${res.number}  ${issue.title}`);
    writeFileSync(mapFile, JSON.stringify(map, null, 2));
    await sleep(1500);   // GitHub limita la creazione di contenuti: una al secondo e mezzo resta sotto
  }
  console.log(`\nFatto: ${created} create, ${already} già presenti. Mappa card → issue: ${mapFile}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
