/**
 * Intro Login -> Gioco ("Debug -> Deploy")
 * window.EspoIntro.play({ username, onReveal, onComplete, reducedMotion })
 * Overlay cinematico ~6s mostrato dopo il login esplicito (modals.js).
 * Stile in css/intro.css. Audio via AudioManager (game-logic.js).
 *
 * Migrato da js/intro.js (IIFE classic script) a modulo ESM — kill-legacy periferici.
 * Nessun accesso top-level a gameState/gameData/AudioManager (letti solo dentro le
 * funzioni, dopo il boot) → import side-effect sicuro. I riferimenti a global legacy
 * passano da `window.*` (alias `w`) perché un modulo strict non li vede.
 */
import { store } from '../state/store';

const w = window as any;

const GLYPHS = '01<>{}[]/\\|=+*$#abcdef';
let running = false;

function prefersReduced() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
// Livelli FISSI di design degli SFX intro (master*sfx*livello), indipendenti dal
// mixer per-suono (audioCustom): cosi' sono coerenti per tutti e non escono troppo
// alti quando audioCustom non e' impostato (che darebbe volume pieno).
const SFX_LEVEL: Record<string, number> = {
  'sound-intro-typing': 0.26,
  'sound-intro-glitch': 0.32,
  'sound-intro-scan': 0.26,
  'sound-intro-fixed': 0.30,
  'sound-intro-reveal': 0.38
};
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
function el(tag: string, cls?: string | null, html?: string | null) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function escHtml(s: any) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildOverlay() {
  const o = el('div');
  o.id = 'login-intro';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-label', 'Intro');
  o.appendChild(el('canvas', 'intro-rain'));
  ['tl', 'tr', 'bl', 'br'].forEach(function (p) { o.appendChild(el('div', 'intro-brk ' + p)); });
  o.appendChild(el('div', 'intro-scan'));
  o.appendChild(el('div', 'intro-stage'));
  o.appendChild(el('div', 'intro-flash'));
  const skip = el('button', 'intro-skip', 'Skip <i class="fa-solid fa-forward-step"></i>');
  (skip as HTMLButtonElement).type = 'button';
  o.appendChild(skip);
  return o;
}

