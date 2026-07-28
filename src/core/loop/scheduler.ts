/**
 * Scheduler unificato — sostituisce 60+ setInterval/setTimeout sparsi.
 *
 * API:
 *   - registerTick(handler, hz): chiamato a freq fissa (es. 60 per render, 1 per autosave)
 *   - schedule(at, fn): one-shot in tempo virtuale (sostituisce setTimeout)
 *   - every(intervalMs, fn): ricorrente (sostituisce setInterval)
 *   - pause()/resume(): freeze game loop senza perdere tasks
 *
 * Tutti i task condividono lo stesso clock — no drift fra timer separati.
 * Pause automatica quando document.hidden = true.
 */
import type { Clock } from './clock';
import { realClock } from './clock';

export type TickHandler = (deltaMs: number, now: number) => void;
export type TaskFn = () => void;

interface TickRegistration {
  hz: number;
  intervalMs: number;
  acc: number;
  handler: TickHandler;
  enabled: boolean;
}

interface ScheduledTask {
  fireAt: number;
  fn: TaskFn;
  intervalMs?: number; // se presente → ricorrente
  cancelled: boolean;
}

export interface SchedulerOptions {
  clock?: Clock;
  /** Cap delta per evitare salti enormi se il browser sospende il tab. Default 250ms. */
  maxDeltaMs?: number;
  /** Se true, ascolta visibilitychange e pausa quando tab nascosto. Default true (no-op in test). */
  autoPauseHidden?: boolean;
  /** Logger errori — default console.error. */
  onError?: (err: unknown, source: string) => void;
}

export class Scheduler {
  private readonly clock: Clock;
  private readonly maxDelta: number;
  private readonly onError: (err: unknown, source: string) => void;

  private rafHandle: number | null = null;
  private lastTime = 0;
  private running = false;
  private paused = false;

  private ticks = new Set<TickRegistration>();
  private tasks: ScheduledTask[] = []; // ordinato per fireAt asc

  private visibilityHandler: (() => void) | null = null;

  constructor(opts: SchedulerOptions = {}) {
    this.clock = opts.clock ?? realClock;
    this.maxDelta = opts.maxDeltaMs ?? 250;
    this.onError = opts.onError ?? ((err, src) => console.error(`[scheduler:${src}]`, err));

    if (opts.autoPauseHidden !== false && typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.hidden) this.pause();
        else this.resume();
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Registra handler tick a frequenza fissa.
   * hz=60 → ~60 chiamate/sec. hz=1 → 1/sec.
   */
  registerTick(handler: TickHandler, hz: number): () => void {
    const reg: TickRegistration = {
      hz,
      intervalMs: 1000 / hz,
      acc: 0,
      handler,
      enabled: true,
    };
    this.ticks.add(reg);
    return () => {
      reg.enabled = false;
      this.ticks.delete(reg);
    };
  }

  /**
   * One-shot dopo `delayMs`. Ritorna funzione cancel.
   */
  schedule(delayMs: number, fn: TaskFn): () => void {
    const task: ScheduledTask = {
      fireAt: this.clock.now() + delayMs,
      fn,
      cancelled: false,
    };
    this.insertTask(task);
    return () => {
      task.cancelled = true;
    };
  }

  /**
   * Ricorrente ogni `intervalMs`. Ritorna funzione cancel.
   * Prima chiamata dopo `intervalMs` (no-immediate).
   */
  every(intervalMs: number, fn: TaskFn): () => void {
    const task: ScheduledTask = {
      fireAt: this.clock.now() + intervalMs,
      fn,
      intervalMs,
      cancelled: false,
    };
    this.insertTask(task);
    return () => {
      task.cancelled = true;
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = this.clock.now();
    this.scheduleFrame();
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      this.clock.cancel(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastTime = this.clock.now();
  }

  isRunning(): boolean {
    return this.running;
  }
  isPaused(): boolean {
    return this.paused;
  }

  /** Esposto per test — esegue manualmente un frame al tempo `now`. */
  runFrame(now: number): void {
    if (!this.running || this.paused) return;
    let delta = now - this.lastTime;
    if (delta < 0) delta = 0;
    if (delta > this.maxDelta) delta = this.maxDelta;
    this.lastTime = now;

    // 1. tick handler a frequenza fissa
    for (const reg of this.ticks) {
      if (!reg.enabled) continue;
      reg.acc += delta;
      while (reg.acc >= reg.intervalMs) {
        try {
          reg.handler(reg.intervalMs, now);
        } catch (e) {
          this.onError(e, 'tick');
        }
        reg.acc -= reg.intervalMs;
      }
    }

    // 2. scheduled tasks dovuti (la lista è ordinata)
    while (this.tasks.length > 0 && this.tasks[0]!.fireAt <= now) {
      const task = this.tasks.shift()!;
      if (task.cancelled) continue;
      try {
        task.fn();
      } catch (e) {
        this.onError(e, 'task');
      }
      if (task.intervalMs && !task.cancelled) {
        task.fireAt = now + task.intervalMs;
        this.insertTask(task);
      }
    }
  }

  private scheduleFrame(): void {
    this.rafHandle = this.clock.schedule((now) => {
      if (!this.running) return;
      this.runFrame(now);
      this.scheduleFrame();
    });
  }

  private insertTask(task: ScheduledTask): void {
    // insertion sort: lista breve, no overhead
    let i = 0;
    while (i < this.tasks.length && this.tasks[i]!.fireAt <= task.fireAt) i++;
    this.tasks.splice(i, 0, task);
  }
}
