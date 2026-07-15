#!/usr/bin/env node
/**
 * Bundle size budget — fail PR se output supera limiti.
 *
 * Limiti scelti come "high water mark" attuale + 5% per non bloccare lavoro
 * di refactor. Da stringere mano a mano che il legacy bundle si svuota.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');

// { file, maxRaw, maxGzip } — KB
// NOTE: bundle V3 entry include break_eternity.js (~25KB gzip) per drop-in replace
// della CDN break_infinity. Una volta tolta la CDN dal legacy, il netto è zero.
const BUDGETS = [
  { file: 'dist/styles.bundle.min.css', maxRaw: 110, maxGzip: 25 },
  { file: 'dist/styles.mobile.min.css', maxRaw: 25, maxGzip: 6 },
  { file: 'dist/game.modules.js', maxRaw: 90, maxGzip: 25 },
];

let failed = 0;
const rows = [];

for (const b of BUDGETS) {
  const full = path.join(ROOT, b.file);
  if (!fs.existsSync(full)) {
    console.log(`⚠ skip (assente): ${b.file}`);
    continue;
  }
  const buf = fs.readFileSync(full);
  const raw = buf.length / 1024;
  const gzip = zlib.gzipSync(buf, { level: 9 }).length / 1024;
  const okRaw = raw <= b.maxRaw;
  const okGzip = gzip <= b.maxGzip;
  if (!okRaw || !okGzip) failed++;
  rows.push({
    file: b.file,
    raw: raw.toFixed(1),
    rawMax: b.maxRaw,
    gzip: gzip.toFixed(1),
    gzipMax: b.maxGzip,
    ok: okRaw && okGzip,
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('FILE', 36), pad('RAW', 18), pad('GZIP', 18), 'OK');
console.log('-'.repeat(80));
for (const r of rows) {
  console.log(
    pad(r.file, 36),
    pad(`${r.raw}/${r.rawMax}KB`, 18),
    pad(`${r.gzip}/${r.gzipMax}KB`, 18),
    r.ok ? '✓' : '✗',
  );
}
console.log('-'.repeat(80));

if (failed > 0) {
  console.error(`✗ ${failed} bundle fuori budget. Aggiornare i limiti se intenzionale.`);
  process.exit(1);
}
console.log('✓ Tutti i bundle entro budget.');
