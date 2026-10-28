#!/usr/bin/env node
// ============================================================
// Backlog su GitHub: etichette, milestone e Project (viste per sezione)
// ------------------------------------------------------------
// Uso:
//   node scripts/github-backlog-setup.mjs            mostra cosa farebbe (non cambia nulla)
//   node scripts/github-backlog-setup.mjs --apply    applica
//
// Opzioni: --repo owner/nome   --no-project   --project-title "Titolo"
//
// Sicuro da rilanciare: crea solo ciò che manca e corregge colori e descrizioni.
// Il Project richiede il permesso `project` del token di gh:
//     gh auth refresh -s project
// Senza, etichette e milestone si applicano lo stesso e il Project viene saltato.
// Le regole automatiche del Project (auto-add, stato alla chiusura) non hanno API:
// in fondo l'elenco dei clic da fare a mano.
// ============================================================
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// ── Cosa creare ──────────────────────────────────────────────

/** Una etichetta per sezione di Trello; «Da valutare» è uno stato del Project, non un'etichetta. */
export const LABELS = [
  { name: 'skin',           color: 'a855f7', description: 'Skin proposte' },
  { name: 'tema',           color: '38bdf8', description: 'Temi' },
  { name: 'musica',         color: 'f59e0b', description: 'Musica e OST' },
  { name: 'nuova-funzione', color: '22c55e', description: 'Nuove aggiunte', renameFrom: 'enhancement' },
  { name: 'miglioria',      color: '14b8a6', description: 'Migliorie' },
  { name: 'bug',            color: 'd73a4a', description: 'Problemi' },
  { name: 'segnalazione',   color: '64748b', description: 'Arrivata dal pulsante Segnala del gioco' },
  { name: 'test',           color: '94a3b8', description: 'Segnalazione di prova, fuori produzione' },
  { name: 'diritti',        color: 'ef4444', description: 'Da controllare: marchi, loghi o persone reali' },
];

/** Le date sono quelle del roadmap; v3.5 e v4.0 hanno solo «inizio febbraio» e «aprile»: niente data finché non è fissa. */
export const MILESTONES = [
  { title: 'v3.3', description: 'Primo compleanno', due: '2026-11-17T08:00:00Z' },
  { title: 'v3.4', description: 'Natale',           due: '2026-12-15T08:00:00Z' },
  { title: 'v3.5', description: 'Season 2' },
  { title: 'v4.0', description: 'Il Mondo di Espo' },
];

export const STATUS_OPTIONS = [
  { name: 'Da valutare', color: 'GRAY',   description: 'Arrivata, ancora da guardare' },
  { name: 'Pianificato', color: 'BLUE',   description: 'Decisa, con una release' },
  { name: 'In corso',    color: 'YELLOW', description: 'Ci si sta lavorando' },
  { name: 'Fatto',       color: 'GREEN',  description: 'Uscita o chiusa' },
  { name: 'Scartato',    color: 'RED',    description: 'Non si fa' },
];

const NOT_DISCARDED = '-status:Scartato';
/** L'ordine è quello delle schede in alto. Il filtro è quello del Project (stessa sintassi della barra di ricerca). */
export const VIEWS = [
  { name: 'Lavagna',     layout: 'BOARD_LAYOUT',   filter: NOT_DISCARDED },
  { name: 'Da valutare', layout: 'TABLE_LAYOUT',   filter: 'status:"Da valutare"' },
  { name: 'Skin',        layout: 'BOARD_LAYOUT',   filter: `label:skin ${NOT_DISCARDED}` },
  { name: 'Temi',        layout: 'BOARD_LAYOUT',   filter: `label:tema ${NOT_DISCARDED}` },
  { name: 'Musica',      layout: 'BOARD_LAYOUT',   filter: `label:musica ${NOT_DISCARDED}` },
  { name: 'Funzioni',    layout: 'BOARD_LAYOUT',   filter: `label:nuova-funzione ${NOT_DISCARDED}` },
  { name: 'Migliorie',   layout: 'BOARD_LAYOUT',   filter: `label:miglioria ${NOT_DISCARDED}` },
  { name: 'Problemi',    layout: 'BOARD_LAYOUT',   filter: `label:bug ${NOT_DISCARDED}` },
  { name: 'Tabella',     layout: 'TABLE_LAYOUT',   filter: '' },
  { name: 'Roadmap',     layout: 'ROADMAP_LAYOUT', filter: NOT_DISCARDED },
];

// ── gh ───────────────────────────────────────────────────────

