# Intro Login → Gioco ("Debug → Deploy") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un overlay cinematico ~4,6s (glitch→fixed→deploy→logo/HUD) mostrato dopo il login esplicito, in stile col gioco e saltabile.

**Architecture:** Feature auto-contenuta. Un controller globale `window.EspoIntro` (in `js/intro.js`) inietta da sé un overlay full-screen, esegue una timeline a step, gestisce skip/reduced-motion/SFX, ed espone callback `onReveal` (avvio musica) e `onComplete` (modali post-login). Stile isolato in `css/intro.css`. L'aggancio è una sostituzione localizzata nella coda di `handleLogin()` in `js/modals.js`.

**Tech Stack:** Vanilla JS (globali `window.*`, niente moduli), canvas 2D, CSS transitions/keyframes, esbuild (concat+minify via `build.js`), audio via `playSound()`/Howler già presenti.

---

## Note sul testing (leggere prima di iniziare)

Il progetto **non ha un framework di unit test JS** (nessun jest/vitest/mocha; gli unici script npm sono `build*`). Introdurre jsdom+canvas-mock per testare un'animazione sarebbe infrastruttura non correlata → **fuori scope**, coerente con il fatto che il codebase non ne ha.

**Verifica di ogni task = due gate concreti:**
1. **Build gate:** `npm run build` deve completare senza errori (esbuild fallisce su JS rotto).
2. **Behavioral gate:** controllo nel **preview harness `espo-harness` (porta 8765)** con `preview_eval` (gli screenshot sono inaffidabili col game-loop attivo → usare controlli geometrici/di stato). Ogni task elenca i `preview_eval` attesi con il risultato atteso.

Assicurarsi che il server preview sia attivo (`preview_list` / `preview_start`) e, dopo ogni build, ricaricare con `preview_eval: window.location.reload()`.

---

## File Structure

| File | Responsabilità |
|------|----------------|
| `js/intro.js` (nuovo) | Controller `window.EspoIntro`: overlay, timeline, skip, reduced-motion, SFX, callback. |
| `css/intro.css` (nuovo) | Stile overlay, stati (`intro-glitching`, `intro-out`), keyframe, brackets, scanner, logo, skip. |
| `css/main.css` (modifica) | `@import './intro.css';` in coda. |
| `build.js` (modifica) | `'js/intro.js'` in `JS_FILES`, prima di `'js/script.js'`. |
| `js/data/texts.js` (modifica) | chiave `ui.introWelcome: "BENTORNATO"`. |
| `js/data-en/texts.js` (modifica) | chiave `ui.introWelcome: "WELCOME"`. |
| `js/modals.js` (modifica) | `handleLogin()`: coda post-login → `EspoIntro.play({...})` + fallback; toast benvenuto rimosso. |

`window.EspoIntro` API:
```js
window.EspoIntro.play({
  username,      // string
  onReveal,      // fn: chiamata al beat reveal (~3,45s) e/o allo skip → avvia musica
  onComplete,    // fn: chiamata a fine sequenza/skip (una sola volta) → modali post-login
  reducedMotion  // bool opzionale (default: matchMedia prefers-reduced-motion)
});
```

---

## Task 1: Scaffolding — overlay, reduced/minimal path, skip, build wiring

Crea `css/intro.css`, `js/intro.js` (con overlay + path minimale che mostra logo+benvenuto e chiama i callback), importa il CSS, registra il JS nel bundle. Risultato: `EspoIntro.play()` funziona end-to-end in versione minima (è anche la versione reduced-motion).

**Files:**
- Create: `css/intro.css`
- Create: `js/intro.js`
- Modify: `css/main.css:17`
- Modify: `build.js:60-61`

- [ ] **Step 1: Crea `css/intro.css`**

