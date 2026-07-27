import { config } from '../config.js';
import { RND, FLR, ABS } from '../utils.js';
import { game } from '../state.js';
import { dR } from '../renderer.js';
import { spawnParticles } from './particles.js';
import { ObjectPool } from './pool.js';

export const P_CN = new ObjectPool<Coin>(() => new Coin());
export const P_IT = new ObjectPool<Item>(() => new Item());

export function getCn(x: number, y: number) {
  let c = P_CN.get();
  c.init(x, y);
  return c;
}

export function getIt(y: number, type: 'red' | 'green' = 'red', overrideX?: number) {
  let i = P_IT.get();
  i.init(y, type, overrideX);
  return i;
}

    export class Item {
      x: number = 0;
      y: number = 0;
      w: number = 16;
      h: number = 16;
      type: 'red' | 'green' = 'red';
      collected: boolean = false;
      blacklisted: boolean = false;
      
      init(y: number, type: 'red' | 'green' = 'red', overrideX?: number) {
        this.w = 16;
        this.h = 16;
        this.y = FLR(y);
        this.type = type;
        this.collected = false;
        this.blacklisted = false;
        if (overrideX !== undefined) {
          this.x = FLR(overrideX);
          return;
        }
        let ol = true, at = 0, nx = 0;
        while (ol && at < 20) {
          nx = RND() * (config.gameWidth - this.w);
          ol = false;
          if (this.y < 230 && this.y > -1500) {
            let avoidW = 28, cx = config.gameWidth / 2;
            if (nx + this.w > cx - avoidW && nx < cx + avoidW) ol = true;
          }
          if (!ol) {
            for (let p of game.platforms) {
              let px = p.x, py = p.y, pw = p.w, ph = p.h;
              if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
              else if (p.type === 'v-slide') { py = p.startY - 50; ph = p.h + 100; }
              if (ABS(p.y - this.y) < this.h + 2 && nx < px + pw + 2 && nx + this.w + 2 > px) { ol = true; break; }
            }
            if (!ol) {
              for (let c of game.coins) {
                if (ABS(this.y - c.y) < this.h + 2 && nx < c.x + c.w + 2 && nx + this.w + 2 > c.x) { ol = true; break; }
              }
            }
          }
          at++;
        }
        this.x = FLR(nx);
      }
      draw() {
        if (this.collected) return;
        dR(this.x + 5, this.y + 8, 6, 6, '#fcc');
        dR(this.x + 2, this.y + 2, 12, 6, this.type === 'green' ? '#2c2' : '#f33');
        dR(this.x + 4, this.y + 4, 3, 3, '#fff');
        dR(this.x + 9, this.y + 4, 3, 3, '#fff');
      }
    }

    export class Coin {
      x: number = 0;
      y: number = 0;
      w: number = 12;
      h: number = 12;
      hitW: number = 20;
      hitH: number = 16;
      collected: boolean = false;
      animTimer: number = 0;
      dead: boolean = false;
      vy: number = 0;
      mvx: number = 0;
      mvy: number = 0;

      init(x: number, y: number) {
        this.w = 12;
        this.h = 12;
        this.hitW = 20;
        this.hitH = 16;
        this.x = FLR(x);
        this.y = FLR(y);
        this.collected = false;
        this.animTimer = 0;
        this.dead = false;
        this.vy = 0;
        this.mvx = 0;
        this.mvy = 0;
      }
      update() {
        if (this.collected && !this.dead) {
          this.animTimer--;
          this.y += this.vy;
          this.vy += 0.3;
          if (this.animTimer <= 0) {
            this.dead = true;
          }
        }
      }
      draw() {
        if (this.dead) return;
        if (!this.collected) {
          dR(this.x + 2, this.y, 8, 12, '#fd0');
          dR(this.x, this.y + 2, 12, 8, '#fd0');
          dR(this.x + 4, this.y + 2, 4, 8, '#ff9');
        } else {
          let p = FLR((30 - this.animTimer) / 3) % 4;
          if (p === 0) {
            dR(this.x + 2, this.y, 8, 12, '#fd0');
            dR(this.x, this.y + 2, 12, 8, '#fd0');
            dR(this.x + 4, this.y + 2, 4, 8, '#ff9');
          } else if (p === 1 || p === 3) {
            dR(this.x + 4, this.y, 4, 12, '#fd0');
            dR(this.x + 2, this.y + 2, 8, 8, '#fd0');
            dR(this.x + 4, this.y + 2, 2, 8, '#ff9');
          } else {
            dR(this.x + 5, this.y, 2, 12, '#fd0');
            dR(this.x + 5, this.y + 2, 2, 8, '#ff9');
          }
        }
      }
    }

    export class FlyingCoin {
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      cx: number;
      cy: number;
      progress: number;
      maxProgress: number;
      dead: boolean;
      animTimer: number;
      onArrive?: () => void;

      constructor(worldX: number, worldY: number, onArrive?: () => void) {
        this.sx = FLR(worldX);
        this.sy = FLR(worldY - game.cameraY);
        this.tx = 16;
        this.ty = 16;
        let midX = (this.sx + this.tx) / 2;
        let midY = (this.sy + this.ty) / 2;
        this.cx = midX - 20;
        this.cy = midY - 15;
        this.progress = 0;
        this.maxProgress = 22;
        this.dead = false;
        this.animTimer = 0;
        this.onArrive = onArrive;
      }

      update() {
        if (this.dead) return;
        this.progress++;
        this.animTimer++;

        if (this.progress % 2 === 0) {
          let pos = this.getPos();
          spawnParticles(pos.x, pos.y + game.cameraY, '#ff9', 1, 1);
        }

        if (this.progress >= this.maxProgress) {
          this.dead = true;
          spawnParticles(this.tx, this.ty + game.cameraY, '#fd0', 8, 2.5);

          if (this.onArrive) {
            try { this.onArrive(); } catch (e) {}
          }

          let uiLayer = document.getElementById('ui');
          if (uiLayer) {
            let coinIcon = uiLayer.querySelector('.coin-icon');
            let coinContainer = coinIcon ? coinIcon.parentElement : null;
            if (coinContainer) {
              coinContainer.animate([
                { transform: 'scale(1)', filter: 'brightness(1)' },
                { transform: 'scale(1.6)', filter: 'brightness(2)' },
                { transform: 'scale(1)', filter: 'brightness(1)' }
              ], { duration: 250, easing: 'ease-out' });
            }
          }
        }
      }

      getPos() {
        let t = this.progress / this.maxProgress;
        let easeT = t * t;
        let u = 1 - easeT;
        let x = u * u * this.sx + 2 * u * easeT * this.cx + easeT * easeT * this.tx;
        let y = u * u * this.sy + 2 * u * easeT * this.cy + easeT * easeT * this.ty;
        return { x: FLR(x), y: FLR(y) };
      }

      draw() {
        if (this.dead) return;
        let pos = this.getPos();
        let x = pos.x;
        let y = pos.y;
        let p = FLR(this.animTimer / 2) % 4;

        if (p === 0) {
          dR(x - 4, y - 6, 8, 12, '#fd0');
          dR(x - 6, y - 4, 12, 8, '#fd0');
          dR(x - 2, y - 4, 4, 8, '#ff9');
        } else if (p === 1 || p === 3) {
          dR(x - 2, y - 6, 4, 12, '#fd0');
          dR(x - 4, y - 4, 8, 8, '#fd0');
          dR(x - 2, y - 4, 2, 8, '#ff9');
        } else {
          dR(x - 1, y - 6, 2, 12, '#fd0');
          dR(x - 1, y - 4, 2, 8, '#ff9');
        }
      }
    }

