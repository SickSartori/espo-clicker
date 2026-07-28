/**
 * Server per i test E2E (Playwright webServer).
 *
 * Serve index.php via il server PHP built-in su 127.0.0.1:8899, gestendo i due
 * vincoli d'ambiente:
 *   1. php/config.php è gitignored (ha segreti) → in CI non esiste. Qui lo si
 *      crea da config.example.php forzato a instanceName=dev, così check_version.php
 *      (che fa require di config.php) non va in fatal.
 *   2. Il binario PHP: su PATH in CI (setup-php); in locale MAMP fornisce PHP_BIN
 *      via env, altrimenti si prova 'php'.
 *
 * NON committa nulla e NON tocca un config.php già presente (dev locale intatto).
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOST = process.env.E2E_HOST || '127.0.0.1';
const PORT = process.env.E2E_PORT || '8899';
const PHP_BIN = process.env.PHP_BIN || 'php';

// --- 1. config.php: crea da example SOLO se manca (non sovrascrive il locale) ---
const configPath = path.join(ROOT, 'php', 'config.php');
const examplePath = path.join(ROOT, 'php', 'config.example.php');
if (!fs.existsSync(configPath)) {
  if (!fs.existsSync(examplePath)) {
    console.error('[e2e-server] né php/config.php né php/config.example.php: impossibile servire.');
    process.exit(1);
  }
  let cfg = fs.readFileSync(examplePath, 'utf8');
  // Forza ambiente dev: la cheatboard resta innocua e nessun host di prod è coinvolto.
  cfg = cfg.replace(/"instanceName"\s*=>\s*"[^"]*"/, '"instanceName" => "dev"');
  fs.writeFileSync(configPath, cfg);
  console.log('[e2e-server] php/config.php creato da example (instanceName=dev).');
}

// --- 2. Avvia il server PHP built-in con docroot = root del repo ---
console.log(`[e2e-server] avvio ${PHP_BIN} -S ${HOST}:${PORT} (docroot ${ROOT})`);
const php = spawn(PHP_BIN, ['-S', `${HOST}:${PORT}`, '-t', ROOT], {
  cwd: ROOT,
  stdio: 'inherit',
});

php.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(
      `[e2e-server] PHP non trovato ("${PHP_BIN}"). Imposta PHP_BIN al percorso del php.exe ` +
      '(es. MAMP: C:/MAMP/bin/php/php8.3.1/php.exe) o mettilo su PATH.',
    );
  } else {
    console.error('[e2e-server] errore avvio PHP:', err);
  }
  process.exit(1);
});

// Propaga la terminazione (Playwright manda SIGTERM allo spegnimento del webServer).
const shutdown = () => { try { php.kill(); } catch (_) {} process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
php.on('exit', (code) => process.exit(code ?? 0));
