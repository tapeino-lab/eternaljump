import { config } from '../config.js';
import { RND, FLR, ABS, PI, MAX, MIN } from '../utils.js';
import { ctx, IMG, groundCache, groundCached } from '../game.js';
import { game } from '../state.js';
import { getPt } from './particles.js';
import { dR } from '../renderer.js';

export const P_PL: Platform[] = [];

    export function getPl(y, t = 'normal', ig = false, cx = null, cw = null, ch = null, c = 1, icy = false) {
      let p = P_PL.length ? P_PL.pop() : new Platform();
      p.init(y, t, ig, cx, cw, ch, c, icy);
      return p;
    }
    export class Platform {
      [key: string]: any;
      init(y, t = 'normal', ig = false, cx = null, cw = null, ch = null, count = 1, isIcy = false) {
        this.isGround = ig;
        this.count = count;
        this.isIcy = isIcy;
        this.type = t;
        if (ch !== null) { this.h = ch; }
        else if (ig) { this.h = 32; }
        else { this.h = 30; }
        
        this.w = cw !== null ? cw : (ig ? config.gameWidth : config.platformW * count);
        this.y = this.startY = FLR(y);
        this.direction = RND() < 0.5 ? 1 : -1;
        this.squishTimers = new Array(count).fill(0);
        this.breakOnSquish = new Array(count).fill(false);
        this.isGlowing = ((t === 'h-slide' || t === 'v-slide') && !ig && RND() < config.glowingMovingProb);
        this.broken = false;
        this.blacklisted = false;
        this.noEffect = false;
        this.isOverlapping = false;
        
        if (cx !== null) {
          this.x = FLR(cx);
        } else if (ig) {
          this.x = 0;
        } else {
          let minX = 0, maxX = config.gameWidth - this.w;
          if (t === 'h-slide') {
            minX = config.gameWidth / 6;
            maxX = config.gameWidth - this.w - config.gameWidth / 6;
          } else if ((game.baseScoreY - this.y) * config.scoreMultiplier < 20000 && game.platforms.length > 0) {
            let lp = game.platforms[game.platforms.length - 1];
            minX = MAX(0, lp.x + lp.w / 2 - 90 - this.w / 2);
            maxX = MIN(config.gameWidth - this.w, lp.x + lp.w / 2 + 90 - this.w / 2);
            if (maxX < minX) maxX = minX;
          }
          
          let ol = true, at = 0, nx = 0;
          while (ol && at < 20) {
            nx = minX + RND() * (maxX - minX);
            ol = false;
            if (this.type !== 'goal' && !ig && this.y < 230 && this.y > -1500) {
              let avoidW = 28, cx = config.gameWidth / 2;
              if (nx + this.w > cx - avoidW && nx < cx + avoidW) ol = true;
            }
            if (!ol) {
              for (let p of game.platforms) {
                if (ABS(p.y - this.y) < this.h + 2) {
                  let px = p.x, pw = p.w;
                  if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
                  if (nx < px + pw + 2 && nx + this.w + 2 > px) { ol = true; break; }
                }
              }
              let pX = nx, pY = this.y, pW = this.w, pH = this.h;
              if (t === 'h-slide') { pX = nx - config.gameWidth / 6; pW = this.w + config.gameWidth / 3; }
              else if (t === 'v-slide') { pY = this.y - 50; pH = this.h + 100; }
              if (!ol) {
                for (let it of game.items) {
                  if (ABS(this.y - it.y) < this.h + 2 && nx < it.x + it.w + 2 && nx + this.w + 2 > it.x) { ol = true; break; }
                }
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
          this.isOverlapping = ol;
        }
        this.startX = this.x;
        this.isIntroCover = false;
        this.blink = false;
        this.isCrumbling = false;
      }
      update() {
        if (this.isCrumbling && this.h > 0) {
          let crumbleAmount = 15;
          let prevY = this.y;
          this.y += crumbleAmount;
          this.h -= crumbleAmount;
          if (this.h <= 0) {
            crumbleAmount += this.h; // adjust last step
            this.h = 0;
            this.broken = true;
            this.isCrumbling = false;
          }
          
          let weight = this.h / 400;
          let numRocks = Math.floor(1 + weight * 4 + RND() * 3);
          for (let j = 0; j < numRocks; j++) {
            let margin = 4;
            let px = this.x + margin + RND() * (this.w - margin * 2);
            let py = prevY + RND() * crumbleAmount;
            let vx = (RND() - 0.5) * 0.4;
            let vy = RND() * 1.5 + 0.5;
            let size = 3 + RND() * 6;
            let life = 60 + RND() * 40;
            let pt = getPt(px, py, vx, vy, '#A0522D', size, life);
            pt.g = 0.05 + RND() * 0.05;
            game.particles.push(pt);
          }
          
          let numDust = Math.floor(2 + weight * 6 + RND() * 4);
          let dC = ['#A0522D', '#D2B48C', '#DEB887', '#aaa'];
          for (let j = 0; j < numDust; j++) {
            let px = this.x + RND() * this.w;
            let py = prevY + RND() * crumbleAmount;
            let vx = (RND() - 0.5) * 2;
            let vy = (RND() - 0.5) * 1 + 0.5;
            let size = 2 + RND() * 4;
            let life = 40 + RND() * 40;
            let pt = getPt(px, py, vx, vy, dC[FLR(RND() * 4)], size, life);
            pt.g = 0.01;
            game.particles.push(pt);
          }
          return;
        }

        for (let i = 0; i < this.count; i++) {
          if (this.squishTimers[i] > 0) {
            this.squishTimers[i]--;
            if (this.squishTimers[i] === 0 && this.isIcy && !this.broken && this.breakOnSquish[i]) {
              this.broken = true;
              let cX = this.x + i * config.platformW + 8, cY = this.y + 15, iC = ['#fff', '#e0ffff', '#b0e0e6', '#f0ffff'];
              for (let p = 0; p < 8; p++) game.particles.push(getPt(cX + (RND() - 0.5) * 8, cY + (RND() - 0.5) * 8, (RND() - 0.5) * 6, (RND() - 0.5) * 4 - 1, '#fff', 2 + RND() * 2, 15 + RND() * 10, 0.2 + RND() * 0.1));
              for (let p = 0; p < 20; p++) game.particles.push(getPt(cX + (RND() - 0.5) * 12, cY + (RND() - 0.5) * 12, (RND() - 0.5) * 1.5, (RND() - 0.8) * 1, iC[FLR(RND() * 4)], RND() * 1.5, 30 + RND() * 45, 0.005 + RND() * 0.015));
            }
          }
        }
        if ((this.type === 'super' || this.isGlowing) && !this.broken && !this.noEffect) {
          let sV = this.isGlowing ? 0.3 : 0.15;
          sV *= this.count;
          while (RND() < sV) {
            game.particles.push(getPt(this.x + RND() * this.w, this.y - 12 + RND() * (this.h + 12), (RND() - 0.5) * 0.1, -0.16 - RND() * 0.17, null, 1, 15 + RND() * 20, 0, true));
            sV -= 1;
          }
        }
        if (this.type === 'h-slide') {
          this.x += config.hSlideSpeed * this.direction;
          let mr = config.gameWidth / 3;
          if (this.x <= this.startX - mr / 2 || this.x + this.w >= this.startX + mr / 2 || this.x <= 0 || this.x + this.w >= config.gameWidth) this.direction *= -1;
        } else if (this.type === 'v-slide') {
          this.y += config.vSlideSpeed * this.direction;
          if (ABS(this.y - this.startY) > 50) this.direction *= -1;
        }
      }
      draw() {
        if (this.broken) return;
        if (this.type === 'goal') {
          ctx.fillStyle = '#eef';
          ctx.fillRect(FLR(this.x), FLR(this.y), FLR(this.w), FLR(this.h));
          for (let i = 0; i <= this.w / 20; i++) {
            ctx.beginPath();
            ctx.arc(FLR(this.x + i * 20), FLR(this.y), 14, 0, PI * 2);
            ctx.fill();
          }
          return;
        }
        if (this.isGround) {
          if (this.isIntroCover && this.blink) ctx.globalAlpha = 0.3;
          if (groundCached) {
            ctx.drawImage(groundCache, this.x, 0, this.w, this.h, this.x, this.y, this.w, this.h);
          } else {
            dR(this.x, this.y, this.w, this.h, '#A0522D');
          }
          if (this.isIntroCover && this.blink) ctx.globalAlpha = 1.0;
          return;
        }
        for (let i = 0; i < this.count; i++) {
          let dY = this.y, dH = this.h, px = this.x + i * config.platformW;
          
          let isSpecial = (this.type === 'h-slide' || this.type === 'v-slide' || this.isGlowing);
          let cImg = this.isIcy ? IMG.i30 : (isSpecial && !this.isGround ? IMG.pm30 : IMG.p30);
          
          if (this.squishTimers[i] > 0) {
            let t = this.squishTimers[i];
            if (t >= 10) { dH = 22; cImg = this.isIcy ? IMG.i22 : (isSpecial && !this.isGround ? IMG.pm22 : IMG.p22); }
            else if (t >= 7) { dH = 14; cImg = this.isIcy ? IMG.i14 : (isSpecial && !this.isGround ? IMG.pm14 : IMG.p14); }
            else if (t >= 4) { dH = 22; cImg = this.isIcy ? IMG.i22 : (isSpecial && !this.isGround ? IMG.pm22 : IMG.p22); }
            dY += (this.h - dH);
          }
          if (cImg.complete && cImg.naturalWidth > 0) ctx.drawImage(cImg, FLR(px), FLR(dY), FLR(config.platformW), FLR(dH));
          else dR(px, dY, config.platformW, dH, '#A0522D');
        }
      }
    }

