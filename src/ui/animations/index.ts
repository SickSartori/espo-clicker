/**
 * Wrapper Motion One — animazioni stateful con spring physics.
 *
 * Sostituirà gradualmente le keyframes CSS pesanti e gli usi di GSAP semplici.
 * GSAP resta solo per timeline complesse (prestige sequence).
 *
 * Tutto rispetta `prefers-reduced-motion`: in tal caso applica il valore finale
 * istantaneamente senza animare.
 */
import { animate as motionAnimate, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animazione DOM con fallback automatico per reduced-motion.
 */
export function animate(
  target: Element | Element[] | string,
  keyframes: DOMKeyframesDefinition,
  options?: AnimationOptions,
) {
  if (prefersReducedMotion()) {
    // applica solo lo stato finale
    const els = resolveTargets(target);
    els.forEach((el) => applyFinalState(el, keyframes));
    return null;
  }
  return motionAnimate(target, keyframes, options);
}

/**
 * Squash & stretch on click button (12 principles animation).
 */
export function clickBounce(el: Element) {
  return animate(
    el,
    { scale: [1, 0.92, 1.05, 1] },
    { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] },
  );
}

/**
 * Fade-in slide-up (entrance card).
 */
export function fadeInUp(el: Element | string, delay = 0) {
  return animate(
    el,
    { opacity: [0, 1], y: [20, 0] },
    { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
  );
}

/**
 * Stagger list — applica fadeInUp con offset incrementale.
 */
export function staggerList(elements: Element[], stagger = 0.05) {
  elements.forEach((el, i) => fadeInUp(el, i * stagger));
}

/**
 * Number ticker — anima un numero da `from` a `to` chiamando `onUpdate`.
 * Per score / bps display.
 */
export function tickerNumber(
  from: number,
  to: number,
  onUpdate: (v: number) => void,
  durationMs = 600,
) {
  if (prefersReducedMotion()) {
    onUpdate(to);
    return null;
  }
  const start = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    onUpdate(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

// === helpers ===

function resolveTargets(t: Element | Element[] | string): Element[] {
  if (typeof t === 'string') return Array.from(document.querySelectorAll(t));
  if (Array.isArray(t)) return t;
  return [t];
}

function applyFinalState(el: Element, keyframes: DOMKeyframesDefinition) {
  const html = el as HTMLElement;
  for (const key in keyframes) {
    const v = (keyframes as Record<string, unknown>)[key];
    const final = Array.isArray(v) ? v[v.length - 1] : v;
    if (final !== undefined && final !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (html.style as any)[key] = String(final);
    }
  }
}