```css
/* ===================================================================
   Intro Login -> Gioco ("Debug -> Deploy")
   Overlay cinematico mostrato da js/intro.js dopo il login esplicito.
   =================================================================== */
#login-intro {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: var(--v3-bg-void, #050810);
  font-family: var(--v3-font-mono, 'JetBrains Mono', monospace);
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.5s ease;
}
#login-intro.intro-out { opacity: 0; }

#login-intro .intro-rain { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.85; }
#login-intro .intro-stage {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 24px; z-index: 4;
}
#login-intro .intro-con { width: 100%; max-width: 460px; text-align: left; font-size: 14px; line-height: 1.8; color: #9fb3c8; }
#login-intro .intro-con .ok { color: #3ef2a1; }
#login-intro .intro-con .cy { color: var(--v3-accent-cyan, #00d9ff); }
#login-intro .intro-con .rd { color: var(--v3-accent-red, #ff3d5c); }
#login-intro .intro-con .mu { color: #5b6b7e; }
#login-intro .intro-cursor {
  display: inline-block; width: 9px; height: 16px;
  background: var(--v3-accent-cyan, #00d9ff); vertical-align: -2px;
  animation: intro-blink 1s steps(1) infinite;
}
@keyframes intro-blink { 50% { opacity: 0; } }
#login-intro .intro-pbar { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; margin: 4px 0; }
#login-intro .intro-pfill { height: 100%; width: 0; background: linear-gradient(90deg, var(--v3-accent-cyan, #00d9ff), #3ef2a1); transition: width 0.9s linear; }

#login-intro.intro-glitching .intro-stage { animation: intro-jit 0.22s steps(2) infinite; }
@keyframes intro-jit {
  0%{transform:translate(0,0)}20%{transform:translate(-3px,1px)}40%{transform:translate(2px,-2px)}
  60%{transform:translate(-2px,2px)}80%{transform:translate(3px,0)}100%{transform:translate(1px,1px)}
}
#login-intro .intro-err { border: 1px solid rgba(255,61,92,0.5); background: rgba(255,61,92,0.07); border-radius: 6px; padding: 16px 20px; text-align: left; }
#login-intro .intro-err .h { color: var(--v3-accent-red,#ff3d5c); font-weight:700; font-size:15px; letter-spacing:1px; margin-bottom:8px; }
#login-intro .intro-err .l { color:#ff9aa9; font-size:13px; line-height:1.9; opacity:0.85; }
#login-intro.intro-glitching .intro-err { text-shadow: 2px 0 rgba(255,61,92,0.7), -2px 0 rgba(0,217,255,0.7); }
#login-intro .intro-glitch-word { position:absolute; opacity:0.5; z-index:2; pointer-events:none; }

#login-intro .intro-scan { position:absolute; left:0; right:0; top:-8px; height:4px; background: var(--v3-accent-cyan,#00d9ff); box-shadow: 0 0 20px 5px rgba(0,217,255,0.8); opacity:0; z-index:7; }
#login-intro .intro-scan.go { opacity:1; transition: top 0.85s linear; }

#login-intro .intro-brk { position:absolute; width:40px; height:40px; border:2px solid var(--v3-accent-red,#ff3d5c); opacity:0; z-index:6; transition: all 0.5s cubic-bezier(0.34,1.56,0.64,1); }
#login-intro .intro-brk.tl{top:24px;left:24px;border-right:0;border-bottom:0;transform:translate(-12px,-12px)}
#login-intro .intro-brk.tr{top:24px;right:24px;border-left:0;border-bottom:0;transform:translate(12px,-12px)}
#login-intro .intro-brk.bl{bottom:24px;left:24px;border-right:0;border-top:0;transform:translate(-12px,12px)}
#login-intro .intro-brk.br{bottom:24px;right:24px;border-left:0;border-top:0;transform:translate(12px,12px)}
#login-intro .intro-brk.in{opacity:0.9;transform:translate(0,0)}

#login-intro .intro-logo { opacity:0; transform: scale(0.82); transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1); display:flex; flex-direction:column; align-items:center; gap:14px; }
#login-intro .intro-logo.in { opacity:1; transform: scale(1); }
#login-intro .intro-logo img { width: min(46vw, 320px); height:auto; filter: drop-shadow(0 0 26px rgba(0,217,255,0.5)); }
#login-intro .intro-sub { font-size: clamp(13px, 1.6vw, 16px); letter-spacing: 6px; color: var(--v3-accent-cyan,#00d9ff); text-transform: uppercase; text-shadow: 0 0 12px rgba(0,217,255,0.5); }

#login-intro .intro-flash { position:absolute; inset:0; background:#eaffff; opacity:0; transition: opacity 0.14s ease; pointer-events:none; z-index:9; }

#login-intro .intro-skip { position:absolute; right:20px; bottom:18px; z-index:10; font-family: var(--v3-font-mono,'JetBrains Mono',monospace); font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#7f93a8; background:rgba(255,255,255,0.04); border:1px solid rgba(0,217,255,0.2); border-radius:6px; padding:8px 14px; cursor:pointer; opacity:0; transition: opacity 0.4s ease, color 0.15s, border-color 0.15s; }
#login-intro .intro-skip.show { opacity:1; }
#login-intro .intro-skip:hover { color:#fff; border-color: var(--v3-accent-cyan,#00d9ff); }

@media (prefers-reduced-motion: reduce) {
  #login-intro.intro-glitching .intro-stage { animation: none; }
  #login-intro .intro-cursor { animation: none; }
}
```