function startRain(canvas: any, reduced: any) {
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return function () {};
  canvas.width = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  canvas.height = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  const cols = Math.max(8, Math.floor(canvas.width / 14));
  const drops: number[] = [];
  for (let i = 0; i < cols; i++) drops[i] = Math.random() * canvas.height;
  let raf: any = null, stopped = false;
  function frame() {
    if (stopped) return;
    ctx.fillStyle = 'rgba(5,8,16,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '13px monospace';
    for (let i = 0; i < cols; i++) {
      const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      ctx.fillStyle = Math.random() < 0.07 ? 'rgba(0,217,255,0.5)' : 'rgba(0,140,170,0.16)';
      ctx.fillText(ch, i * 14, drops[i]!);
      if (drops[i]! > canvas.height && Math.random() > 0.975) drops[i] = 0;
      else drops[i] = drops[i]! + (reduced ? 6 : 14);
    }
    raf = requestAnimationFrame(frame);
  }
  if (reduced) { ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  else { frame(); }
  return function stop() { stopped = true; if (raf) cancelAnimationFrame(raf); };
}

function play(opts?: any) {
  opts = opts || {};
  if (running) return;
  running = true;

  const username = (opts.username || 'PLAYER');
  const onReveal = typeof opts.onReveal === 'function' ? opts.onReveal : function () {};
  const onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : function () {};
  const reduced = (opts.reducedMotion != null) ? !!opts.reducedMotion : prefersReduced();

  const overlay = buildOverlay();
  document.body.appendChild(overlay);

  const stage = overlay.querySelector('.intro-stage') as HTMLElement;
  const canvas = overlay.querySelector('.intro-rain');
  const scan = overlay.querySelector('.intro-scan') as HTMLElement;
  const flash = overlay.querySelector('.intro-flash') as HTMLElement;
  const brackets = overlay.querySelectorAll('.intro-brk');
  const skipBtn = overlay.querySelector('.intro-skip') as HTMLElement;

  let timers: any[] = [], intervals: any[] = [], glitchInt: any = null;
  const stopRain = startRain(canvas, reduced);
  let revealed = false, finished = false, canSkip = false;

  function at(ms: number, fn: () => void) { timers.push(setTimeout(fn, ms)); }
  function clearAll() {
    timers.forEach(clearTimeout); timers = [];
    intervals.forEach(clearInterval); intervals = [];
    if (glitchInt) { clearInterval(glitchInt); glitchInt = null; }
  }
  function doFlash() { flash.style.opacity = '0.85'; at(140, function () { flash.style.opacity = '0'; }); }
  function doReveal() { if (revealed) return; revealed = true; try { onReveal(); } catch (e) {} }

  function cleanup() {
    clearAll();
    if (stopRain) stopRain();
    document.removeEventListener('keydown', onKey);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    running = false;
  }
  function finish() {
    if (finished) return;
    finished = true;
    clearAll();
    doReveal();
    overlay.classList.add('intro-out');
    setTimeout(function () { try { onComplete(); } catch (e) {} cleanup(); }, 520);
  }
  function onKey(e: KeyboardEvent) { if (canSkip && e.key === 'Escape') finish(); }

  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', function () { if (canSkip) finish(); });
  at(500, function () { canSkip = true; });
  at(650, function () { skipBtn.classList.add('show'); });
  at(7000, finish); // safety net

  function welcomeText() {
    let t = null;
    try { t = store.gameData.texts.ui.introWelcome; } catch (e) {}
    return (t || 'BENTORNATO') + ', ' + escHtml(String(username).toUpperCase());
  }
  function showLogo(sub: string) {
    stage.innerHTML = '';
    const logo = el('div', 'intro-logo');
    const img = el('img') as HTMLImageElement;
    img.src = 'assets/image/logo.svg';
    img.alt = 'Espò Clicker';
    logo.appendChild(img);
    logo.appendChild(el('div', 'intro-sub', sub));
    stage.appendChild(logo);
    void logo.offsetWidth;
    at(40, function () { logo.classList.add('in'); });
    brackets.forEach(function (b, i) { at(i * 70, function () { b.classList.add('in'); }); });
  }

  if (reduced) {
    doFlash();
    showLogo(welcomeText());
    at(300, doReveal);
    at(1200, finish);
    return;
  }

  // ---- FULL timeline (~6s) ----
  const con = el('div', 'intro-con');
  stage.appendChild(con);
  sfx('sound-intro-typing');

  const cmd = '$ espo deploy --user "' + escHtml(username) + '"';
  let ci = 0;
  const typeInt = setInterval(function () {
    ci++;
    con.innerHTML = '<div><span class="cy">' + cmd.slice(0, ci) + '</span><span class="intro-cursor"></span></div>';
    if (ci >= cmd.length) clearInterval(typeInt);
  }, 34);
  intervals.push(typeInt);

  function addLine(html: string) { con.appendChild(el('div', null, html)); }

  at(700, function () { addLine('<span class="ok">[OK]</span> <span class="mu">auth token verified</span>'); });
  at(1050, function () { addLine('<span class="cy">[..]</span> <span class="mu">mounting workspace</span>'); });
  at(1350, function () {
    const d = el('div', null, '<span class="mu">compiling bug-core</span><div class="intro-pbar"><div class="intro-pfill"></div></div>');
    con.appendChild(d);
    const pf = d.querySelector('.intro-pfill') as HTMLElement | null;
    at(40, function () { if (pf) pf.style.width = '100%'; });
  });

  // GLITCH
  at(1650, function () {
    con.innerHTML = '';
    try { if (typeof w.AudioManager !== 'undefined') w.AudioManager.stop('sound-intro-typing', 120); } catch (e) {}
    overlay.classList.add('intro-glitching');
    stage.appendChild(el('div', 'intro-err',
      '<div class="h">[!!] SYSTEM INTEGRITY :: 0xBUG</div>' +
      '<div class="l">SEGFAULT at 0x00E5P0<br>NULLPTR :: espo.core.js<br>STACK OVERFLOW // bugs++</div>'));
    sfx('sound-intro-glitch');
    const words = ['SEGFAULT', '0xBUG', 'NULL', 'PANIC', 'bugs++', '0xDEAD'];
    glitchInt = setInterval(function () {
      const s = el('span', 'intro-glitch-word', words[Math.floor(Math.random() * words.length)]);
      s.style.color = Math.random() < 0.5 ? '#ff3d5c' : '#00d9ff';
      s.style.fontSize = (12 + Math.random() * 9) + 'px';
      s.style.left = (Math.random() * 80 + 5) + '%';
      s.style.top = (Math.random() * 80 + 5) + '%';
      stage.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 190);
    }, 90);
  });

  // DEBUG PASS / SCANNER
  at(2550, function () {
    overlay.classList.remove('intro-glitching');
    if (glitchInt) { clearInterval(glitchInt); glitchInt = null; }
    const gw = stage.querySelectorAll('.intro-glitch-word');
    for (let i = 0; i < gw.length; i++) { const node = gw[i]; if (node && node.parentNode) node.parentNode.removeChild(node); }
    scan.classList.add('go');
    void scan.offsetWidth;
    scan.style.top = 'calc(100% + 8px)';
    sfx('sound-intro-scan');
  });
  at(3050, function () {
    stage.innerHTML = '<div class="intro-con" style="text-align:center"><span class="ok" style="font-size:16px;font-weight:700;letter-spacing:1px">[OK] ALL BUGS FIXED</span></div>';
    sfx('sound-intro-fixed');
  });

  // REVEAL logo + HUD + avvio musica
  at(3450, function () {
    doFlash();
    showLogo(welcomeText());
    sfx('sound-intro-reveal');
    doReveal();
  });

  // HANDOFF — logo tenuto ~2s prima della dissolvenza
  at(5500, finish);
}

w.EspoIntro = { play: play };

export {};
