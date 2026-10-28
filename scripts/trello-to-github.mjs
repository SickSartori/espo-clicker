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
//   --no-authors            non scrive i nomi di chi ha commentato
//   --out <cartella>        dove scrivere anteprima e mappa (default: trello-export/, ignorata da git)
//
// L'export è il JSON della board: Menu → Stampa, esporta e condividi → Esporta in JSON.
// Contiene i nomi utente dei giocatori: tienilo fuori dal repo.
//
// Sicuro da rilanciare: ogni issue porta nel corpo un marcatore <!-- trello:ID --> e le card
// già importate vengono saltate. Non usa nessuna chiave: passa da `gh`, già autenticato.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// ── Mappe ────────────────────────────────────────────────────

/** Etichette GitHub per tipo (vedi scripts/github-backlog-setup.mjs: devono esistere). */
export const TYPE_LABELS = ['skin', 'tema', 'musica', 'nuova-funzione', 'miglioria', 'bug'];

/** Nome della lista Trello → tipo. Le liste dell'endpoint «Segnala» sono NEW, BUG, IMPROVED. */
export function classifyList(listName) {
  const n = String(listName || '').trim().toLowerCase();
  if (/(^|\b)(fatt[oa]|done|completat[oae]|rilasciat[oae]|released)(\b|$)/.test(n)) return { type: null, done: true };
  if (/da valutare|valutare|inbox|idee/.test(n)) return { type: null, valutare: true };
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

/** Toglie il prefisso messo dall'endpoint «Segnala» e lo restituisce come tipo. */
export function parseTitle(name) {
  let title = String(name || '').trim();
  let type = null;
  for (const [re, t] of PREFIXES) {
    if (re.test(title)) { type = t; title = title.replace(re, ''); break; }
  }
  if (!title) title = '(senza titolo)';
  return { title: title.slice(0, 250), type };
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
    .trim();
  return { body, fromGame };
}

/** Un'etichetta Trello che sembra una versione (3.1, v3.2.0) diventa la milestone vX.Y. */
export function labelToMilestone(labelNames) {
  for (const l of labelNames || []) {
    const m = /^v?(\d+\.\d+)(?:\.\d+)?$/i.exec(String(l).trim());
    if (m) return `v${m[1]}`;
  }
  return null;
}

export const marker = (cardId) => `<!-- trello:${cardId} -->`;
const day = (iso) => (iso ? String(iso).slice(0, 10) : '');

// ── Costruzione delle issue ─────────────────────────────────

/**
 * @param board  il JSON dell'export
 * @param opts   { includeArchived, authors }
 * @returns Array<{ cardId, title, body, labels, milestone, state, stateReason, listName, warnings }>
 */
export function buildIssues(board, opts = {}) {
  const authors = opts.authors !== false;
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

  const out = [];
  for (const card of cards) {
    const list = lists.get(card.idList) || { name: '(lista sconosciuta)' };
    const archived = !!(card.closed || list.closed);
    if (archived && !opts.includeArchived) continue;

    const warnings = [];
    const cls = classifyList(list.name);
    const { title, type: prefixType } = parseTitle(card.name);
    const { body: desc, fromGame } = stripContext(card.desc);
    const trelloLabels = (card.idLabels || []).map((id) => labelsById.get(id)?.name).filter(Boolean);

    const labels = new Set();
    const type = cls.type || prefixType;
    if (type) labels.add(type); else warnings.push('nessun tipo: assegnalo in triage');
    if (cls.type && prefixType && cls.type !== prefixType) warnings.push(`lista «${list.name}» e prefisso del titolo non coincidono (${cls.type} / ${prefixType}): vince la lista`);
    if (fromGame) labels.add('segnalazione');
    if (trelloLabels.some((n) => /^test$/i.test(n))) labels.add('test');
    if (/diritti|licenz|copyright/i.test(trelloLabels.join(' '))) labels.add('diritti');

    const milestone = labelToMilestone(trelloLabels);
    const restLabels = trelloLabels.filter((n) => !/^test$/i.test(n) && labelToMilestone([n]) === null);

    // corpo
    const parts = [];
    if (desc) parts.push(desc);

    const cl = (checklists.get(card.id) || []);
    for (const c of cl) {
      const items = (c.checkItems || []).slice().sort((a, b) => a.pos - b.pos);
      if (!items.length) continue;
      parts.push(`### ${c.name || 'Checklist'}\n` + items.map((i) => `- [${i.state === 'complete' ? 'x' : ' '}] ${i.name}`).join('\n'));
    }

    const cm = (comments.get(card.id) || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (cm.length) {
      parts.push('### Commenti da Trello\n' + cm.map((a) => {
        const who = authors && a.memberCreator ? ` — ${a.memberCreator.fullName || a.memberCreator.username}` : '';
        const text = String(a.data.text || '').trim().replace(/\n/g, '\n> ');
        return `> ${text}\n> _${day(a.date)}${who}_`;
      }).join('\n\n'));
    }

    const atts = card.attachments || [];
    if (atts.length) {
      parts.push('### Allegati\n' + atts.map((a) => `- [${a.name || a.url}](${a.url})`).join('\n'));
      warnings.push(`${atts.length} allegat${atts.length === 1 ? 'o' : 'i'}: i file di Trello si aprono solo con l'accesso alla board`);
    }

    const dc = card.dateLastActivity ? `, ultima attività ${day(card.dateLastActivity)}` : '';
    const link = card.shortUrl || card.url;
    let footer = `_Importata da Trello — lista «${list.name}»${dc}_` + (link ? `\n_${link}_` : '');
    if (restLabels.length) footer += `\n_Etichette Trello: ${restLabels.join(', ')}_`;
    if (card.due) footer += `\n_Scadenza su Trello: ${day(card.due)}_`;
    parts.push('---\n' + footer);
    parts.push(marker(card.id));

    let bodyText = parts.join('\n\n');
    if (bodyText.length > 60000) { bodyText = bodyText.slice(0, 60000) + '\n\n_…testo troncato per il limite di GitHub_\n' + marker(card.id); warnings.push('testo troncato'); }

    const state = archived || cls.done ? 'closed' : 'open';
    out.push({
      cardId: card.id,
      title,
      body: bodyText,
      labels: [...labels],
      milestone,
      state,
      stateReason: state === 'closed' ? (cls.done ? 'completed' : 'not_planned') : null,
      status: cls.done ? 'Fatto' : (archived ? 'Scartato' : 'Da valutare'),
      listName: list.name,
      warnings,
    });
  }
  return out;
}

// ── CSV di anteprima ────────────────────────────────────────

export function toCsv(issues) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const head = ['lista', 'titolo', 'etichette', 'milestone', 'stato', 'stato project', 'avvisi'];
  const rows = issues.map((i) => [i.listName, i.title, i.labels.join(' '), i.milestone || '', i.state, i.status, i.warnings.join(' | ')].map(esc).join(','));
  return [head.join(','), ...rows].join('\n');
}

export function summarize(issues) {
  const byType = {};
  for (const i of issues) {
    const t = i.labels.find((l) => TYPE_LABELS.includes(l)) || '(senza tipo)';
    byType[t] = (byType[t] || 0) + 1;
  }
  return byType;
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
    const m = /<!-- trello:([0-9a-f]+) -->/.exec(it.body || '');
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
  const issues = buildIssues(board, { includeArchived: flag('--include-archived'), authors: !flag('--no-authors') });

  const csv = join(out, 'trello-import-preview.csv');
  writeFileSync(csv, '﻿' + toCsv(issues));
  console.log(`Board «${board.name}»: ${(board.cards || []).length} card, ${issues.length} da importare.`);
  console.log('Per tipo:', summarize(issues));
  const warn = issues.filter((i) => i.warnings.length);
  console.log(`Con avvisi: ${warn.length}. Anteprima: ${csv}`);

  if (!flag('--apply')) { console.log('\nAnteprima soltanto: niente è stato creato. Per importare, aggiungi --apply.'); return; }

  const repo = val('--repo') || gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).trim();
  const haveLabels = new Set(ghJson(['api', `repos/${repo}/labels?per_page=100`, '--paginate', '--slurp']).flat().map((x) => x.name));
  const missing = TYPE_LABELS.concat(['segnalazione', 'test', 'diritti']).filter((l) => !haveLabels.has(l));
  if (missing.length) { console.error(`Mancano le etichette: ${missing.join(', ')}. Lancia prima scripts/github-backlog-setup.mjs --apply.`); process.exit(1); }

  const milestones = new Map(ghJson(['api', `repos/${repo}/milestones?state=all&per_page=100`, '--paginate', '--slurp']).flat().map((m) => [m.title, m.number]));
  const done = existingMarkers(repo);
  const proj = val('--project') ? projectContext(Number(val('--project'))) : null;

  const mapFile = join(out, 'trello-import-map.json');
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {};
  let created = 0, skipped = 0;
  for (const issue of issues) {
    if (done.has(issue.cardId)) { skipped++; map[issue.cardId] = done.get(issue.cardId); continue; }
    const res = await createIssue(repo, issue, milestones);
    map[issue.cardId] = res.number;
    if (proj) addToProject(proj, res.node_id, issue.status);
    created++;
    console.log(`  #${res.number}  ${issue.title}`);
    writeFileSync(mapFile, JSON.stringify(map, null, 2));
    await sleep(1500);   // GitHub limita la creazione di contenuti: una al secondo e mezzo resta sotto
  }
  console.log(`\nFatto: ${created} create, ${skipped} già presenti. Mappa card → issue: ${mapFile}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