// stderr catturato (non stampato): gli errori arrivano comunque in e.stderr, e il controllo del permesso `project` resta silenzioso
const gh = (args, input) => execFileSync('gh', args, { input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
const ghJson = (args, input) => JSON.parse(gh(args, input));

function gql(query, variables = {}) {
  const res = ghJson(['api', 'graphql', '--input', '-'], JSON.stringify({ query, variables }));
  if (res.errors) throw new Error(JSON.stringify(res.errors));
  return res.data;
}

const log = (apply, verb, what) => console.log(`  ${apply ? '✓' : '·'} ${verb.padEnd(9)} ${what}`);

// ── Etichette ────────────────────────────────────────────────

function setupLabels(repo, apply) {
  console.log('\nEtichette');
  const have = new Map(ghJson(['label', 'list', '--repo', repo, '--json', 'name,color,description', '-L', '200']).map((l) => [l.name, l]));
  for (const want of LABELS) {
    let cur = have.get(want.name);
    if (!cur && want.renameFrom && have.has(want.renameFrom)) {
      log(apply, 'rinomina', `${want.renameFrom} → ${want.name}`);
      if (apply) gh(['label', 'edit', want.renameFrom, '--repo', repo, '--name', want.name, '--color', want.color, '--description', want.description]);
      continue;
    }
    if (!cur) {
      log(apply, 'crea', want.name);
      if (apply) gh(['label', 'create', want.name, '--repo', repo, '--color', want.color, '--description', want.description]);
    } else if (cur.color.toLowerCase() !== want.color || (cur.description || '') !== want.description) {
      log(apply, 'aggiorna', want.name);
      if (apply) gh(['label', 'edit', want.name, '--repo', repo, '--color', want.color, '--description', want.description]);
    } else {
      log(false, 'ok', want.name);
    }
  }
}

// ── Milestone ────────────────────────────────────────────────

function setupMilestones(repo, apply) {
  console.log('\nMilestone');
  const have = new Map(ghJson(['api', `repos/${repo}/milestones?state=all&per_page=100`, '--paginate', '--slurp']).flat().map((m) => [m.title, m]));
  for (const want of MILESTONES) {
    if (have.has(want.title)) { log(false, 'ok', want.title); continue; }
    log(apply, 'crea', `${want.title} — ${want.description}${want.due ? ` (${want.due.slice(0, 10)})` : ' (senza data)'}`);
    if (apply) {
      const payload = { title: want.title, description: want.description };
      if (want.due) payload.due_on = want.due;
      gh(['api', `repos/${repo}/milestones`, '-X', 'POST', '--input', '-'], JSON.stringify(payload));
    }
  }
}

// ── Project ──────────────────────────────────────────────────

function hasProjectScope() {
  // Deve toccare un campo che il permesso protegge (nodes.id): `totalCount` da solo passa anche senza.
  try { gql('{viewer{projectsV2(first:1){nodes{id}}}}'); return true; } catch { return false; }
}

function setupProject(repo, title, apply) {
  console.log(`\nProject «${title}»`);
  if (!hasProjectScope()) {
    console.log('  ! Manca il permesso `project` sul token di gh: il Project viene saltato.');
    console.log('    Lancia:  gh auth refresh -s project   (conferma nel browser) e poi rilancia questo script.');
    return;
  }
  const [owner, name] = repo.split('/');
  const base = gql('query($o:String!,$n:String!){viewer{id login projectsV2(first:50){nodes{id number title}}} repository(owner:$o,name:$n){id}}', { o: owner, n: name });
  let project = base.viewer.projectsV2.nodes.find((p) => p.title === title);

  if (!project) {
    log(apply, 'crea', 'il Project (privato)');
    if (!apply) { console.log('    (le viste e lo Stato si controllano dopo la creazione)'); return; }
    project = gql('mutation($o:ID!,$t:String!){createProjectV2(input:{ownerId:$o,title:$t}){projectV2{id number title}}}', { o: base.viewer.id, t: title }).createProjectV2.projectV2;
    gql('mutation($p:ID!,$r:ID!){linkProjectV2ToRepository(input:{projectId:$p,repositoryId:$r}){repository{id}}}', { p: project.id, r: base.repository.id });
    log(apply, 'collega', `al repo ${repo}`);
  } else {
    log(false, 'ok', `esiste già (n. ${project.number})`);
  }

  const full = gql(`query($p:ID!){node(id:$p){... on ProjectV2{
      fields(first:30){nodes{... on ProjectV2SingleSelectField{id name options{id name color description}}}}
      views(first:50){nodes{id name layout filter number}}}}}`, { p: project.id }).node;

  // Stato
  const status = full.fields.nodes.find((f) => f && f.name === 'Status');
  const wantNames = STATUS_OPTIONS.map((o) => o.name).join('|');
  if (!status) {
    console.log('  ! Il Project non ha il campo Status: aggiungilo a mano (Impostazioni → Campi) e rilancia.');
  } else if (status.options.map((o) => o.name).join('|') !== wantNames) {
    log(apply, 'imposta', `Stato: ${STATUS_OPTIONS.map((o) => o.name).join(' → ')}`);
    if (apply) gql('mutation($f:ID!,$o:[ProjectV2SingleSelectFieldOptionInput!]!){updateProjectV2Field(input:{fieldId:$f,singleSelectOptions:$o}){projectV2Field{... on ProjectV2SingleSelectField{id}}}}', { f: status.id, o: STATUS_OPTIONS });
  } else {
    log(false, 'ok', 'Stato');
  }

  // Viste: la prima, creata col Project, si ribattezza invece di lasciarne una vuota
  const views = new Map(full.views.nodes.map((v) => [v.name, v]));
  const spare = full.views.nodes.find((v) => /^view \d+$/i.test(v.name) && !VIEWS.some((w) => w.name === v.name));
  for (const want of VIEWS) {
    let cur = views.get(want.name);
    if (!cur && spare && !spare.__taken) {
      // la vista creata col Project è una tabella: diventa la PRIMA della lista (anche cambiandole il tipo),
      // così l'ordine delle schede è quello di VIEWS: l'API non permette di riordinarle dopo
      spare.__taken = true;
      log(apply, 'ribattezza', `${spare.name} → ${want.name}`);
      if (apply) gql('mutation($v:ID!,$n:String!,$l:ProjectV2ViewLayout!,$f:String){updateProjectV2View(input:{viewId:$v,name:$n,layout:$l,filter:$f}){projectV2View{id}}}', { v: spare.id, n: want.name, l: want.layout, f: want.filter });
      continue;
    }
    if (!cur) {
      log(apply, 'crea', `vista ${want.name}${want.filter ? `  [${want.filter}]` : ''}`);
      if (apply) {
        const v = gql('mutation($p:ID!,$n:String!,$l:ProjectV2ViewLayout!){createProjectV2View(input:{projectId:$p,name:$n,layout:$l}){projectV2View{id}}}', { p: project.id, n: want.name, l: want.layout }).createProjectV2View.projectV2View;
        if (want.filter) gql('mutation($v:ID!,$f:String){updateProjectV2View(input:{viewId:$v,filter:$f}){projectV2View{id}}}', { v: v.id, f: want.filter });
      }
    } else if ((cur.filter || '') !== want.filter) {
      log(apply, 'filtro', `vista ${want.name}  [${want.filter}]`);
      if (apply) gql('mutation($v:ID!,$f:String){updateProjectV2View(input:{viewId:$v,filter:$f}){projectV2View{id}}}', { v: cur.id, f: want.filter });
    } else {
      log(false, 'ok', `vista ${want.name}`);
    }
  }
  console.log(`\n  Project: https://github.com/users/${base.viewer.login}/projects/${project.number}`);
}

export const MANUAL_STEPS = `
Da fare a mano nel Project (⋯ → Workflows), le regole automatiche non hanno API:
  1. «Auto-add to project»: repo ${'{repo}'}, filtro  is:issue  → ogni issue nuova entra da sola.
  2. «Item added to project»: imposta Stato = Da valutare.
  3. «Item closed»: Stato = Fatto.   «Pull request merged»: Stato = Fatto.
  4. Vista Roadmap: scegli i segnaposto «Milestone» (le date di v3.3 e v3.4 compaiono da sole).
  5. Le issue già esistenti non entrano con l'auto-add: aggiungile dal Project con «Add item», oppure
     importa con  --project <numero>  (scripts/trello-to-github.mjs).`;

// ── main ─────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const val = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
  const repo = val('--repo') || gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).trim();
  console.log(`${apply ? 'APPLICO' : 'ANTEPRIMA (niente cambia)'} su ${repo}`);

  setupLabels(repo, apply);
  setupMilestones(repo, apply);
  if (!argv.includes('--no-project')) setupProject(repo, val('--project-title') || 'Espòòò Clicker — Backlog', apply);

  console.log(MANUAL_STEPS.replace('{repo}', repo));
  if (!apply) console.log('\nAnteprima soltanto. Per applicare: node scripts/github-backlog-setup.mjs --apply');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(e.stderr ? String(e.stderr) : (e.message || e)); process.exit(1); }
}
