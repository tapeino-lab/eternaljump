
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';
import { getPt } from './index.js'; // Needed by Player, etc
export class Item {
      init(y) {
        this.w = 16;
        this.h = 16;
        this.y = FLR(y);
        this.collected = false;
        this.blacklisted = false;
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
        dR(this.x + 4, this.y + 8, 8, 8, '#fcc');
        dR(this.x, this.y, 16, 8, '#f33');
        dR(this.x + 2, this.y + 2, 4, 4, '#fff');
        dR(this.x + 10, this.y + 2, 4, 4, '#fff');
        if (isDev && game.demoMode && this.blacklisted) {
          ctx.strokeStyle = 'rgba(255,0,0,0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(FLR(this.x - 2), FLR(this.y - 2), FLR(this.w + 4), FLR(this.h + 4));
        }
      }
    }

    