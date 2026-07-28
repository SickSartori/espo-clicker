import { describe, it, expect } from 'vitest';
import { ToastQueue } from './queue';

function mkQueue(overrides: Partial<ConstructorParameters<typeof ToastQueue>[0]> = {}) {
  const rendered: Array<{ message: string; type: string; duration: number; slot: number }> = [];
  let t = 0;
  const clock = { now: () => t, advance: (ms: number) => { t += ms; } };
  const queue = new ToastQueue({
    render: (toast, slot) => rendered.push({ ...toast, slot }),
    now: clock.now,
    ...overrides,
  });
  return { queue, rendered, clock };
}

describe('ToastQueue', () => {
  it('rendering immediato con slot liberi, slot progressivi', () => {
    const { queue, rendered, clock } = mkQueue();
    queue.push('uno');
    clock.advance(3000);
    queue.push('due', 'success', 1000);
    expect(rendered).toEqual([
      { message: 'uno', type: 'info', duration: 3500, slot: 0 },
      { message: 'due', type: 'success', duration: 1000, slot: 1 },
    ]);
  });

  it('anti-spam: stesso messaggio entro 2s → skip, dopo → passa', () => {
    const { queue, rendered, clock } = mkQueue();
    queue.push('ciao');
    clock.advance(1000);
    queue.push('ciao');
    expect(rendered).toHaveLength(1);
    clock.advance(2001);
    queue.push('ciao');
    expect(rendered).toHaveLength(2);
  });

  it('messaggi diversi entro 2s → passano entrambi', () => {
    const { queue, rendered } = mkQueue();
    queue.push('a');
    queue.push('b');
    expect(rendered).toHaveLength(2);
  });

  it('slot pieni → coda; releaseSlot drena UN toast nello slot liberato', () => {
    const { queue, rendered, clock } = mkQueue({ maxVisible: 2 });
    queue.push('1'); clock.advance(3000);
    queue.push('2'); clock.advance(3000);
    queue.push('3'); clock.advance(3000); // in coda
    queue.push('4'); // in coda
    expect(rendered).toHaveLength(2);
    expect(queue.state()).toEqual({ queued: 2, visible: 2 });

    queue.releaseSlot(0);
    expect(rendered).toHaveLength(3);
    expect(rendered[2]).toMatchObject({ message: '3', slot: 0 }); // riusa lo slot liberato
    expect(queue.state()).toEqual({ queued: 1, visible: 2 });

    queue.releaseSlot(1);
    expect(rendered[3]).toMatchObject({ message: '4', slot: 1 });
  });

  it('gate canShow=false → toast soppresso del tutto', () => {
    const { queue, rendered } = mkQueue({ canShow: () => false });
    queue.push('nascosto');
    expect(rendered).toHaveLength(0);
    expect(queue.state()).toEqual({ queued: 0, visible: 0 });
  });

  it('releaseSlot fuori range → nessun crash', () => {
    const { queue } = mkQueue();
    expect(() => queue.releaseSlot(-1)).not.toThrow();
    expect(() => queue.releaseSlot(99)).not.toThrow();
  });
});
