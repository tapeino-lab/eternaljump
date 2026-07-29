import type { GameState } from "./types.js";
import { config } from './config.js';
import { FLR, RND, PI, swapRemove } from './utils.js';
import { ObjectPool } from './entities/pool.js';

export interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  secondColor: string;
  type: 'burst' | 'double' | 'willow' | 'ring' | 'peony' | 'wabika' | 'kiku' | 'senrin';
}

export interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  secondColor?: string;
  colorShiftTimer?: number;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  sparkle: boolean;
}

export interface FireworkFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

const sparkPool = new ObjectPool<FireworkSpark>(() => ({
  x: 0, y: 0, vx: 0, vy: 0, color: '', size: 0, alpha: 0, decay: 0, gravity: 0, sparkle: false
}));

const flashPool = new ObjectPool<FireworkFlash>(() => ({
  x: 0, y: 0, radius: 0, maxRadius: 0, color: '', alpha: 0
}));

const rocketPool = new ObjectPool<FireworkRocket>(() => ({
  x: 0, y: 0, vx: 0, vy: 0, targetY: 0, color: '', secondColor: '', type: 'burst'
}));

const COLOR_PALETTES = [
  ['#ff3366', '#ffd700'], // Pink & Gold
  ['#00f0ff', '#ffffff'], // Cyan & White
  ['#ffd700', '#ff6b08'], // Gold & Orange
  ['#00ff66', '#00f0ff'], // Neon Green & Cyan
  ['#ff00ff', '#9d4edd'], // Magenta & Purple
  ['#ffffff', '#ffd700'], // Silver & Gold
  ['#e64a19', '#ffb300'],
  ['#00b8d4', '#ccff90'],
  ['#aa00ff', '#ff80ab'],
  ['#ff6d00', '#ffd54f'],
];

class FireworksSystem {
  rockets: FireworkRocket[] = [];
  sparks: FireworkSpark[] = [];
  flashes: FireworkFlash[] = [];
  spawnTimer: number = 0;

  reset() {
    sparkPool.releaseAll(this.sparks);
    flashPool.releaseAll(this.flashes);
    rocketPool.releaseAll(this.rockets);
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.spawnTimer = 0;
  }

  /**
   * Launch firework rocket
   */
  launch(x?: number, targetY?: number) {
    let startX: number;
    if (x !== undefined) {
      startX = x;
    } else {
      if (RND() < 0.5) {
        startX = 16 + RND() * 64;  // Left area
      } else {
        startX = 144 + RND() * 64; // Right area
      }
    }
    const destY = targetY ?? (25 + RND() * 130);
    const palette = COLOR_PALETTES[FLR(RND() * COLOR_PALETTES.length)];
    const types: Array<'burst' | 'double' | 'willow' | 'ring' | 'peony' | 'wabika' | 'kiku' | 'senrin'> = [
      'burst', 'double', 'willow', 'ring', 'peony', 'wabika', 'kiku', 'senrin'
    ];
    const type = types[FLR(RND() * types.length)];

    const startY = 240;
    const dist = Math.max(20, startY - destY);
    const vy = -Math.sqrt(2 * 0.14 * dist);

    const r = rocketPool.get();
    r.x = startX;
    r.y = startY;
    r.vx = (RND() - 0.5) * 0.5;
    r.vy = vy;
    r.targetY = destY;
    r.color = palette[0];
    r.secondColor = palette[1];
    r.type = type;

    this.rockets.push(r);
  }

