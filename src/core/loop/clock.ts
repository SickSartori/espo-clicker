/**
 * Clock — astrazione del tempo per testabilità.
 *
 * Default = wall clock + requestAnimationFrame.
 * In test si inietta un FakeClock controllato manualmente.
 */

export interface Clock {
  now(): number;
  schedule(cb: (now: number) => void): number;
  cancel(handle: number): void;
}

export const realClock: Clock = {
  now: () => performance.now(),
  schedule: (cb) => requestAnimationFrame(cb),
  cancel: (h) => cancelAnimationFrame(h),
};

/**
 * FakeClock: tempo virtuale + frame manualmente avanzati.
 * Solo per test.
 */
export class FakeClock implements Clock {
  private t = 0;
  private nextHandle = 1;
  private pending = new Map<number, (now: number) => void>();

  now(): number {
    return this.t;
  }

  schedule(cb: (now: number) => void): number {
    const h = this.nextHandle++;
    this.pending.set(h, cb);
    return h;
  }

  cancel(handle: number): void {
    this.pending.delete(handle);
  }

  /** Avanza tempo virtuale di `deltaMs` e invoca tutti i callback RAF pendenti. */
  advance(deltaMs: number): void {
    this.t += deltaMs;
    const callbacks = Array.from(this.pending.values());
    this.pending.clear();
    callbacks.forEach((cb) => cb(this.t));
  }

  /** Avanza in step di `frameMs` per simulare RAF realistico. */
  tick(totalMs: number, frameMs = 16.67): void {
    let elapsed = 0;
    while (elapsed < totalMs) {
      const step = Math.min(frameMs, totalMs - elapsed);
      this.advance(step);
      elapsed += step;
    }
  }

  reset(): void {
    this.t = 0;
    this.nextHandle = 1;
    this.pending.clear();
  }
}
