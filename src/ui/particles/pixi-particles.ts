/**
 * PixiJS particle system — GPU accelerated.
 *
 * Sostituisce #fire-particles-container DOM-based + spawnFireParticle setInterval(100ms).
 * Lazy load: importato solo quando si triggera fury / golden bug / fire mode.
 *
 * Uso:
 *   const fx = await import('./pixi-particles');
 *   const fire = await fx.createFireEmitter(document.getElementById('fire-host')!);
 *   fire.start(); ... fire.stop();
 */

import { Application, Container, Graphics, Ticker } from 'pixi.js';

export interface ParticleEmitter {
  start(): void;
  stop(): void;
  destroy(): void;
}

export interface FireOptions {
  rate?: number;        // particelle/sec
  baseColor?: number;   // 0xff5722
  size?: number;        // px
  life?: number;        // sec
}

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

async function makeApp(host: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  host.appendChild(app.canvas);
  return app;
}

export async function createFireEmitter(host: HTMLElement, opts: FireOptions = {}): Promise<ParticleEmitter> {
  const app = await makeApp(host);
  const layer = new Container();
  app.stage.addChild(layer);

  const rate = opts.rate ?? 60;
  const baseColor = opts.baseColor ?? 0xff5722;
  const size = opts.size ?? 6;
  const life = opts.life ?? 1.2;

  const particles: Particle[] = [];
  let acc = 0;
  let running = false;

  const spawn = () => {
    const g = new Graphics();
    g.circle(0, 0, size).fill({ color: baseColor, alpha: 1 });
    g.x = Math.random() * app.screen.width;
    g.y = app.screen.height;
    layer.addChild(g);
    particles.push({
      g,
      vx: (Math.random() - 0.5) * 40,
      vy: -80 - Math.random() * 60,
      age: 0,
      life,
    });
  };

  const update = (ticker: Ticker) => {
    if (!running) return;
    const dt = ticker.deltaMS / 1000;
    acc += dt * rate;
    while (acc >= 1) {
      spawn();
      acc -= 1;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.age += dt;
      if (p.age >= p.life) {
        layer.removeChild(p.g);
        p.g.destroy();
        particles.splice(i, 1);
        continue;
      }
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.vy += -20 * dt; // buoyancy
      const t = p.age / p.life;
      p.g.alpha = 1 - t;
      p.g.scale.set(1 - t * 0.5);
    }
  };

  app.ticker.add(update);

  return {
    start() { running = true; },
    stop() { running = false; },
    destroy() {
      app.ticker.remove(update);
      particles.forEach((p) => p.g.destroy());
      particles.length = 0;
      app.destroy(true, { children: true });
    },
  };
}

/**
 * Click sparks — burst breve su click bug, niente loop continuo.
 */
export async function clickBurst(host: HTMLElement, x: number, y: number, color = 0x3498db) {
  const app = await makeApp(host);
  const layer = new Container();
  app.stage.addChild(layer);

  const sparks: Particle[] = [];
  for (let i = 0; i < 12; i++) {
    const g = new Graphics();
    g.circle(0, 0, 3).fill({ color, alpha: 1 });
    g.x = x;
    g.y = y;
    layer.addChild(g);
    const angle = (i / 12) * Math.PI * 2;
    sparks.push({
      g,
      vx: Math.cos(angle) * 200,
      vy: Math.sin(angle) * 200,
      age: 0,
      life: 0.5,
    });
  }

  const tick = (ticker: Ticker) => {
    const dt = ticker.deltaMS / 1000;
    let alive = 0;
    for (const p of sparks) {
      if (p.age >= p.life) continue;
      alive++;
      p.age += dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.g.alpha = 1 - p.age / p.life;
    }
    if (alive === 0) {
      app.ticker.remove(tick);
      app.destroy(true, { children: true });
    }
  };
  app.ticker.add(tick);
}
