/**
 * Clicker 3D parallax — mouse-follow tilt.
 *
 * Aggiorna CSS custom properties --tilt-x/--tilt-y sul #clicker-btn
 * in base alla posizione del mouse rispetto al centro del bottone.
 *
 * Listener throttled via rAF per non over-rendere.
 * Si auto-disattiva se prefers-reduced-motion = reduce.
 */

const MAX_TILT_DEG = 14; // ampiezza max tilt (più dramma)
const RESET_MS = 700;    // tempo per tornare a 0 quando mouse esce

let raf = 0;
let pendingX = 0;
let pendingY = 0;
let active = false;
let target: HTMLElement | null = null;

function applyTilt(): void {
  if (!target) return;
  target.style.setProperty('--tilt-x', `${pendingX.toFixed(2)}deg`);
  target.style.setProperty('--tilt-y', `${pendingY.toFixed(2)}deg`);
  // Spessore visibile sul lato OPPOSTO al mouse (rim shadow):
  //   mouse destra → pendingY positivo → spessore appare a SINISTRA → inset offset-x positivo
  //   mouse sotto  → pendingX negativo → spessore appare in ALTO    → inset offset-y positivo
  // Mouse al centro: pendingY/X ~= 0 → nessuno spessore visibile (flat).
  const RIM_SCALE = 1.6; // px per grado di tilt
  const rimX = pendingY * RIM_SCALE;
  const rimY = -pendingX * RIM_SCALE;
  target.style.setProperty('--rim-x', `${rimX.toFixed(2)}px`);
  target.style.setProperty('--rim-y', `${rimY.toFixed(2)}px`);
  // Highlight inverso (lato mouse, dove la luce "colpisce")
  target.style.setProperty('--rim-x-inv', `${(-rimX).toFixed(2)}px`);
  target.style.setProperty('--rim-y-inv', `${(-rimY).toFixed(2)}px`);
  raf = 0;
}

function schedule(): void {
  if (raf !== 0) return;
  raf = requestAnimationFrame(applyTilt);
}

function onPointerMove(e: PointerEvent): void {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // Scala in base a META viewport (così mouse ai bordi schermo = tilt max)
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;
  const dx = (e.clientX - cx) / halfW;   // ~ -1..1 across the window
  const dy = (e.clientY - cy) / halfH;
  // Inverti Y: mouse alto = tilt indietro (rotateX positivo)
  pendingY = Math.max(-1, Math.min(1, dx)) * MAX_TILT_DEG;
  pendingX = -Math.max(-1, Math.min(1, dy)) * MAX_TILT_DEG;
  schedule();
}

function onPointerLeave(): void {
  if (!target) return;
  // Animazione ease-out a 0
  const start = performance.now();
  const startX = pendingX;
  const startY = pendingY;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const tick = (now: number) => {
    if (!target) return;
    const t = Math.min(1, (now - start) / RESET_MS);
    const e = ease(t);
    pendingX = startX * (1 - e);
    pendingY = startY * (1 - e);
    target.style.setProperty('--tilt-x', `${pendingX.toFixed(2)}deg`);
    target.style.setProperty('--tilt-y', `${pendingY.toFixed(2)}deg`);
    const RIM_SCALE = 1.6;
    const rimX = pendingY * RIM_SCALE;
    const rimY = -pendingX * RIM_SCALE;
    target.style.setProperty('--rim-x', `${rimX.toFixed(2)}px`);
    target.style.setProperty('--rim-y', `${rimY.toFixed(2)}px`);
    target.style.setProperty('--rim-x-inv', `${(-rimX).toFixed(2)}px`);
    target.style.setProperty('--rim-y-inv', `${(-rimY).toFixed(2)}px`);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function enableClickerParallax(selector = '#clicker-btn'): () => void {
  if (active) return () => {};
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (window.matchMedia('(max-width: 768px)').matches) return () => {};

  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return () => {};

  target = el;
  active = true;

  // Listen GLOBAL — tilt segue mouse in tutta la finestra
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('mouseleave', onPointerLeave);

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('mouseleave', onPointerLeave);
    if (raf) cancelAnimationFrame(raf);
    active = false;
    target = null;
  };
}

/** Auto-init al DOMContentLoaded (chiamato da main.ts). */
export function autoInitClickerParallax(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => enableClickerParallax(), { once: true });
  } else {
    enableClickerParallax();
  }
}
