/* ===================================================================
   Intro Login -> Gioco ("Debug -> Deploy")
   window.EspoIntro.play({ username, onReveal, onComplete, reducedMotion })
   Overlay cinematico ~6s mostrato dopo il login esplicito (modals.js).
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
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      return (t || 'BENTORNATO') + ', ' + escHtml(String(username).toUpperCase());
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
    var con = el('div', 'intro-con');
    stage.appendChild(con);

    var cmd = '$ espo deploy --user "' + escHtml(username) + '"';
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
      sfx('sound-intro-glitch');
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

  window.EspoIntro = { play: play };
})();
