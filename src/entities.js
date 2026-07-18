import { config } from './config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from "./utils.js";

// We will import game, ctx, IMG from game.js later.
import { game } from './state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from './game.js';

import { dR } from './renderer.js';
import { runAI } from './ai.js';

    export const P_PT = [], P_PL = [], P_CN = [], P_BD = [], P_MT = [], P_IT = [];

    export function getPt(x, y, vx, vy, c, s, l, g = 0.2, sp = false) {
      let p = P_PT.length ? P_PT.pop() : new Particle();
      p.init(x, y, vx, vy, c, s, l, g, sp);
      return p;
    }

    export function getPl(y, t = 'normal', ig = false, cx = null, cw = null, ch = null, c = 1, icy = false) {
      let p = P_PL.length ? P_PL.pop() : new Platform();
      p.init(y, t, ig, cx, cw, ch, c, icy);
      return p;
    }

    export function getCn(x, y) {
      let c = P_CN.length ? P_CN.pop() : new Coin();
      c.init(x, y);
      return c;
    }

    export function getBd(t, x, y, ip, p = null, ib = false) {
      let b = P_BD.length ? P_BD.pop() : new Bird();
      b.init(t, x, y, ip, p, ib);
      return b;
    }

    export function getMt(x, y, vx, vy) {
      let m = P_MT.length ? P_MT.pop() : new Meteor();
      m.init(x, y, vx, vy);
      return m;
    }

    export function getIt(y) {
      let i = P_IT.length ? P_IT.pop() : new Item();
      i.init(y);
      return i;
    }

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

    export function trySpawnBirdsOnPlatform(np, sc) {
      if (np.type === 'normal' && sc > game.startScore + 1000 && sc < 52000) {
        let prob = 0, maxB = 0;
        if (sc < 15000) { prob = 0.3; maxB = 2; }
        else if (sc < 40000) { prob = 0.15; maxB = 1; }
        else if (sc < 52000) { prob = 0.5; maxB = 5; }
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

    export class Player {
      constructor() {
        this.isNPC = false;
        this.reset();
      }
      reset() {
        this.w = this.h = config.playerSize;
        this.x = config.gameWidth / 2 - this.w / 2;
        this.y = config.gameHeight - 80;
        this.vx = this.vy = this.animTimer = this.baseY = 0;
        this.isFalling = this.isSuperJumping = this.isPoweredUp = this.isSparkleJumping = false;
        this.history = [];
        this.facingRight = true;
        this.squatTimer = 0;
        this.inputDir = 0;
        this.aiPath = [];
        this.visitedHistory = [];
        this.stagnationTimer = 0;
        this.adventureMode = false;
        this.lastPlatform = null;
        this.sameBounceCount = 0;
        this.apexRecalculated = false;
        this.highestReachedY = this.y;
        this.hitTimer = 0;
        this.savedIntroImg = null;
      }
      powerUp() {
        if (this.isPoweredUp) {
          if (this.isSuperJumping) this.jump(config.superJumpPower * config.glowingMovingJumpMultiplier);
          else this.jump(config.superJumpPower);
        } else {
          game.state = 'powerup_anim';
          this.animTimer = 48;
          this.baseY = this.y;
        }
      }
      update() {
        if (this.squatTimer > 0) this.squatTimer--;
        if (this.hitTimer > 0) this.hitTimer--;
        
        if (this.vx > 0.05) this.facingRight = true;
        else if (this.vx < -0.05) this.facingRight = false;
        
        this.history.unshift({ x: this.x, y: this.y, dir: this.facingRight });
        if (this.history.length > 4) this.history.pop();
        
        if (this.vy >= 0) {
          this.isSuperJumping = false;
          this.isSparkleJumping = false;
        }
        
        let mx = config.maxSpeedX, ax = config.accelX, tx = config.turnAccelX;
        if (this.isSuperJumping) {
          mx *= 1.2;
          ax *= 1.2;
        }
        
        let cDir = (this.hitTimer > 0) ? 0 : this.inputDir;
        if (cDir !== 0) {
          let turn = (this.vx > 0 && cDir < 0) || (this.vx < 0 && cDir > 0);
          this.vx += cDir * (turn ? tx : ax);
          this.vx = MAX(-mx, MIN(mx, this.vx));
        } else {
          this.vx *= (this.hitTimer > 0 ? 0.98 : config.frictionX);
          if (ABS(this.vx) < 0.05) this.vx = 0;
        }
        
        if (this.vy < 0) this.vy += config.jumpGravity;
        else {
          this.vy += config.fallGravity;
          this.vy *= config.fallFriction;
        }
        
        this.isFalling = (this.vy > 0);
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.isSparkleJumping && this.vy < -7.5 && RND() < -this.vy / 30) {
          game.particles.push(getPt(
            this.x + RND() * this.w,
            this.y + RND() * this.h,
            (RND() - 0.5) * 0.5,
            (RND() - 0.5) * 0.5,
            null, 1, 10 + RND() * 15, 0.02, true
          ));
        }
        
        if (game.state === 'intro' || this.isIntro) {
          if (this.x < 0) this.x = 0;
          if (this.x + this.w > 128) this.x = 128 - this.w;
          if (this.y > 225 && this.x < 96) this.x = 96;
        } else {
          if (this.x + this.w < 0) this.x = config.gameWidth;
          if (this.x > config.gameWidth) this.x = -this.w;
        }
        
        if (game.state === 'playing' && this.y > 208 && this.vy < 0 && game.highestPlayerY > 100) {
          if (this.x < 96) { this.x = 96; this.vx = 0; }
          if (this.x > 112) { this.x = 112; this.vx = 0; }
        }
      }
      draw() {
        let c = this.isFalling ? '#f99' : '#f00', dH = this.h, dY = this.y;
        let isPwr = this.isPoweredUp;
        if (!this.isNPC && (game.state === 'powerup_anim' || game.state === 'powerdown_anim')) {
          let s = FLR(this.animTimer / 6);
          let b = game.state === 'powerup_anim' ? (s % 2 === 0) : (s % 2 !== 0);
          dH = b ? config.playerSize * 2 : config.playerSize;
          dY = b ? this.baseY - config.playerSize : this.baseY;
          if (game.state === 'powerdown_anim') dY = b ? this.baseY : this.baseY + config.playerSize;
          isPwr = b;
        }
        
        let bA = MAX(0, MIN(1, (-this.vy - 10) / 5));
        let cImg = isPwr ? IMG.pwr : IMG.jmp;
        
        if (this.isNPC) {
          cImg = this.active ? IMG['n' + (this.npcIndex + 1) + 'j'] : IMG['n' + (this.npcIndex + 1) + 's'];
        } else if (!isPwr) {
          if (game.state === 'gameover') {
            cImg = IMG.fal;
          } else if (game.state === 'clear') {
            cImg = IMG.jmp;
          } else if (game.state === 'intro_anim') {
            cImg = this.savedIntroImg || IMG.wlk2;
          } else if (this.squatTimer > 0) {
            cImg = IMG.wlk3;
          } else if ((game.state === 'intro' || this.isIntro) && this.vy > 0) {
            if (this.y > 272) {
              cImg = IMG.fal;
            } else {
              let f = FLR(performance.now() / 100) % 3;
              cImg = f === 0 ? IMG.wlk1 : (f === 1 ? IMG.wlk2 : IMG.wlk3);
            }
          } else if (this.vy < 0 || (this.vy > 0 && this.vy < 4.68)) {
            cImg = IMG.jmp;
          } else if (this.vy >= 4.68) {
            cImg = IMG.fal;
          } else {
            if (ABS(this.vx) > 0) {
              let f = FLR(performance.now() / 100) % 3;
              cImg = f === 0 ? IMG.wlk1 : (f === 1 ? IMG.wlk2 : IMG.wlk3);
            } else {
              cImg = IMG.std;
            }
          }
        }
        
        let useSp = true;
        let vS = config.playerSpriteScale || 1, vOy = config.playerSpriteOffsetY || 0;
        let bAl = (this.hitTimer > 0 && FLR(performance.now() / 50) % 2 === 0) ? 0.2 : 1.0;
        ctx.globalAlpha = bAl;
        
        if (bA > 0 && game.state === 'playing') {
          this.history.forEach((pos, i) => {
            ctx.globalAlpha = MAX(0, 0.4 - i * 0.1) * bA * bAl;
            if (useSp && cImg.complete) {
              ctx.save();
              ctx.translate(FLR(pos.x + this.w / 2), FLR(pos.y + dH));
              if (!pos.dir) ctx.scale(-1, 1);
              if (this.hitTimer > 0 && this.isNPC) {
                ctx.translate(0, -dH / 2);
                ctx.rotate((performance.now() / 50) % (PI * 2));
                ctx.translate(0, dH / 2);
              }
              ctx.drawImage(cImg, FLR((-this.w / 2) * vS), FLR(-dH * vS + vOy), FLR(this.w * vS), FLR(dH * vS));
              ctx.restore();
            } else {
              dR(pos.x, pos.y, this.w, dH, c);
            }
          });
        }
        
        ctx.globalAlpha = bAl;
        if (useSp && cImg.complete) {
          ctx.save();
          ctx.translate(FLR(this.x + this.w / 2), FLR(dY + dH));
          if (!this.facingRight) ctx.scale(-1, 1);
          if (this.hitTimer > 0 && this.isNPC) {
            ctx.translate(0, -dH / 2);
            ctx.rotate((performance.now() / 50) % (PI * 2));
            ctx.translate(0, dH / 2);
          }
          ctx.drawImage(cImg, FLR((-this.w / 2) * vS), FLR(-dH * vS + vOy), FLR(this.w * vS), FLR(dH * vS));
          ctx.restore();
        } else {
          dR(this.x, dY, this.w, dH, c);
        }
        ctx.globalAlpha = 1.0;
      }
      jump(p) {
        let fp = p;
        if (this.isPoweredUp && p > config.superJumpPower) fp = p * config.powerJumpMultiplier;
        this.vy = fp;
        this.isSuperJumping = (fp < config.jumpPower);
        if (fp <= -20 && !this.isNPC) game.shakeAmount = (ABS(fp) - 15) * 1.5;
      }
    }

    export class NPC extends Player {
      constructor(x, y, delayMs, idx) {
        super();
        this.x = x;
        this.y = y;
        this.facingRight = false;
        this.startDelayMs = delayMs;
        this.active = false;
        this.isNPC = true;
        this.isIntro = true;
        this.frameCount = FLR(RND() * 3);
        this.waitTimer = 0;
        this.npcIndex = idx;
        this.balloonTimer = 0;
        this.balloonText = '';
      }
      draw() {
        super.draw();
        if (this.balloonTimer > 0) {
          this.balloonTimer--;
          ctx.save();
          let bx = FLR(this.x + this.w / 2);
          let by = FLR(this.y - 12);
          ctx.translate(bx, by);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          let tw = this.balloonText.length * 8 + 8;
          ctx.roundRect(-tw/2, -12, tw, 14, 4);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(-2, 2);
          ctx.lineTo(2, 2);
          ctx.lineTo(0, 6);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.balloonText, 0, -5);
          ctx.restore();
        }
      }
      update() {
        if (!this.active) {
          if (game.state === 'playing') {
            this.waitTimer += 1000 / config.targetFPS;
            if (this.waitTimer >= this.startDelayMs) this.active = true;
          }
          return;
        }
        this.frameCount++;
        if (!(this.hitTimer > 0) && this.frameCount % 3 === 0) runAI(this, logAIEvent);
        super.update();
      }
    }

    export class Platform {
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
          let cImg = this.isIcy ? IMG.i30 : IMG.p30;
          if (this.squishTimers[i] > 0) {
            let t = this.squishTimers[i];
            if (t >= 10) { dH = 22; cImg = this.isIcy ? IMG.i22 : IMG.p22; }
            else if (t >= 7) { dH = 14; cImg = this.isIcy ? IMG.i14 : IMG.p14; }
            else if (t >= 4) { dH = 22; cImg = this.isIcy ? IMG.i22 : IMG.p22; }
            dY += (this.h - dH);
          }
          if (cImg.complete && cImg.naturalWidth > 0) ctx.drawImage(cImg, FLR(px), FLR(dY), FLR(config.platformW), FLR(dH));
          else dR(px, dY, config.platformW, dH, '#A0522D');
        }
        if (isDev && game.demoMode && this.blacklisted) {
          ctx.strokeStyle = 'rgba(255,0,0,0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(FLR(this.x - 2), FLR(this.y - 2), FLR(this.w + 4), FLR(this.h + 4));
        }
      }
    }

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

    export const P_CL = [];
    
    export function getCl(x, y) {
      if (P_CL.length > 0) {
        let c = P_CL.pop();
        c.x = x;
        c.y = y;
        c.speed = RND() < 0.5 ? 0.6 : 0.8;
        c.scale = c.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
        c.type = FLR(RND() * 3);
        return c;
      }
      return new BackgroundCloud(x, y);
    }
    
    export class BackgroundCloud {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = RND() < 0.5 ? 0.6 : 0.8;
        this.scale = this.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
        this.type = FLR(RND() * 3);
      }
    }

