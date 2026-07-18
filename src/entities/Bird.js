
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';
import { getPt } from './index.js'; // Needed by Player, etc
export class Bird {
      init(type, x, y, isPerched, platform = null, isTitleBird = false) {
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

    