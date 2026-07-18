
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';
import { getPt } from './index.js'; // Needed by Player, etc
export class Coin {
      init(x, y) {
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

    