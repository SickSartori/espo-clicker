#!/usr/bin/env node
/**
 * Verifica post-deploy: controlla che OGNI file della cartella locale sia davvero
 * raggiungibile sul server.
 *
 * Nato dopo un upload parziale in cui 3 giochi arcade (space, asteroids, invaders)
 * erano rimasti in 404 sul server pur essendo presenti in locale e in git: i CSS
 * c'erano, i JS no. Nessuno se n'era accorto finché un giocatore non ha aperto la
 * console. Questo script rende quel tipo di buco impossibile da non vedere.
 *
 * Uso:
 *   node scripts/verify-deploy.mjs <baseUrl> [cartellaLocale]
 *
 * Esempi:
 *   node scripts/verify-deploy.mjs https://www.espooclicker.altervista.org
 *   node scripts/verify-deploy.mjs https://www.espooclicker.altervista.org/test/ ../Espo-Clicker-Altervista/test
 *
 * Semantica: fallisce SOLO sui 404 (file assente). Un 401/403/500 significa che il
 * file c'è ma l'endpoint richiede parametri o e' protetto: viene riportato a parte
 * come informazione, non come errore.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const skipArg = (process.argv.find((a) => a.startsWith('--skip=')) || '').slice(7);
const EXTRA_SKIP = skipArg ? skipArg.split(',').filter(Boolean) : [];
const [BASE_RAW, LOCAL_RAW] = argv;
if (!BASE_RAW) {
  console.error('Uso: node scripts/verify-deploy.mjs <baseUrl> [cartellaLocale] [--skip=dir1,dir2]');
  process.exit(2);
}
const BASE = BASE_RAW.replace(/\/+$/, '') + '/';
const LOCAL = LOCAL_RAW || '.';
const CONCURRENCY = 8;

// Estensioni servite via HTTP che ha senso verificare.
const EXT = new Set(['.js', '.css', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif',
                     '.ttf', '.woff', '.woff2', '.json', '.php', '.md', '.ico']);

// Non verificare: roba non pubblica, o media serviti da Cloudflare R2 e non dal filesystem.
const SKIP_DIR = ['node_modules', '.git', '.github', 'src', 'dev', 'scripts', 'test-results',
                  join('assets', 'sounds'), join('assets', 'video'), join('music', 'songs'),
                  ...EXTRA_SKIP];
const SKIP_FILE = ['.ftp-deploy-sync-state.json', 'package.json', 'package-lock.json'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(LOCAL, full);
    if (SKIP_DIR.some((s) => rel === s || rel.startsWith(s + sep))) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXT.has(name.slice(name.lastIndexOf('.')).toLowerCase()) && !SKIP_FILE.includes(name)) {
      out.push(rel.split(sep).join('/'));
    }
  }
  return out;
}

const files = walk(LOCAL).sort();
console.log(`Verifico ${files.length} file su ${BASE}\n`);

const missing = [];
const odd = [];
let done = 0;

async function check(path) {
  const url = BASE + encodeURI(path);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    // Alcuni server non gradiscono HEAD: ritenta in GET prima di dichiarare 404.
    if (res.status === 404 || res.status === 405) {
      res = await fetch(url, { method: 'GET', redirect: 'follow' });
    }
    if (res.status === 404) missing.push(path);
    else if (res.status !== 200) odd.push(`${path} -> ${res.status}`);
  } catch (e) {
    odd.push(`${path} -> errore rete: ${e.message}`);
  }
  done++;
  if (done % 25 === 0) process.stdout.write(`  ...${done}/${files.length}\n`);
}

const queue = files.slice();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await check(queue.shift());
}));

console.log('');
if (missing.length) {
  console.log(`MANCANTI sul server (404): ${missing.length}`);
  for (const m of missing) console.log('  X ' + m);
} else {
  console.log('MANCANTI sul server (404): nessuno');
}
if (odd.length) {
  console.log(`\nPresenti ma non 200 (normale per endpoint che vogliono parametri): ${odd.length}`);
  for (const o of odd) console.log('  - ' + o);
}
process.exit(missing.length ? 1 : 0);
