/* ===================================================================
   Esposion — skin dinamica: Espo esplode progressivamente col combo.
   window.EsposionFX (attiva solo se gameState.skins.current === 'esposion').

   10 fasi guidate dal combo (soglie front-loaded fino a 250). L'art si
   swappa a 3 punti (crepato/carbonizzato/boom), gli effetti CSS scalano
   di continuo. Solo ESTETICO: non tocca nessun valore di gioco.
   Hook: FX.registerClick() -> update()/decay() (game-logic.js),
         applySkinVisuals() -> start()/stop() (ui-functions.js).
   Stile in css/esposion.css. SFX a livelli fissi (come l'intro).
   =================================================================== */
(function () {
  'use strict';

  // Soglie combo -> fase 1..10 (sotto la prima = fase 0, Espo integro).
  var THRESHOLDS = [30, 60, 90, 120, 150, 180, 205, 225, 240, 250];

  // Art per banda di fasi (sfondo trasparente, 512). Fase 0-2 = base.
  var ART = {
    base:         { n: 'assets/image/skins/espo.webp',                  c: 'assets/image/skins/espo-click.webp' },
    crepato:      { n: 'assets/image/skins/esposion-crepato.webp',      c: 'assets/image/skins/esposion-crepato-click.webp' },
    carbonizzato: { n: 'assets/image/skins/esposion-carbonizzato.webp', c: 'assets/image/skins/esposion-carbonizzato-click.webp' },
    boom:         { n: 'assets/image/skins/esposion-boom.webp',         c: 'assets/image/skins/esposion-boom-click.webp' }
  };

  // Livelli SFX FISSI (master*sfx*livello), indipendenti da audioCustom:
  // coerenti per tutti e non escono troppo alti (stessa lezione dell'intro).
  var SFX_LEVEL = {
    'sound-esposion-tick':    0.22,
    'sound-esposion-charge':  0.30,
    'sound-esposion-boom':    0.48,
    'sound-esposion-crackle': 0.18
  };

  var active = false;
  var phase = 0;
  var band = 'base';
  var decayTimer = null;
  var crackleOn = false;

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function btn()  { return document.getElementById('clicker-btn'); }
  function imgN() { return document.getElementById('manager-photo-normal'); }
  function imgC() { return document.getElementById('manager-photo-clicked'); }

  function phaseForCombo(c) {
    var p = 0;
    for (var i = 0; i < THRESHOLDS.length; i++) {
      if (c >= THRESHOLDS[i]) p = i + 1; else break;
    }
    return p;
  }
  function artForPhase(p) {
    if (p >= 10) return 'boom';
    if (p >= 6) return 'carbonizzato';
    if (p >= 3) return 'crepato';
    return 'base';
  }

  function sfx(id) {
    try {
      if (typeof AudioManager === 'undefined' || typeof gameState === 'undefined') return;
      var h = AudioManager._sounds[id];
      if (!h) return;
      var base = (gameState.user.masterVolume || 0) * (gameState.user.sfxVolume || 0);
      var v = Math.max(0, Math.min(1, base * (SFX_LEVEL[id] != null ? SFX_LEVEL[id] : 0.3)));
      if (v < 0.01) return;
      h.volume(v);
      h.play();
    } catch (e) {}
  }
  function stopSfx(id) {
    try { if (typeof AudioManager !== 'undefined' && AudioManager.stop) AudioManager.stop(id, 200); } catch (e) {}
  }

  function flash(strength) {
    if (prefersReduced()) return;
    var b = btn(); if (!b) return;
    var f = b.querySelector('.esposion-flash');
    if (!f) { f = document.createElement('div'); f.className = 'esposion-flash'; b.appendChild(f); }
    f.style.opacity = String(Math.min(1, strength));
    clearTimeout(f._t);
    f._t = setTimeout(function () { f.style.opacity = '0'; }, 130);
  }

  function setArt(b) {
    if (b === band) return;
    band = b;
    var a = ART[b]; if (!a) return;
    var n = imgN(), c = imgC();
    if (n) n.src = a.n;
    if (c) c.src = a.c;
    flash(0.45); // micro-flash che maschera lo swap
  }

  function setPhaseClass(p) {
    var b = btn(); if (!b) return;
    for (var i = 0; i <= 10; i++) b.classList.remove('esposion-p' + i);
    if (p < 10) b.classList.remove('esposion-detonate');
    b.classList.add('esposion-p' + p);
  }

  function manageCrackle(p) {
    var want = (p >= 6 && p < 10);
    if (want && !crackleOn) { crackleOn = true; sfx('sound-esposion-crackle'); }
    else if (!want && crackleOn) { crackleOn = false; stopSfx('sound-esposion-crackle'); }
  }

  function detonate() {
    var b = btn();
    if (b && !prefersReduced()) {
      b.classList.remove('esposion-detonate');
      void b.offsetWidth;
      b.classList.add('esposion-detonate');
    }
    sfx('sound-esposion-boom');
    try { if (typeof FX !== 'undefined' && FX.shake && !prefersReduced()) FX.shake(10, 0.25); } catch (e) {}
  }

  // Applica una fase. up=true solo quando il combo SALE (per SFX/detonazione).
  function applyPhase(p, up) {
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

  var EsposionFX = {
    isActive: function () { return active; },

    start: function () {
      active = true;
      clearDecay();
      phase = 0; band = 'base';
      var b = btn();
      if (b) { b.classList.add('esposion-active'); }
      setPhaseClass(0);
    },

    stop: function () {
      active = false;
      clearDecay();
      if (crackleOn) { crackleOn = false; stopSfx('sound-esposion-crackle'); }
      var b = btn();
      if (b) {
        for (var i = 0; i <= 10; i++) b.classList.remove('esposion-p' + i);
        b.classList.remove('esposion-active', 'esposion-detonate');
        var f = b.querySelector('.esposion-flash');
        if (f) f.style.opacity = '0';
      }
      phase = 0; band = 'base';
    },

    // Chiamata a ogni click (combo SALE). Sale di fase quando supera una soglia.
    update: function (combo) {
      if (!active) return;
      var target = phaseForCombo(combo);
      if (target > phase) { clearDecay(); applyPhase(target, true); }
      // target <= phase: lascia che il decay gestisca la discesa (grazia ~0.6s)
    },

    // Combo spezzato: Espo si ricompone morbido invece di tornare integro di colpo.
    decay: function () {
      if (!active) return;
      if (phase > 0) startDecay();
    }
  };

  window.EsposionFX = EsposionFX;
})();
