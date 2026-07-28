/**
 * Esposion — skin dinamica: Espo esplode progressivamente col combo.
 * window.EsposionFX (attiva solo se gameState.skins.current === 'esposion').
 *
 * 10 fasi guidate dal combo (soglie front-loaded fino a 250). L'art si
 * swappa a 3 punti (crepato/carbonizzato/boom), gli effetti CSS scalano
 * di continuo. Solo ESTETICO: non tocca nessun valore di gioco.
 * Hook: FX.registerClick() -> update()/decay() (game-logic.js),
 *       applySkinVisuals() -> start()/stop() (ui-functions.js).
 * Stile in css/esposion.css. SFX a livelli fissi (come l'intro).
 *
 * Migrato da js/esposion.js (IIFE classic script) a modulo ESM — kill-legacy periferici.
 * Nessun accesso top-level a gameState/gameData/AudioManager/FX (letti solo dentro le
 * funzioni, dopo il boot) → import side-effect sicuro. I riferimenti a global legacy
 * passano da `window.*` (alias `w`) perché un modulo strict non li vede.
 */
import { store } from '../../state/store';

const w = window as any;

// Soglie combo -> fase 1..10 (sotto la prima = fase 0, Espo integro).
const THRESHOLDS = [30, 60, 90, 120, 150, 180, 205, 225, 240, 250];

// Art per banda di fasi (sfondo trasparente, 512). Fase 0-2 = base.
const ART: Record<string, { n: string; c: string }> = {
  base: { n: 'assets/image/skins/espo.webp', c: 'assets/image/skins/espo-click.webp' },
  crepato: { n: 'assets/image/skins/esposion-crepato.webp', c: 'assets/image/skins/esposion-crepato-click.webp' },
  carbonizzato: { n: 'assets/image/skins/esposion-carbonizzato.webp', c: 'assets/image/skins/esposion-carbonizzato-click.webp' },
  boom: { n: 'assets/image/skins/esposion-boom.webp', c: 'assets/image/skins/esposion-boom-click.webp' }
};

// Livelli SFX FISSI (master*sfx*livello), indipendenti da audioCustom:
// coerenti per tutti e non escono troppo alti (stessa lezione dell'intro).
const SFX_LEVEL: Record<string, number> = {
  'sound-esposion-tick': 0.22,
  'sound-esposion-charge': 0.30,
  'sound-esposion-boom': 0.48,
  'sound-esposion-crackle': 0.18
};

let active = false;
let phase = 0;
let band = 'base';
let decayTimer: any = null;
let crackleOn = false;

function prefersReduced() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function btn() { return document.getElementById('clicker-btn'); }
function imgN() { return document.getElementById('manager-photo-normal') as HTMLImageElement | null; }
function imgC() { return document.getElementById('manager-photo-clicked') as HTMLImageElement | null; }

function phaseForCombo(c: number) {
  let p = 0;
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (c >= THRESHOLDS[i]!) p = i + 1; else break;
  }
  return p;
}
function artForPhase(p: number) {
  if (p >= 10) return 'boom';
  if (p >= 6) return 'carbonizzato';
  if (p >= 3) return 'crepato';
  return 'base';
}

function sfx(id: string) {
  try {
    if (typeof w.AudioManager === 'undefined' || typeof store.gameState === 'undefined') return;
    const h = w.AudioManager._sounds[id];
    if (!h) return;
    const base = (store.gameState.user.masterVolume || 0) * (store.gameState.user.sfxVolume || 0);
    const v = Math.max(0, Math.min(1, base * (SFX_LEVEL[id] != null ? SFX_LEVEL[id] : 0.3)));
    if (v < 0.01) return;
    h.volume(v);
    h.play();
  } catch (e) {}
}
function stopSfx(id: string) {
  try { if (typeof w.AudioManager !== 'undefined' && w.AudioManager.stop) w.AudioManager.stop(id, 200); } catch (e) {}
}

