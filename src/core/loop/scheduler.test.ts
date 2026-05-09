import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from './scheduler';
import { FakeClock } from './clock';

function makeSched() {
  const clock = new FakeClock();
  const sched = new Scheduler({ clock, autoPauseHidden: false });
  return { clock, sched };
}

describe('Scheduler.registerTick', () => {
  it('chiama handler a frequenza fissa', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    sched.registerTick(fn, 60); // ogni ~16.67ms
    sched.start();
    clock.tick(100, 16.67); // ~6 frame, ~6 tick attesi
    expect(fn).toHaveBeenCalled();
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('hz=1 → 1 tick/sec', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    sched.registerTick(fn, 1);
    sched.start();
    clock.tick(3000, 16.67);
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fn.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('disregistra handler', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    const off = sched.registerTick(fn, 60);
    sched.start();
    clock.tick(50, 16.67);
    const before = fn.mock.calls.length;
    off();
    clock.tick(100, 16.67);
    expect(fn.mock.calls.length).toBe(before);
  });

  it('errore in tick non blocca scheduler', () => {
    const { clock, sched } = makeSched();
    const onError = vi.fn();
    const sched2 = new Scheduler({ clock, autoPauseHidden: false, onError });
    const fn = vi.fn(() => { throw new Error('boom'); });
    sched2.registerTick(fn, 60);
    sched2.start();
    clock.tick(50, 16.67);
    expect(onError).toHaveBeenCalled();
    expect(fn.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('Scheduler.schedule (one-shot)', () => {
  it('esegue dopo delayMs', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    sched.schedule(500, fn);
    sched.start();
    clock.tick(400, 16.67);
    expect(fn).not.toHaveBeenCalled();
    clock.tick(200, 16.67);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel prima dell\'esecuzione', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    const cancel = sched.schedule(100, fn);
    sched.start();
    clock.tick(50, 16.67);
    cancel();
    clock.tick(200, 16.67);
    expect(fn).not.toHaveBeenCalled();
  });

  it('multipli ordinati per fireAt', () => {
    const { clock, sched } = makeSched();
    const order: number[] = [];
    sched.schedule(300, () => order.push(3));
    sched.schedule(100, () => order.push(1));
    sched.schedule(200, () => order.push(2));
    sched.start();
    clock.tick(500, 16.67);
    expect(order).toEqual([1, 2, 3]);
  });
});

describe('Scheduler.every (ricorrente)', () => {
  it('chiamato a intervalli regolari', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    sched.every(100, fn);
    sched.start();
    clock.tick(550, 16.67);
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(fn.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('cancel ferma future esecuzioni', () => {
    const { clock, sched } = makeSched();
    const fn = vi.fn();
    const cancel = sched.every(50, fn);
    sched.start();
    clock.tick(120, 16.67);
    const before = fn.mock.calls.length;
    cancel();
    clock.tick(200, 16.67);
    expect(fn.mock.calls.length).toBe(before);
  });
});

describe('Scheduler pause/resume', () => {
  it('pause ferma tick e tasks', () => {
    const { clock, sched } = makeSched();
    const tick = vi.fn();
    const task = vi.fn();
    sched.registerTick(tick, 60);
    sched.schedule(200, task);
    sched.start();
    sched.pause();
    clock.tick(500, 16.67);
    expect(tick).not.toHaveBeenCalled();
    expect(task).not.toHaveBeenCalled();
  });

  it('resume riprende senza salti', () => {
    const { clock, sched } = makeSched();
    const tick = vi.fn();
    sched.registerTick(tick, 60);
    sched.start();
    clock.tick(50, 16.67);
    const before = tick.mock.calls.length;
    sched.pause();
    clock.tick(1000, 16.67);
    expect(tick.mock.calls.length).toBe(before);
    sched.resume();
    clock.tick(50, 16.67);
    expect(tick.mock.calls.length).toBeGreaterThan(before);
  });
});

describe('Scheduler maxDelta', () => {
  it('cap delta evita salti enormi (tab sospeso)', () => {
    const clock = new FakeClock();
    const sched = new Scheduler({ clock, autoPauseHidden: false, maxDeltaMs: 100 });
    const fn = vi.fn();
    sched.registerTick(fn, 60);
    sched.start();
    // Simula salto enorme di 5 secondi in un unico frame
    clock.advance(5000);
    // maxDelta=100ms → al massimo 6 tick (100/16.67 ≈ 6)
    expect(fn.mock.calls.length).toBeLessThanOrEqual(7);
  });
});
