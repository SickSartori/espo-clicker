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

// Read package.json
const pkgPath = path.join(__dirname, 'package.json');
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

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ package.json');

// Update version-config.js
const versionConfigPath = path.join(__dirname, 'js', 'version-config.js');
let versionConfig = fs.readFileSync(versionConfigPath, 'utf8');
versionConfig = versionConfig.replace(/major: \d+/, `major: ${newMajor}`);
versionConfig = versionConfig.replace(/minor: \d+/, `minor: ${newMinor}`);
fs.writeFileSync(versionConfigPath, versionConfig);
console.log('✓ version-config.js');

// Update sw.js
const swPath = path.join(__dirname, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/Service Worker v[\d.]+/, `Service Worker v${newVersion}`);
sw = sw.replace(/const CACHE_VERSION = '[^']*'/, `const CACHE_VERSION = 'espo-v${newVersion}'`);
fs.writeFileSync(swPath, sw);
console.log('✓ sw.js');

console.log(`\n✨ Version bumped to ${newVersion}`);
console.log('Run: npm run build');
