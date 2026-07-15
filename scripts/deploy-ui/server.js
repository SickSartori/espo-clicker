#!/usr/bin/env node
/* ============================================================
 * Deploy Console — mini server locale per gestire il deploy.
 * Zero dipendenze (http + child_process nativi di Node).
 * Ascolta SOLO su 127.0.0.1 (mai esposto in rete).
 * Avvio:  node scripts/deploy-ui/server.js   (o deploy-ui.bat)
 * ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..'); // root del progetto
const HOST = '127.0.0.1';
const PORT = 4599;
const UI_FILE = path.join(__dirname, 'index.html');
const R2 = 'r2:espo-clicker-assets';

const pkg = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Helper per definire gli step. shell:true solo per npm (npm.cmd su Windows);
// git/rclone vanno con shell:false → argomenti separati = nessuna injection.
const npm = (...a) => ({ file: 'npm', args: a, shell: true });
const git = (...a) => ({ file: 'git', args: a, shell: false });
const rclone = (...a) => ({ file: 'rclone', args: a, shell: false });
const A = path.join(ROOT, 'assets');
const M = path.join(ROOT, 'music');

// Definizione azioni (rispecchia deploy.bat). input.msg = messaggio commit.
function actions(input) {
  const v = () => pkg().version;
  return {
    release_patch:     { steps: () => [npm('run', 'release')] },
    build:             { steps: () => [npm('run', 'build')] },
    build_commit_push: { steps: () => [
                           npm('run', 'build'),
                           git('add', '-A'),
                           git('commit', '-m', (input.msg && input.msg.trim()) || 'Build aggiornamento'),
                           git('push', 'origin', 'develop-v3'),
                         ] },
    bump_major:        { steps: () => [npm('run', 'bump:major')] },
    bump_minor:        { steps: () => [npm('run', 'bump:minor')] },
    cache_bump:        { steps: () => [npm('run', 'cache:bump')] },

    push_test:         { steps: () => [
                           git('checkout', 'develop-v3'),
                           git('pull', 'origin', 'develop-v3'),
                           git('push', '--force', 'origin', 'develop-v3:test'),
                         ] },
    push_main:         { steps: () => [
                           git('checkout', 'main'),
                           git('merge', 'test', '--no-ff', '-m', `Release v${v()}`),
                           git('tag', '-a', `v${v()}`, '-m', `Release v${v()}`),
                           git('push', 'origin', 'main'),
                           git('push', 'origin', `v${v()}`),
                           git('checkout', 'develop-v3'),
                         ] },
    git_status:        { steps: () => [git('status', '-s'), git('branch', '-vv'), git('log', '--oneline', '-6')] },

    r2_all:            { steps: () => [
                           rclone('copy', path.join(A, 'sounds'), `${R2}/assets/sounds`, '-P', '--transfers', '4'),
                           rclone('copy', path.join(A, 'video'), `${R2}/assets/video`, '-P', '--transfers', '4'),
                           rclone('copy', path.join(M, 'songs'), `${R2}/music/songs`, '-P', '--transfers', '4'),
                         ] },
    r2_sounds:         { steps: () => [rclone('copy', path.join(A, 'sounds'), `${R2}/assets/sounds`, '-P', '--transfers', '4')] },
    r2_video:          { steps: () => [rclone('copy', path.join(A, 'video'), `${R2}/assets/video`, '-P', '--transfers', '4')] },
    r2_songs:          { steps: () => [rclone('copy', path.join(M, 'songs'), `${R2}/music/songs`, '-P', '--transfers', '4')] },
    r2_list:           { steps: () => [rclone('lsd', R2), rclone('size', R2)] },

    release_notes:     { steps: () => [{ fn: () => fs.readFileSync(path.join(ROOT, 'release-notes_it.md'), 'utf8') }] },
    clean_rebuild:     { steps: () => [
                           { fn: () => { for (const d of ['dist']) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }); return 'dist/ rimosso.'; } },
                           npm('run', 'build'),
                         ] },
  };
}

let busy = false;

function runSteps(steps, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  const send = (ev, data) => { if (!res.writableEnded) { try { res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {} } };
  const finish = (code) => { send('done', { code }); if (!res.writableEnded) res.end(); busy = false; };

  let i = 0;
  const next = () => {
    if (i >= steps.length) return finish(0);
    const step = steps[i++];

    if (step.fn) { // operazione JS (es. rimuovere dist/)
      try { const out = step.fn(); if (out) send('out', { line: out + '\n' }); next(); }
      catch (e) { send('out', { line: 'ERRORE: ' + e.message + '\n' }); finish(1); }
      return;
    }

    send('step', { cmd: `${step.file} ${step.args.join(' ')}` });
    let p;
    try { p = spawn(step.file, step.args, { cwd: ROOT, shell: !!step.shell, windowsHide: true }); }
    catch (e) { send('out', { line: 'ERRORE avvio: ' + e.message + '\n' }); return finish(1); }
    p.stdout.on('data', (d) => send('out', { line: d.toString() }));
    p.stderr.on('data', (d) => send('out', { line: d.toString() }));
    p.on('error', (e) => { send('out', { line: 'ERRORE: ' + e.message + '\n' }); finish(1); });
    p.on('close', (code) => { (code === 0) ? next() : finish(code); });
  };
  next();
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${HOST}:${PORT}`);

  if (u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(UI_FILE));
  }

  if (u.pathname === '/api/status') {
    let branch = '?', dirty = false;
    try { branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim(); } catch (e) {}
    try { dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0; } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ version: pkg().version, branch, dirty }));
  }

  if (u.pathname === '/api/run') {
    const id = u.searchParams.get('action');
    const msg = u.searchParams.get('msg') || '';
    const defs = actions({ msg });
    if (!defs[id]) { res.writeHead(404); return res.end('azione sconosciuta'); }
    if (busy) { res.writeHead(409); return res.end('un comando è già in esecuzione'); }
    busy = true;
    let steps;
    try { steps = defs[id].steps(); } catch (e) { busy = false; res.writeHead(500); return res.end(e.message); }
    return runSteps(steps, res);
  }

  res.writeHead(404); res.end('not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n[Deploy Console] La porta ${PORT} è occupata. Chiudi l'altra istanza o cambia PORT in server.js.\n`);
  else console.error('[Deploy Console] Errore server:', e.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`\n  Deploy Console attiva → ${url}\n  (Ctrl+C per chiudere)\n`);
  if (!process.env.DEPLOY_UI_NO_OPEN && !process.argv.includes('--no-open')) { try { spawn('cmd', ['/c', 'start', '', url], { shell: false, windowsHide: true }); } catch (e) {} }
});
