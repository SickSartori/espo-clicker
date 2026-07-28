#!/usr/bin/env node
/**
 * Bump version in all files (package.json, version-config.js, sw.js)
 * Usage: node bump-version.js [major|minor|patch]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const type = args[0] || 'patch';

if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: node bump-version.js [major|minor|patch]');
    process.exit(1);
}

// Lo script vive in scripts/: ogni path va risolto dalla root del repo, non da __dirname
const ROOT = path.join(__dirname, '..');

// Sostituzione che fallisce forte se la regex non aggancia nulla: un replace() a
// vuoto lascerebbe il file indietro rispetto a package.json senza dirlo a nessuno
function replaceOrFail(content, regex, replacement, label) {
    if (!regex.test(content)) {
        console.error(`✗ ${label}: pattern non trovato (${regex}) — file cambiato di formato? Bump annullato.`);
        process.exit(1);
    }
    return content.replace(regex, replacement);
}

// Read package.json
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let newMajor = major, newMinor = minor, newPatch = patch;

if (type === 'major') {
    newMajor++;
    newMinor = 0;
    newPatch = 0;
} else if (type === 'minor') {
    newMinor++;
    newPatch = 0;
} else {
    newPatch++;
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
console.log(`📦 Bump: ${pkg.version} → ${newVersion}`);

// Prima si calcola e valida tutto, poi si scrive: se un file manca o ha cambiato
// formato lo script esce senza aver lasciato mezzo repo bumpato e mezzo no
const writes = [];

// package.json
pkg.version = newVersion;
writes.push([pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'package.json']);

// src/lib/version.ts (ex js/version-config.js — reorg C-thin: la prima
// occorrenza di major:/minor: nel file è GAME_VERSION, come nel legacy)
const versionConfigPath = path.join(ROOT, 'src', 'lib', 'version.ts');
let versionConfig = fs.readFileSync(versionConfigPath, 'utf8');
versionConfig = replaceOrFail(versionConfig, /major: \d+/, `major: ${newMajor}`, 'src/lib/version.ts');
versionConfig = replaceOrFail(versionConfig, /minor: \d+/, `minor: ${newMinor}`, 'src/lib/version.ts');
writes.push([versionConfigPath, versionConfig, 'src/lib/version.ts']);

// sw.js
const swPath = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = replaceOrFail(sw, /Service Worker v[\d.]+/, `Service Worker v${newVersion}`, 'sw.js');
sw = replaceOrFail(sw, /const CACHE_VERSION = '[^']*'/, `const CACHE_VERSION = 'espo-v${newVersion}'`, 'sw.js');
writes.push([swPath, sw, 'sw.js']);

// php/config.php (devVersion + prodVersion → cacheVer per asset busting).
// config.php e' tracciato: se manca il repo e' incompleto, non e' un caso da ignorare
const phpConfigPath = path.join(ROOT, 'php', 'config.php');
if (!fs.existsSync(phpConfigPath)) {
    console.error(`✗ php/config.php non trovato (${phpConfigPath}) — cache non invalidata, bump annullato.`);
    console.error('  Ricrealo da php/config.example.php e rilancia.');
    process.exit(1);
}
let phpConfig = fs.readFileSync(phpConfigPath, 'utf8');
phpConfig = replaceOrFail(phpConfig, /"devVersion"\s*=>\s*"[^"]*"/, `"devVersion" => "${newVersion}"`, 'php/config.php');
phpConfig = replaceOrFail(phpConfig, /"prodVersion"\s*=>\s*"[^"]*"/, `"prodVersion" => "${newVersion}"`, 'php/config.php');
writes.push([phpConfigPath, phpConfig, 'php/config.php (dev + prod version)']);

for (const [target, content, label] of writes) {
    fs.writeFileSync(target, content);
    console.log(`✓ ${label}`);
}

console.log(`\n✨ Version bumped to ${newVersion}`);
console.log('Cache invalidata: sw.js + php/config.php');
console.log('Build automatica via npm script chain.');
