
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';
import { getPt } from './index.js'; // Needed by Player, etc
export class Particle {
      init(x, y, vx, vy, color, size, life, g = 0.2, isSp = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.g = g;
        this.isSp = isSp;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.g;
        this.life--;
      }
      draw() {
        if (this.isSp === true) {
          let b = this.life % 6 < 3, s = b ? 4 : 2, c = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'][FLR(RND() * 7)];
          ctx.globalAlpha = 0.9;
          dR(this.x - 1, this.y - s, 2, s * 2, c);
          dR(this.x - s, this.y - 1, s * 2, 2, c);
          if (b) dR(this.x, this.y, 2, 2, '#fff');
        } else {
          ctx.globalAlpha = MAX(0, MIN(1.0, (this.life / this.maxLife) * 2.0));
          dR(this.x, this.y, this.size, this.size, this.color);
        }
        ctx.globalAlpha = 1.0;
      }
    }

    export function spawnParticles(x, y, color, count, speed = 4, effectType = 'burst') {
      for (let i = 0; i < count; i++) {
        let vx, vy;
        if (effectType === 'collapse') {
          vx = (RND() - 0.5) * (speed * 0.5);
          vy = RND() * speed;
        } else {
          vx = (RND() - 0.5) * speed;
          vy = (RND() - 1) * speed;
        }
        game.particles.push(getPt(x, y, vx, vy, color, 3 + RND() * 3, 10 + RND() * 15));
      }
    }

    export function spawnDebris(x, y, w, h, color, count) {
      for (let i = 0; i < count; i++) {
        let px = x + RND() * w;
        let py = y + RND() * h;
        let vx = (RND() - 0.5) * 3;
        let vy = RND() * 1.5;
        let size = 6 + RND() * 10;
        let life = 60 + RND() * 30;
        let pt = getPt(px, py, vx, vy, color, size, life);
        pt.g = 0.15 + RND() * 0.1;
        game.particles.push(pt);
      }
    }