- [ ] **Step 2: Crea `js/intro.js`** (scaffold completo: overlay, helper condivisi, skip/cleanup, reduced/minimal path; il path "full" per ora rimanda anch'esso a `showLogo`+`finish`, verrà esteso nei task 2-3)

```js
/* ===================================================================
   Intro Login -> Gioco ("Debug -> Deploy")
   window.EspoIntro.play({ username, onReveal, onComplete, reducedMotion })
   Overlay cinematico ~4,6s mostrato dopo il login esplicito (modals.js).
   Stile in css/intro.css. Audio via playSound() (game-logic.js).
   =================================================================== */
(function () {
  'use strict';

  var GLYPHS = '01<>{}[]/\\|=+*$#abcdef';
  var running = false;

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function sfx(id) { try { if (typeof playSound === 'function') playSound(id); } catch (e) {} }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function buildOverlay() {
    var o = el('div');
    o.id = 'login-intro';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', 'Intro');
    o.appendChild(el('canvas', 'intro-rain'));
    ['tl', 'tr', 'bl', 'br'].forEach(function (p) { o.appendChild(el('div', 'intro-brk ' + p)); });
    o.appendChild(el('div', 'intro-scan'));
    o.appendChild(el('div', 'intro-stage'));
    o.appendChild(el('div', 'intro-flash'));
    var skip = el('button', 'intro-skip', 'Skip <i class="fa-solid fa-forward-step"></i>');
    skip.type = 'button';
    o.appendChild(skip);
    return o;
  }

  function startRain() { return function () {}; }

  function play(opts) {
    opts = opts || {};
    if (running) return;
    running = true;

    var username = (opts.username || 'PLAYER');
    var onReveal = typeof opts.onReveal === 'function' ? opts.onReveal : function () {};
    var onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : function () {};
    var reduced = (opts.reducedMotion != null) ? !!opts.reducedMotion : prefersReduced();

    var overlay = buildOverlay();
    document.body.appendChild(overlay);

    var stage = overlay.querySelector('.intro-stage');
    var canvas = overlay.querySelector('.intro-rain');
    var scan = overlay.querySelector('.intro-scan');
    var flash = overlay.querySelector('.intro-flash');
    var brackets = overlay.querySelectorAll('.intro-brk');
    var skipBtn = overlay.querySelector('.intro-skip');

    var timers = [], intervals = [], glitchInt = null;
    var stopRain = startRain(canvas, reduced);
    var revealed = false, finished = false, canSkip = false;

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
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
    function onKey(e) { if (canSkip && e.key === 'Escape') finish(); }

    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function () { if (canSkip) finish(); });
    at(500, function () { canSkip = true; });
    at(650, function () { skipBtn.classList.add('show'); });
    at(7000, finish); // safety net

    function welcomeText() {
      var t = null;
      try { t = gameData.texts.ui.introWelcome; } catch (e) {}
      return (t || 'BENTORNATO') + ', ' + String(username).toUpperCase();
    }
    function showLogo(sub) {
      stage.innerHTML = '';
      var logo = el('div', 'intro-logo');
      var img = el('img');
      img.src = 'assets/image/logo.svg';
      img.alt = 'Espò Clicker';
      logo.appendChild(img);
      logo.appendChild(el('div', 'intro-sub', sub));
      stage.appendChild(logo);
      void logo.offsetWidth;
      at(40, function () { logo.classList.add('in'); });
      brackets.forEach(function (b) { b.classList.add('in'); });
    }

    // expose for verification/debug
    play._finish = finish;

    if (reduced) {
      doFlash();
      showLogo(welcomeText());
      at(300, doReveal);
      at(1200, finish);
      return;
    }

    // ---- FULL timeline (esteso nei task 2-3) ----
    doFlash();
    showLogo(welcomeText());
    at(300, doReveal);
    at(1600, finish);
  }

  window.EspoIntro = { play: play };
})();
```

- [ ] **Step 3: Importa il CSS — `css/main.css`**, aggiungi in coda (dopo riga 16):

```css
@import './podio.css';

/* Intro login -> gioco */
@import './intro.css';
```

- [ ] **Step 4: Registra il JS — `build.js`**, in `JS_FILES` inserisci `js/intro.js` subito prima di `js/script.js`:

```js
  // Arcade lazy loader
  'js/arcade-loader.js',

  // Intro login -> gioco (window.EspoIntro)
  'js/intro.js',

  // Main (deve essere ultimo)
  'js/script.js',
];
```

- [ ] **Step 5: Build**

Run: `npm run build`
Atteso: completa senza errori; stampa `✓ dist/game.bundle.min.js (...)` e `✓ dist/styles.bundle.min.css (...)`.

- [ ] **Step 6: Verifica nel preview** (server `espo-harness` attivo; `preview_eval: window.location.reload()` dopo la build)

`preview_eval`:
```js
typeof window.EspoIntro && typeof window.EspoIntro.play
```
Atteso: `"function"` (controllo: `EspoIntro` esiste nel bundle).

`preview_eval` (esegue il path minimo e verifica overlay + callback):
```js
(function(){ window.__r=0; window.__c=0;
  EspoIntro.play({username:'Mario', reducedMotion:true,
    onReveal:function(){window.__r++}, onComplete:function(){window.__c++}});
  return document.getElementById('login-intro') ? 'overlay-ok' : 'no-overlay'; })()
```
Atteso: `"overlay-ok"`.

`preview_eval` dopo ~1,8s:
```js
({reveal: window.__r, complete: window.__c, overlay: !!document.getElementById('login-intro')})
```
Atteso: `{reveal:1, complete:1, overlay:false}` (callback chiamati una volta, overlay rimosso).

- [ ] **Step 7: Commit**

```bash
git add css/intro.css js/intro.js css/main.css build.js dist/game.bundle.min.js dist/styles.bundle.min.css
git commit -m "feat(intro): scaffold overlay intro login->gioco + path minimale/reduced

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Pioggia matrix (canvas)

Sostituisce lo stub `startRain` con l'implementazione canvas reale (rAF, stop pulito).

**Files:**
- Modify: `js/intro.js` (funzione `startRain`)

- [ ] **Step 1: Sostituisci la funzione `startRain`** (lo stub `function startRain() { return function () {}; }`) con:

```js
  function startRain(canvas, reduced) {
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return function () {};
    canvas.width = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
    var cols = Math.max(8, Math.floor(canvas.width / 14));
    var drops = [];
    for (var i = 0; i < cols; i++) drops[i] = Math.random() * canvas.height;
    var raf = null, stopped = false;
    function frame() {
      if (stopped) return;
      ctx.fillStyle = 'rgba(5,8,16,0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '13px monospace';
      for (var i = 0; i < cols; i++) {
        var ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx.fillStyle = Math.random() < 0.07 ? 'rgba(0,217,255,0.5)' : 'rgba(0,140,170,0.16)';
        ctx.fillText(ch, i * 14, drops[i]);
        if (drops[i] > canvas.height && Math.random() > 0.975) drops[i] = 0;
        else drops[i] += reduced ? 6 : 14;
      }
      raf = requestAnimationFrame(frame);
    }
    if (reduced) { ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    else { frame(); }
    return function stop() { stopped = true; if (raf) cancelAnimationFrame(raf); };
  }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Atteso: nessun errore.

- [ ] **Step 3: Verifica nel preview** (`preview_eval: window.location.reload()` prima)

`preview_eval` (avvia in modalità NON reduced e verifica che il canvas stia disegnando):
```js
(function(){ EspoIntro.play({username:'Mario',
    onReveal:function(){}, onComplete:function(){}});
  var c=document.querySelector('#login-intro .intro-rain');
  return c ? (c.width>0 && c.height>0 ? 'canvas-sized' : 'zero-size') : 'no-canvas'; })()
```
Atteso: `"canvas-sized"`.

`preview_eval` dopo ~5s (la sequenza minima finisce e pulisce):
```js
!!document.getElementById('login-intro')
```
Atteso: `false` (overlay rimosso → nessun rAF orfano).

- [ ] **Step 4: Commit**

```bash
git add js/intro.js dist/game.bundle.min.js
git commit -m "feat(intro): pioggia matrix su canvas con stop pulito

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Timeline completa — deploy log, glitch, scanner, reveal + SFX

Estende il path "full" con tutta la sequenza cinematica e gli effetti sonori.

**Files:**
- Modify: `js/intro.js` (blocco `// ---- FULL timeline ----`)

- [ ] **Step 1: Sostituisci il blocco** che va da `// ---- FULL timeline (esteso nei task 2-3) ----` fino alla fine della funzione `play` (le 4 righe `doFlash(); showLogo(...); at(300, doReveal); at(1600, finish);`) con questo blocco completo:

```js
    // ---- FULL timeline (~4,6s) ----
    var con = el('div', 'intro-con');
    stage.appendChild(con);

    var cmd = '$ espo deploy --user "' + username + '"';
    var ci = 0;
    var typeInt = setInterval(function () {
      ci++;
      con.innerHTML = '<div><span class="cy">' + cmd.slice(0, ci) + '</span><span class="intro-cursor"></span></div>';
      if (ci >= cmd.length) clearInterval(typeInt);
    }, 34);
    intervals.push(typeInt);

    function addLine(html) { con.appendChild(el('div', null, html)); }

    at(700, function () { addLine('<span class="ok">[OK]</span> <span class="mu">auth token verified</span>'); });
    at(1050, function () { addLine('<span class="cy">[..]</span> <span class="mu">mounting workspace</span>'); });
    at(1350, function () {
      var d = el('div', null, '<span class="mu">compiling bug-core</span><div class="intro-pbar"><div class="intro-pfill"></div></div>');
      con.appendChild(d);
      var pf = d.querySelector('.intro-pfill');
      at(40, function () { if (pf) pf.style.width = '100%'; });
    });

    // GLITCH
    at(1650, function () {
      con.innerHTML = '';
      overlay.classList.add('intro-glitching');
      stage.appendChild(el('div', 'intro-err',
        '<div class="h">[!!] SYSTEM INTEGRITY :: 0xBUG</div>' +
        '<div class="l">SEGFAULT at 0x00E5P0<br>NULLPTR :: espo.core.js<br>STACK OVERFLOW // bugs++</div>'));
      sfx('sound-error');
      var words = ['SEGFAULT', '0xBUG', 'NULL', 'PANIC', 'bugs++', '0xDEAD'];
      glitchInt = setInterval(function () {
        var s = el('span', 'intro-glitch-word', words[Math.floor(Math.random() * words.length)]);
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
      var gw = stage.querySelectorAll('.intro-glitch-word');
      for (var i = 0; i < gw.length; i++) { if (gw[i].parentNode) gw[i].parentNode.removeChild(gw[i]); }
      scan.classList.add('go');
      at(30, function () { scan.style.top = 'calc(100% + 8px)'; });
    });
    at(3050, function () {
      stage.innerHTML = '<div class="intro-con" style="text-align:center"><span class="ok" style="font-size:16px;font-weight:700;letter-spacing:1px">[OK] ALL BUGS FIXED</span></div>';
      sfx('sound-achievement');
    });

    // REVEAL logo + HUD + avvio musica
    at(3450, function () {
      doFlash();
      showLogo(welcomeText());
      sfx('sound-prestige');
      doReveal();
    });

    // HANDOFF
    at(4500, finish);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Atteso: nessun errore.

- [ ] **Step 3: Verifica nel preview** (`preview_eval: window.location.reload()` prima)

`preview_eval` (avvia, poi campiona gli stati nel tempo):
```js
(function(){ window.__states=[];
  EspoIntro.play({username:'Mario', onReveal:function(){window.__states.push('reveal')}, onComplete:function(){window.__states.push('complete')}});
  [1900, 2700, 3600].forEach(function(t){ setTimeout(function(){
    var o=document.getElementById('login-intro');
    window.__states.push(t+':'+(o?(o.classList.contains('intro-glitching')?'glitch':(o.querySelector('.intro-logo')?'logo':'log')):'gone'));
  }, t); });
  return 'sampling'; })()
```
Atteso: `"sampling"`.

`preview_eval` dopo ~5,5s:
```js
window.__states
```
Atteso: contiene nell'ordine ~ `"1900:glitch"`, `"2700:log"`/`"2700:..."` (post-glitch), `"3600:logo"`, poi `"reveal"` e `"complete"` (reveal prima di complete).

`preview_eval`:
```js
!!document.getElementById('login-intro')
```
Atteso: `false` (overlay rimosso a fine sequenza).

- [ ] **Step 4: Verifica SFX** — durante una riproduzione, `preview_console_logs` non mostra errori audio; in alternativa `preview_eval` controlla che gli ID esistano:
```js
['sound-error','sound-achievement','sound-prestige'].map(function(id){
  return id+':'+(!!(window.gameData&&gameData.assets&&Object.values(gameData.assets.sounds).some(function(s){return s.id===id;}))); })
```
Atteso: tutti `:true`.

- [ ] **Step 5: Commit**

```bash
git add js/intro.js dist/game.bundle.min.js
git commit -m "feat(intro): timeline completa deploy->glitch->fixed->logo + SFX

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Stringa di benvenuto i18n (`ui.introWelcome`)

Aggiunge la chiave IT/EN letta da `welcomeText()`. Modifiche minime e localizzate (coordinare col traduttore: è un solo campo in coda all'oggetto `ui`).

**Files:**
- Modify: `js/data/texts.js` (oggetto `ui`)
- Modify: `js/data-en/texts.js` (oggetto `ui`)

- [ ] **Step 1: `js/data/texts.js`** — aggiungi `introWelcome` dopo `audioOff`. Sostituisci:

```js
        audioOn: "Attiva audio",
        audioOff: "Disattiva audio"
    },
```
con:
```js
        audioOn: "Attiva audio",
        audioOff: "Disattiva audio",
        introWelcome: "BENTORNATO"
    },
```

- [ ] **Step 2: `js/data-en/texts.js`** — aggiungi `introWelcome` dopo `audioOff`. Sostituisci:

```js
        audioOn: "Enable audio",
        audioOff: "Mute audio"
    },
```
con:
```js
        audioOn: "Enable audio",
        audioOff: "Mute audio",
        introWelcome: "WELCOME"
    },
```

- [ ] **Step 3: Build**

Run: `npm run build`
Atteso: nessun errore.

- [ ] **Step 4: Verifica nel preview** (`preview_eval: window.location.reload()` prima)

`preview_eval`:
```js
gameData.texts.ui.introWelcome
```
Atteso: `"BENTORNATO"` (lingua IT) — o `"WELCOME"` se la sessione è in EN.

`preview_eval` (il logo mostra il testo composto):
```js
(function(){ EspoIntro.play({username:'Mario'});
  var s=document.querySelector('#login-intro .intro-sub');
  return s?s.textContent:'(reduced/no-sub yet)'; })()
```
Atteso: stringa che inizia con `BENTORNATO, MARIO` (o `WELCOME, MARIO`). Nota: in modalità non-reduced il sottotitolo compare al beat reveal (~3,45s); campionare dopo, oppure forzare `reducedMotion:true` per vederlo subito.

- [ ] **Step 5: Commit**

```bash
git add js/data/texts.js js/data-en/texts.js dist/game.bundle.min.js
git commit -m "feat(intro): chiave i18n ui.introWelcome (IT/EN)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Integrazione in `handleLogin()` (modals.js)

Sostituisce la coda del ramo success: avvio musica spostato in `onReveal`, modali post-login in `onComplete`, toast benvenuto rimosso, con fallback difensivo se `EspoIntro` è assente.

**Files:**
- Modify: `js/modals.js` (dentro `handleLogin`, ramo `data.status === 'success'`)

- [ ] **Step 1: Sostituisci** il blocco che va da `// 3. INFINE fai partire l'audio (ora che i volumi sono corretti)` fino alla fine del blocco `else if (window.shouldShowReleaseNotesOnLoad) { ... }`. Cerca:

```js
                // 3. INFINE fai partire l'audio (ora che i volumi sono corretti)
                Game.tryStartAudio();

                Game.showToast(gameData.texts.toasts.welcome + " " + u);

                // --- CONTROLLO MODALI POST-LOGIN (Migrazione V2 o Release Notes) ---
                if (window.triggerV2MigrationModal) {
                    setTimeout(() => {
                        showV2MigrationModal(() => {
                            window.triggerV2MigrationModal = false;
                            if (window.shouldShowReleaseNotesOnLoad && Game.openReleaseNotes) {
                                Game.openReleaseNotes();
                            }
                        });
                    }, 500);
                } else if (window.shouldShowReleaseNotesOnLoad) {
                    setTimeout(() => {
                        if (Game.openReleaseNotes) Game.openReleaseNotes();
                    }, 500);
                }
```
Sostituisci con:

```js
                // --- INTRO CINEMATICA (login -> gioco) ---
                // L'audio (musica) parte al beat "reveal" via onReveal; i modali
                // post-login (V2 / release notes) partono a fine intro via onComplete.
                // Il toast "Benvenuto" e' rimosso: lo dice gia' l'intro.
                const runPostLogin = () => {
                    if (window.triggerV2MigrationModal) {
                        showV2MigrationModal(() => {
                            window.triggerV2MigrationModal = false;
                            if (window.shouldShowReleaseNotesOnLoad && Game.openReleaseNotes) {
                                Game.openReleaseNotes();
                            }
                        });
                    } else if (window.shouldShowReleaseNotesOnLoad) {
                        if (Game.openReleaseNotes) Game.openReleaseNotes();
                    }
                };

                if (window.EspoIntro && typeof window.EspoIntro.play === 'function') {
                    window.EspoIntro.play({
                        username: u,
                        onReveal: () => Game.tryStartAudio(),
                        onComplete: runPostLogin
                    });
                } else {
                    // Fallback difensivo: comportamento ~ a prima dell'intro
                    Game.tryStartAudio();
                    runPostLogin();
                }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Atteso: nessun errore.

- [ ] **Step 3: Verifica nel preview — flusso reale di login** (`preview_eval: window.location.reload()` prima)

Se serve, prima esegui logout/clear sessione per avere il modale login:
```js
sessionStorage.clear(); window.location.reload();
```
Poi compila e invia il login via UI (`preview_fill` su `#login-username`/`#login-password` reali — verificarne gli id con `preview_snapshot` — e `preview_click` sul bottone login). Subito dopo l'invio:

`preview_eval`:
```js
!!document.getElementById('login-intro')
```
Atteso: `true` (l'intro parte dopo il login riuscito).

`preview_eval` dopo ~6s:
```js
({ intro: !!document.getElementById('login-intro'),
   loginModalOpen: (function(){var m=document.getElementById('login-modal'); return m? getComputedStyle(m).display:'n/a';}) ()})
```
Atteso: `intro:false` (intro finita) e nessun modale login visibile; il gioco è interattivo dietro.

`preview_console_logs`: nessun errore.

- [ ] **Step 4: Verifica "no intro su F5"** — con sessione attiva, ricarica:
```js
window.location.reload()
```
`preview_eval` subito dopo il boot (loader finito):
```js
!!document.getElementById('login-intro')
```
Atteso: `false` (l'intro NON parte al refresh; solo `initializeGame` gestisce la sessione attiva).

- [ ] **Step 5: Commit**

```bash
git add js/modals.js dist/game.bundle.min.js
git commit -m "feat(intro): aggancio in handleLogin (musica onReveal, modali onComplete, no toast)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (esito)

**1. Copertura spec:**
- Quando/Durata/Direzione/Audio (spec §2,§4,§7) → Task 1 (path+skip), 2 (rain), 3 (timeline+SFX+reveal). ✓
- Architettura overlay auto-iniettato + API (§3) → Task 1. ✓
- Integrazione `handleLogin` + onReveal/onComplete + fallback + no toast (§5) → Task 5. ✓
- Skip / reduced-motion / safety timeout (§6) → Task 1. ✓
- i18n welcome (§6) → Task 4. ✓
- "No intro su F5" (§2) → verificato in Task 5 Step 4. ✓
- File toccati (§8) → coincidono con la File Structure. ✓

**2. Placeholder scan:** nessun TBD/TODO; ogni step ha codice/comando completo e output atteso. ✓

**3. Coerenza tipi/nomi:** `EspoIntro.play({username,onReveal,onComplete,reducedMotion})`, `startRain(canvas,reduced)`, `welcomeText()`, `showLogo(sub)`, `clearAll()`, classi CSS (`intro-glitching`, `intro-out`, `intro-brk`, `intro-scan`, `intro-pfill`), chiave `gameData.texts.ui.introWelcome` — usati in modo identico tra task. ✓

**Nota di sequencing:** Task 3 sostituisce *esattamente* le 4 righe del path full introdotte in Task 1 Step 2 (`doFlash(); showLogo(welcomeText()); at(300, doReveal); at(1600, finish);`). Eseguire i task in ordine.