function flash(strength: number) {
  if (prefersReduced()) return;
  const b = btn(); if (!b) return;
  let f = b.querySelector('.esposion-flash') as HTMLElement | null;
  if (!f) { f = document.createElement('div'); f.className = 'esposion-flash'; b.appendChild(f); }
  f.style.opacity = String(Math.min(1, strength));
  clearTimeout((f as any)._t);
  (f as any)._t = setTimeout(function () { (f as HTMLElement).style.opacity = '0'; }, 130);
}

function setArt(b: string) {
  if (b === band) return;
  band = b;
  const a = ART[b]; if (!a) return;
  const n = imgN(), c = imgC();
  if (n) n.src = a.n;
  if (c) c.src = a.c;
  flash(0.45); // micro-flash che maschera lo swap
}

function setPhaseClass(p: number) {
  const b = btn(); if (!b) return;
  for (let i = 0; i <= 10; i++) b.classList.remove('esposion-p' + i);
  if (p < 10) b.classList.remove('esposion-detonate');
  b.classList.add('esposion-p' + p);
}

function manageCrackle(p: number) {
  const want = (p >= 6 && p < 10);
  if (want && !crackleOn) { crackleOn = true; sfx('sound-esposion-crackle'); }
  else if (!want && crackleOn) { crackleOn = false; stopSfx('sound-esposion-crackle'); }
}

function detonate() {
  const b = btn();
  if (b && !prefersReduced()) {
    b.classList.remove('esposion-detonate');
    void b.offsetWidth;
    b.classList.add('esposion-detonate');
  }
  sfx('sound-esposion-boom');
  try { if (typeof w.FX !== 'undefined' && w.FX.shake && !prefersReduced()) w.FX.shake(10, 0.25); } catch (e) {}
}

// Applica una fase. up=true solo quando il combo SALE (per SFX/detonazione).
function applyPhase(p: number, up: boolean) {
  setArt(artForPhase(p));
  setPhaseClass(p);
  manageCrackle(p);
  if (up) {
    if (p >= 10) detonate();
    else if (p === 8) sfx('sound-esposion-charge');
    else sfx('sound-esposion-tick');
  }
  phase = p;
}

function clearDecay() { if (decayTimer) { clearInterval(decayTimer); decayTimer = null; } }

// Discesa morbida (riassemblaggio ~0.6s): una fase ogni 70ms fino a 0.
function startDecay() {
  clearDecay();
  decayTimer = setInterval(function () {
    if (!active || phase <= 0) { clearDecay(); applyPhase(0, false); return; }
    applyPhase(phase - 1, false);
  }, 70);
}

const EsposionFX = {
  isActive: function () { return active; },

  start: function () {
    active = true;
    clearDecay();
    phase = 0; band = 'base';
    const b = btn();
    if (b) { b.classList.add('esposion-active'); }
    setPhaseClass(0);
  },

  stop: function () {
    active = false;
    clearDecay();
    if (crackleOn) { crackleOn = false; stopSfx('sound-esposion-crackle'); }
    const b = btn();
    if (b) {
      for (let i = 0; i <= 10; i++) b.classList.remove('esposion-p' + i);
      b.classList.remove('esposion-active', 'esposion-detonate');
      const f = b.querySelector('.esposion-flash') as HTMLElement | null;
      if (f) f.style.opacity = '0';
    }
    phase = 0; band = 'base';
  },

  // Chiamata a ogni click (combo SALE). Sale di fase quando supera una soglia.
  update: function (combo: number) {
    if (!active) return;
    const target = phaseForCombo(combo);
    if (target > phase) { clearDecay(); applyPhase(target, true); }
    // target <= phase: lascia che il decay gestisca la discesa (grazia ~0.6s)
  },

  // Combo spezzato: Espo si ricompone morbido invece di tornare integro di colpo.
  decay: function () {
    if (!active) return;
    if (phase > 0) startDecay();
  }
};

w.EsposionFX = EsposionFX;

export {};
