
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';
import { getPt } from './index.js'; // Needed by Player, etc
export class Meteor {
      init(x, y, vx, vy) {
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

    