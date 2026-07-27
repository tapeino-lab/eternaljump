import { config, SCORE_THRESHOLDS } from '../config.js';
import { RND, FLR, MAX, MIN, SIN, PI } from '../utils.js';
import { game } from '../state.js';
import { IMG, ctx } from '../display.js';

import { dR } from '../renderer/core.js';

import { spawnParticles, spawnDebris, getPt } from './particles.js';
import { ObjectPool } from './pool.js';

export const P_BD = new ObjectPool<Bird>(() => new Bird());
export const P_MT = new ObjectPool<Meteor>(() => new Meteor());

export function getBd(t: number, x: number, y: number, ip: boolean, p: any = null, ib = false) {
  let b = P_BD.get();
  b.init(t, x, y, ip, p, ib);
  return b;
}

export function getMt(x: number, y: number, vx: number, vy: number) {
  let m = P_MT.get();
  m.init(x, y, vx, vy);
  return m;
}

    export function trySpawnBirdsOnPlatform(np, sc) {
      if (np.type === 'normal' && sc > game.startScore + 1000 && sc < SCORE_THRESHOLDS.MEDIUM) {
        let prob = 0, maxB = 0;
        if (sc < 15000) { prob = 0.3; maxB = 2; }
        else if (sc < 40000) { prob = 0.15; maxB = 1; }
        else if (sc < SCORE_THRESHOLDS.MEDIUM) { prob = 0.5; maxB = 5; }
        if (RND() < prob) {
          let bT = RND() < 0.8 ? 0 : 1;
          let platX = np.x, platW = np.w, bSp = bT === 0 ? 4 : 5;
          let mN = MAX(1, FLR((platW - 4) / bSp) + 1);
          let num = MIN(bT === 1 ? (RND() < 0.5 ? 1 : 2) : 2 + FLR(RND() * maxB), mN);
          let gW = (num - 1) * bSp + 4;
          let bx = RND() * MAX(0, platW - gW);
          for (let j = 0; j < num; j++) {
            game.birds.push(getBd(bT, platX + bx + j * bSp, np.y, true, np));
          }
        }
      }
    }

    export class Bird {
      type: number = 0;
      isPerched: boolean = false;
      platform: any = null;
      offsetX: number = 0;
      offsetY: number = 0;
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      isTitleBird: boolean = false;
      alertDist: number = 0;
      animOffset: number = 0;
      baseY?: number;
      
      init(type: number, x: number, y: number, isPerched: boolean, platform: any = null, isTitleBird = false) {
        this.type = type;
        this.isPerched = isPerched;
        this.platform = platform;
        this.offsetX = platform ? x - platform.x : 0;
        this.offsetY = platform ? y - platform.y : 0;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isTitleBird = isTitleBird;
        this.alertDist = isTitleBird ? 0 : 30 + RND() * 50;
        this.animOffset = RND() * 1000;
        if (!isPerched) {
          if (type === 2) {
            this.vx = (x < config.gameWidth / 2 ? 1 : -1) * (0.4 + RND() * 0.3);
            this.baseY = y;
          } else {
            this.vx = (x < config.gameWidth / 2 ? 1 : -1) * (1 + RND());
            this.vy = (RND() - 0.5) * 0.5;
          }
        }
      }
      update() {
        if (this.isPerched) {
          if (this.platform) {
            if (this.platform.broken) {
              this.isPerched = false;
              this.vy = 1;
            } else {
              this.x = this.platform.x + this.offsetX;
              this.y = this.platform.y + this.offsetY;
            }
          }
          if (this.isTitleBird) {
            if (game.player.y < 150 && game.player.vy < -5) {
              this.isPerched = false;
              let escDir = (this.x < config.gameWidth / 2) ? -1 : 1;
              this.vx = escDir * (1.5 + RND() * 2);
              this.vy = -1.5 - RND() * 2;
            }
          } else {
            let ents = [game.player];
            let tr = false, tx = this.x;
            for (let e of ents) {
              let dx = (e.x + e.w / 2) - this.x;
              let dy = (e.y + e.h / 2) - this.y;
              if (dx * dx + dy * dy < this.alertDist * this.alertDist) {
                tr = true;
                tx = e.x + e.w / 2;
                break;
              }
            }
            if (tr) {
              this.isPerched = false;
              let escDir = (this.x > tx ? 1 : -1);
              if (this.type === 0) {
                this.vx = escDir * (1 + RND());
                this.vy = -1 - RND() * 2;
              } else {
                this.vx = escDir * (0.8 + RND() * 0.5);
                this.vy = -0.5 - RND();
              }
            }
          }
        } else {
          this.x += this.vx;
          this.y += this.vy;
          if (this.type === 0) this.x += SIN(performance.now() / 50 + this.animOffset) * 0.5;
          else if (this.type === 2) this.y = this.baseY + SIN(this.x * 0.05) * 10;
        }
      }
      draw(ts) {
        ctx.fillStyle = 'rgba(20,10,10,0.6)';
        let t = ts + this.animOffset;
        ctx.save();
        ctx.translate(FLR(this.x), FLR(this.y));
        if (this.vx < 0) ctx.scale(-1, 1);
        if (this.type === 0) {
          if (this.isPerched) ctx.fillRect(0, -2, 2, 2);
          else if ((t % 100) < 50) { ctx.fillRect(0, -1, 3, 1); ctx.fillRect(1, -2, 1, 1); }
          else { ctx.fillRect(0, -2, 2, 1); ctx.fillRect(1, -1, 1, 1); }
        } else if (this.type === 1) {
          if (this.isPerched) ctx.fillRect(0, -3, 3, 3);
          else if ((t % 200) < 100) { ctx.fillRect(-1, -1, 4, 1); ctx.fillRect(0, -2, 2, 1); }
          else { ctx.fillRect(-1, -2, 4, 1); ctx.fillRect(0, -1, 2, 1); }
        } else {
          if ((t % 1000) < 200) { ctx.fillRect(-2, -1, 6, 1); ctx.fillRect(-3, -3, 2, 2); ctx.fillRect(3, -3, 2, 2); }
          else { ctx.fillRect(-3, -1, 8, 1); ctx.fillRect(-1, -2, 4, 1); }
        }
        ctx.restore();
      }
    }

    export class Meteor {
      isLarge: boolean = false;
      scale: number = 1;
      w: number = 16;
      h: number = 16;
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      hitTimer: number = 0;
      ang: number = 0;
      rot: number = 0;
      hit?: boolean;

      init(x: number, y: number, vx: number, vy: number) {
        this.isLarge = RND() < 0.3;
        this.scale = this.isLarge ? 2 : 1;
        this.w = 16 * this.scale;
        this.h = 16 * this.scale;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.hitTimer = 0;
        this.ang = RND() * PI * 2;
        this.rot = (RND() - 0.5) * 0.06;
      }
      update() {
        if (this.hitTimer > 0) this.hitTimer--;
        this.x += this.vx;
        this.y += this.vy;
        this.ang += this.rot;
        let pc = this.isLarge ? 2 : 1;
        for (let i = 0; i < pc; i++) {
          for (let j = 0; j < 2; j++) {
            if (RND() < 0.45) {
              game.particles.push(getPt(
                this.x + RND() * 16 * this.scale,
                this.y - 4 * this.scale + RND() * 14 * this.scale,
                (RND() - 0.5) * 0.2 * this.scale,
                (RND() - 0.5) * 0.2 * this.scale,
                '#f80',
                3 + RND() * 4,
                (8 + RND() * 10) * this.scale,
                0
              ));
            }
          }
          if (RND() < 0.6) {
            let w = RND() < 0.1, c = w ? '#ddd' : '#333', s = w ? (2 + RND() * 1.5) : (4 + RND() * 3);
            game.particles.push(getPt(
              this.x + 2 * this.scale + RND() * 12 * this.scale,
              this.y - 2 * this.scale,
              (RND() - 0.5) * 0.3 * this.scale,
              (-0.2 + RND() * 0.2) * this.scale,
              c,
              s * this.scale,
              (15 + RND() * 15) * this.scale,
              0
            ));
          }
        }
      }
      draw() {
        ctx.save();
        ctx.translate(FLR(this.x + this.w / 2), FLR(this.y + this.h / 2));
        ctx.rotate(this.ang);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-8, -8);
        dR(4, 0, 8, 16, '#421');
        dR(2, 2, 12, 12, '#421');
        dR(0, 4, 16, 8, '#421');
        dR(6, 4, 4, 4, '#210');
        dR(10, 10, 2, 2, '#210');
        ctx.restore();
      }
    }

