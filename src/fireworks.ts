import type { GameState } from "./types.js";
import { config } from './config.js';
import { FLR, RND, PI, swapRemove } from './utils.js';

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

const COLOR_PALETTES = [
  ['#ff3366', '#ffd700'], // Pink & Gold
  ['#00f0ff', '#ffffff'], // Cyan & White
  ['#ffd700', '#ff6b08'], // Gold & Orange
  ['#00ff66', '#00f0ff'], // Neon Green & Cyan
  ['#ff00ff', '#9d4edd'], // Magenta & Purple
  ['#ffffff', '#ffd700'], // Silver & Gold
  // Traditional color palettes
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
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.spawnTimer = 0;
  }

  /**
   * Launch firework rocket
   */
  launch(x?: number, targetY?: number) {
    // Exclude center hole area
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

    // Launch position near ground
    const startY = 240;
    const dist = Math.max(20, startY - destY);
    // Initial velocity vy for target altitude destY under gravity 0.14
    const vy = -Math.sqrt(2 * 0.14 * dist);

    this.rockets.push({
      x: startX,
      y: startY,
      vx: (RND() - 0.5) * 0.5,
      vy: vy,
      targetY: destY,
      color: palette[0],
      secondColor: palette[1],
      type: type,
    });
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

    // Spawn rockets
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
      r.vy += 0.14; // Gravity deceleration

      // Trail sparks
      if (RND() < 0.8) {
        this.sparks.push({
          x: r.x + (RND() - 0.5) * 1.5,
          y: r.y + 3,
          vx: (RND() - 0.5) * 0.3,
          vy: RND() * 1.2 + 0.3,
          color: r.type === 'wabika' ? '#ff9800' : '#ffea88',
          size: 1.2 + RND() * 1.2,
          alpha: 0.9,
          decay: 0.06 + RND() * 0.04,
          gravity: 0.04,
          sparkle: false,
        });
      }

      // Explode at target altitude or slowdown
      if (r.y <= r.targetY || r.vy >= -0.2) {
        this.explode(r);
        swapRemove(this.rockets, i);
      }
    }

    // 2. Update flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.radius += (f.maxRadius - f.radius) * 0.35;
      f.alpha -= 0.12;
      if (f.alpha <= 0) {
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

      // Color shift timer
      if (s.colorShiftTimer !== undefined && s.colorShiftTimer > 0) {
        s.colorShiftTimer--;
        if (s.colorShiftTimer === 0 && s.secondColor) {
          s.color = s.secondColor;
        }
      }

      if (s.alpha <= 0 || s.y > config.gameHeight + 250 || s.y < -350) {
        swapRemove(this.sparks, i);
      }
    }

    // Limit spark count for performance
    if (this.sparks.length > 220) {
      this.sparks = this.sparks.slice(this.sparks.length - 220);
    }
  }

  /**
   * Rocket explosion
   */
  explode(r: FireworkRocket) {
    // Explosion flash
    this.flashes.push({
      x: r.x,
      y: r.y,
      radius: 3,
      maxRadius: r.type === 'senrin' ? 14 : 26,
      color: r.type === 'wabika' ? '#ffaa00' : '#ffffff',
      alpha: 0.95,
    });

    if (r.type === 'senrin') {
      const petalCount = 7;
      for (let p = 0; p < petalCount; p++) {
        const pAngle = (p / petalCount) * PI * 2 + (RND() - 0.5) * 0.2;
        const pDist = 8 + RND() * 12;
        const cx = r.x + Math.cos(pAngle) * pDist;
        const cy = r.y + Math.sin(pAngle) * pDist;
        const pColor = COLOR_PALETTES[FLR(RND() * COLOR_PALETTES.length)][0];

        this.flashes.push({
          x: cx,
          y: cy,
          radius: 2,
          maxRadius: 10,
          color: pColor,
          alpha: 0.9,
        });

        const subCount = 10;
        for (let i = 0; i < subCount; i++) {
          const angle = (i / subCount) * PI * 2;
          const speed = 0.8 + RND() * 0.8;
          this.sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: pColor,
            size: 1.8,
            alpha: 1.0,
            decay: 0.035 + RND() * 0.02,
            gravity: 0.02,
            sparkle: true,
          });
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

      this.sparks.push({
        x: r.x,
        y: r.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        secondColor: secondColor,
        colorShiftTimer: colorShiftTimer,
        size: size,
        alpha: 1.0,
        decay: decay,
        gravity: gravity,
        sparkle: sparkle,
      });
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
      const screenY = FLR(f.y);
      const size = FLR(f.radius * 1.8);
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.fillStyle = f.color;
      ctx.fillRect(FLR(f.x - size / 2), FLR(screenY - size / 2), size, size);
    }

    // 2. Draw rockets
    for (let i = 0; i < this.rockets.length; i++) {
      const r = this.rockets[i];
      const screenY = FLR(r.y);

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = r.color;
      ctx.fillRect(FLR(r.x - 2), FLR(screenY - 2), 4, 4);

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(FLR(r.x - 1), FLR(screenY - 1), 2, 2);
    }

    // 3. Draw sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const screenY = FLR(s.y);
      if (screenY < -50 || screenY > config.gameHeight + 200) continue;

      let alpha = s.alpha;
      let color = s.color;

      if (s.sparkle && RND() < 0.35) {
        color = '#ffffff';
        alpha = Math.min(1.0, alpha + 0.4);
      }

      const px = FLR(s.x);
      const py = screenY;
      const sz = Math.max(1, FLR(s.size * 1.2));

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, sz, sz);
    }

    ctx.restore();
  }
}

export const fireworksSystem = new FireworksSystem();
