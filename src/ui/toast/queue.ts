/**
 * Toast queue — gemello V3 del sistema toast slot-based (js/ui-functions.js, F5 fetta 2).
 *
 * Logica: gate (iniettato: nel gioco = utente loggato), anti-spam (stesso
 * messaggio entro N ms → skip), coda con slot fissi (niente layout shift),
 * drain di UN toast per evento (push o slot liberato) — semantica legacy.
 * Il rendering DOM è una primitiva iniettata dal wrapper (createToastDOM).
 */

export interface ToastData {
  message: string;
  type: string;
  duration: number;
}

export interface ToastQueueOptions {
  /** Rendering reale del toast nello slot dato (DOM nel wrapper legacy). */
  render: (toast: ToastData, slot: number) => void;
  /** Gate: se false il toast è soppresso (es. utente non loggato). Default: sempre true. */
  canShow?: () => boolean;
  /** Slot visibili contemporanei. Default 5. */
  maxVisible?: number;
  /** Stesso messaggio entro questa finestra → skip. Default 2000ms. */
  antiSpamMs?: number;
  /** Durata di default di un toast. Default 3500ms. */
  defaultDuration?: number;
  /** Clock iniettabile (test). */
  now?: () => number;
}

export class ToastQueue {
  private readonly opts: ToastQueueOptions;
  private readonly slots: boolean[];
  private readonly queue: ToastData[] = [];
  private lastMsg = '';
  private lastTime = 0;

  constructor(options: ToastQueueOptions) {
    this.opts = options;
    this.slots = new Array(options.maxVisible ?? 5).fill(false);
  }

  push(message: string, type = 'info', duration?: number): void {
    if (this.opts.canShow && !this.opts.canShow()) return;

    const now = (this.opts.now ?? Date.now)();
    if (message === this.lastMsg && now - this.lastTime < (this.opts.antiSpamMs ?? 2000)) {
      return;
    }
    this.lastMsg = message;
    this.lastTime = now;

    this.queue.push({ message, type, duration: duration || (this.opts.defaultDuration ?? 3500) });
    this.drainOne();
  }

  /** Da chiamare quando un toast esce di scena (dopo l'exit animation). */
  releaseSlot(slot: number): void {
    if (slot >= 0 && slot < this.slots.length) this.slots[slot] = false;
    this.drainOne();
  }

  /** Un SOLO toast per evento, come il legacy (processToastQueue). */
  private drainOne(): void {
    if (this.queue.length === 0) return;
    const slot = this.slots.indexOf(false);
    if (slot === -1) return; // tutti pieni: aspetta un releaseSlot

    const data = this.queue.shift()!;
    this.slots[slot] = true;
    this.opts.render(data, slot);
  }

  /** Stato per debug/test. */
  state(): { queued: number; visible: number } {
    return {
      queued: this.queue.length,
      visible: this.slots.filter(Boolean).length,
    };
  }
}

export function createToastQueue(options: ToastQueueOptions): ToastQueue {
  return new ToastQueue(options);
}
