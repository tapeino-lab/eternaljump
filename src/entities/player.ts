import { config } from '../config.js';
import { ABS, FLR, SIN, POW, MAX, MIN, RND, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG } from '../game.js';
import { dR } from '../renderer.js';
import { getPt } from './particles.js';
import { runAI } from '../ai.js';
import { spawnParticles } from './particles.js';

    export class Player {
      isNPC: boolean = false;
      isIntro: boolean = false;
      w: number = 0;
      h: number = 0;
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      animTimer: number = 0;
      baseY: number = 0;
      inputDir: number = 0;
      facingRight: boolean = true;
      hitTimer: number = 0;
      squatTimer: number = 0;
      isPoweredUp: boolean = false;
      isSuperJumping: boolean = false;
      isSparkleJumping: boolean = false;
      lastPlatform: any = null;
      highestReachedY: number = 0;
      sameBounceCount: number = 0;
      stagnationTimer: number = 0;
      visitedHistory: any[] = [];
      savedIntroImg: any = null;
      frameCount: number = 0;
      isFalling: boolean = false;
      apexRecalculated: boolean = false;
      savedVx?: number;
      savedVy?: number;
      
      // NPC properties
      npcIndex?: number;
      startDelayMs?: number;
      waitTimer?: number;
      active?: boolean;
      balloonTimer?: number;
      balloonText?: string;
      adventureMode?: boolean;
      history?: any[];
      aiPath?: any[];
      aiTarget?: any;
      aiThinkTimer?: number;
      prevLastPlatform?: any;
      recentPlatforms?: any[];

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
          if (ctx.font !== '8px "Press Start 2P", monospace') ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.balloonText, 0, -5);
          ctx.restore();
        }
      }
      update() {
        if (this.balloonTimer > 0) this.balloonTimer--;
        if (!this.active) {
          if (game.state === 'playing') {
            this.waitTimer += 1000 / config.targetFPS;
            if (this.waitTimer >= this.startDelayMs) this.active = true;
          }
          return;
        }
        this.frameCount++;
        if (!(this.hitTimer > 0) && this.frameCount % 3 === 0) runAI(this);
        super.update();
      }
    }