  /**
   * Update logic
   */
  update(game: GameState, isAttractMode: boolean) {
    if (game && game.isPaused) {
      return;
    }

    let allowSpawn = isAttractMode;
    if (!isAttractMode && game) {
      const recScreens = config.recoveryScreens ?? 1;
      const maxReturnCamY = (game.highestCameraY ?? 0) + config.gameHeight * recScreens;
      if (maxReturnCamY >= -200) {
        allowSpawn = true;
      }
    }

    if (allowSpawn) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        const count = RND() < 0.35 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.launch();
        }
        this.spawnTimer = 18 + FLR(RND() * 20);
      }
    }

    // 1. Update rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.14;

      if (RND() < 0.8) {
        const sp = sparkPool.get();
        sp.x = r.x + (RND() - 0.5) * 1.5;
        sp.y = r.y + 3;
        sp.vx = (RND() - 0.5) * 0.3;
        sp.vy = RND() * 1.2 + 0.3;
        sp.color = r.type === 'wabika' ? '#ff9800' : '#ffea88';
        sp.size = 1.2 + RND() * 1.2;
        sp.alpha = 0.9;
        sp.decay = 0.06 + RND() * 0.04;
        sp.gravity = 0.04;
        sp.sparkle = false;
        sp.secondColor = undefined;
        sp.colorShiftTimer = undefined;
        this.sparks.push(sp);
      }

      if (r.y <= r.targetY || r.vy >= -0.2) {
        this.explode(r);
        rocketPool.release(r);
        swapRemove(this.rockets, i);
      }
    }

    // 2. Update flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.radius += (f.maxRadius - f.radius) * 0.35;
      f.alpha -= 0.12;
      if (f.alpha <= 0) {
        flashPool.release(f);
        swapRemove(this.flashes, i);
      }
    }

    // 3. Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      s.vy += s.gravity;
      s.alpha -= s.decay;

      if (s.colorShiftTimer !== undefined && s.colorShiftTimer > 0) {
        s.colorShiftTimer--;
        if (s.colorShiftTimer === 0 && s.secondColor) {
          s.color = s.secondColor;
        }
      }

      if (s.alpha <= 0 || s.y > config.gameHeight + 250 || s.y < -350) {
        sparkPool.release(s);
        swapRemove(this.sparks, i);
      }
    }

    if (this.sparks.length > 220) {
      const overflow = this.sparks.splice(0, this.sparks.length - 220);
      sparkPool.releaseAll(overflow);
    }
  }

  /**
   * Rocket explosion
   */
  explode(r: FireworkRocket) {
    const f = flashPool.get();
    f.x = r.x;
    f.y = r.y;
    f.radius = 3;
    f.maxRadius = r.type === 'senrin' ? 14 : 26;
    f.color = r.type === 'wabika' ? '#ffaa00' : '#ffffff';
    f.alpha = 0.95;
    this.flashes.push(f);

    if (r.type === 'senrin') {
      const petalCount = 7;
      for (let p = 0; p < petalCount; p++) {
        const pAngle = (p / petalCount) * PI * 2 + (RND() - 0.5) * 0.2;
        const pDist = 8 + RND() * 12;
        const cx = r.x + Math.cos(pAngle) * pDist;
        const cy = r.y + Math.sin(pAngle) * pDist;
        const pColor = COLOR_PALETTES[FLR(RND() * COLOR_PALETTES.length)][0];

        const pf = flashPool.get();
        pf.x = cx;
        pf.y = cy;
        pf.radius = 2;
        pf.maxRadius = 10;
        pf.color = pColor;
        pf.alpha = 0.9;
        this.flashes.push(pf);

        const subCount = 10;
        for (let i = 0; i < subCount; i++) {
          const angle = (i / subCount) * PI * 2;
          const speed = 0.8 + RND() * 0.8;
          const sp = sparkPool.get();
          sp.x = cx;
          sp.y = cy;
          sp.vx = Math.cos(angle) * speed;
          sp.vy = Math.sin(angle) * speed;
          sp.color = pColor;
          sp.secondColor = undefined;
          sp.colorShiftTimer = undefined;
          sp.size = 1.8;
          sp.alpha = 1.0;
          sp.decay = 0.035 + RND() * 0.02;
          sp.gravity = 0.02;
          sp.sparkle = true;
          this.sparks.push(sp);
        }
      }
      return;
    }

    const sparkCount = (r.type === 'double' || r.type === 'kiku') ? 42 : (r.type === 'willow' ? 36 : (r.type === 'wabika' ? 28 : 30));

    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * PI * 2 + (RND() - 0.5) * 0.12;
      let speed = 1.6 + RND() * 1.6;
      let color = r.color;
      let secondColor: string | undefined = undefined;
      let colorShiftTimer: number | undefined = undefined;
      let decay = 0.018 + RND() * 0.015;
      let gravity = 0.03 + RND() * 0.02;
      let sparkle = RND() < 0.45;
      let size = 2.0 + RND() * 1.2;

      if (r.type === 'wabika') {
        color = RND() < 0.7 ? '#ff6d00' : '#ffb300';
        speed = 0.9 + RND() * 1.2;
        decay = 0.012 + RND() * 0.01;
        gravity = 0.06;
        size = 2.2;
        sparkle = RND() < 0.3;
      } else if (r.type === 'kiku') {
        speed = 1.8;
        color = r.color;
        secondColor = r.secondColor;
        colorShiftTimer = 12 + FLR(RND() * 8);
        decay = 0.016;
        size = 2.0;
        sparkle = true;
      } else if (r.type === 'double') {
        if (i % 2 === 0) {
          speed *= 0.55;
          color = r.secondColor;
        }
      } else if (r.type === 'willow') {
        decay = 0.009 + RND() * 0.006;
        gravity = 0.05 + RND() * 0.03;
        color = RND() < 0.6 ? '#ffd700' : '#ffffff';
        size = 1.8;
      } else if (r.type === 'ring') {
        speed = 2.1;
        decay = 0.022;
        color = (i % 2 === 0) ? r.color : r.secondColor;
      } else if (r.type === 'peony') {
        sparkle = true;
        speed = 1.2 + RND() * 1.8;
      }

      const sp = sparkPool.get();
      sp.x = r.x;
      sp.y = r.y;
      sp.vx = Math.cos(angle) * speed;
      sp.vy = Math.sin(angle) * speed;
      sp.color = color;
      sp.secondColor = secondColor;
      sp.colorShiftTimer = colorShiftTimer;
      sp.size = size;
      sp.alpha = 1.0;
      sp.decay = decay;
      sp.gravity = gravity;
      sp.sparkle = sparkle;
      this.sparks.push(sp);
    }
  }

  /**
   * Render fireworks
   */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Draw explosion flash
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      const screenY = f.y | 0;
      const size = (f.radius * 1.8) | 0;
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.fillStyle = f.color;
      ctx.fillRect((f.x - size * 0.5) | 0, (screenY - size * 0.5) | 0, size, size);
    }

    // 2. Draw rockets
    for (let i = 0; i < this.rockets.length; i++) {
      const r = this.rockets[i];
      const screenY = r.y | 0;
      const rx = r.x | 0;

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = r.color;
      ctx.fillRect(rx - 2, screenY - 2, 4, 4);

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, screenY - 1, 2, 2);
    }

    // 3. Draw sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const screenY = s.y | 0;
      if (screenY < -50 || screenY > config.gameHeight + 200) continue;

      let alpha = s.alpha;
      let color = s.color;

      if (s.sparkle && RND() < 0.35) {
        color = '#ffffff';
        alpha = Math.min(1.0, alpha + 0.4);
      }

      const px = s.x | 0;
      const py = screenY;
      const sz = Math.max(1, (s.size * 1.2) | 0);

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, sz, sz);
    }

    ctx.restore();
  }
}

export const fireworksSystem = new FireworksSystem();
