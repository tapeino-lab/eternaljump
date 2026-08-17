import { config } from '../config.js';
import { ABS, FLR, SIN, POW, MAX, MIN, RND, PI, hasPlayedOnce } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, GREEN_IMG, SNOW_IMG, GREEN_SNOW_IMG, BLUE_IMG, BLUE_SNOW_IMG } from '../display.js';

import { dR } from '../renderer/core.js';

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
      facingDirFrames: number = 0;
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
      savedIntroImgKey: any = null;
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
      samePlatformVertJumps?: number;
      platformTheyJumpedFrom?: any;
      aiLockedTarget?: any;
      aiLockedFromNormalJump?: boolean;
      aiLookAheadTarget?: any;
      aiBoostAppliedThisJump?: boolean;
      isCleared: boolean = false;
      recentExternalCollisionTimer: number = 0;
      inGreenMushroomChain: boolean = false;
      nearOtherEntityFrames?: number;
      aiLevel?: 'smart' | 'basic';
      breakoutTimer?: number;
      breakoutDir?: number;

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
        this.inGreenMushroomChain = false;
        this.history = [
          { x: this.x, y: this.y, dir: true },
          { x: this.x, y: this.y, dir: true },
          { x: this.x, y: this.y, dir: true },
          { x: this.x, y: this.y, dir: true }
        ];
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
        this.savedIntroImgKey = null;
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
        this.frameCount++;
        if (this.squatTimer > 0) this.squatTimer--;
        if (this.hitTimer > 0) this.hitTimer--;
        if (this.recentExternalCollisionTimer > 0) this.recentExternalCollisionTimer--;
        
        if (this.vx > 0.08) {
          this.facingDirFrames = Math.min(15, Math.max(1, this.facingDirFrames + 1));
        } else if (this.vx < -0.08) {
          this.facingDirFrames = Math.max(-15, Math.min(-1, this.facingDirFrames - 1));
        } else {
          if (this.facingDirFrames > 0) this.facingDirFrames = Math.max(0, this.facingDirFrames - 0.5);
          else if (this.facingDirFrames < 0) this.facingDirFrames = Math.min(0, this.facingDirFrames + 0.5);
        }

        if (game.aiActive || game.demoMode) {
          // AI Mode: require consistent travel direction for at least 10 frames before visually flipping
          if (this.facingDirFrames >= 10) {
            this.facingRight = true;
          } else if (this.facingDirFrames <= -10) {
            this.facingRight = false;
          }
        } else {
          // Manual Mode: respond immediately to prevent laggy visual feel
          if (this.vx > 0.05) this.facingRight = true;
          else if (this.vx < -0.05) this.facingRight = false;
        }
        
        let last = this.history.pop();
        if (last) {
          last.x = this.x;
          last.y = this.y;
          last.dir = this.facingRight;
          this.history.unshift(last);
        }
        
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
          let f = this.hitTimer > 0 ? 0.98 : config.frictionX;
          if (this.isCleared) f = 0.96;
          this.vx *= f;
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
          if (game.state === 'intro' && this.y >= 200 && (this.x + this.w / 2) <= 17) {
            if (hasPlayedOnce() && !game.demoMode) {
              game.state = 'shop';
              this.x = 17 - this.w / 2;
              this.vx = 0;
            } else if (this.x < 0) {
              this.x = 0;
            }
          } else if (this.x < 0) {
            this.x = 0;
          }
          if (this.x + this.w > 128) this.x = 128 - this.w;
          if (hasPlayedOnce() && this.y > 225 && (this.x + this.w / 2) > 17 && this.x < 96) this.x = 96;
        } else {
          if (this.x + this.w < 0) {
            this.x = config.gameWidth;
          }
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
        
        let imgKey = isPwr ? 'pwr' : 'jmp';
        if (this.isNPC) {
          if (this.isCleared) {
            imgKey = 'n' + (this.npcIndex + 1) + 's';
          } else {
            imgKey = this.active ? ('n' + (this.npcIndex + 1) + 'j') : ('n' + (this.npcIndex + 1) + 's');
          }
        } else if (!isPwr) {
          if (game.state === 'gameover') {
            imgKey = 'fal';
          } else if (game.state === 'clear') {
            imgKey = 'jmp';
          } else if (game.state === 'intro_anim') {
            imgKey = (!this.isNPC && this.savedIntroImgKey) ? this.savedIntroImgKey : 'wlk2';
          } else if (this.squatTimer > 0) {
            imgKey = 'wlk3';
          } else if ((game.state === 'intro' || this.isIntro) && this.vy > 0) {
            if (this.y > 272) {
              imgKey = 'fal';
            } else {
              let f = FLR(performance.now() / 100) % 3;
              imgKey = f === 0 ? 'wlk1' : (f === 1 ? 'wlk2' : 'wlk3');
            }
          } else if (this.vy < 0 || (this.vy > 0 && this.vy < 4.68)) {
            imgKey = 'jmp';
          } else if (this.vy >= 4.68) {
            imgKey = 'fal';
          } else {
            if (ABS(this.vx) > 0) {
              let f = FLR(performance.now() / 100) % 3;
              imgKey = f === 0 ? 'wlk1' : (f === 1 ? 'wlk2' : 'wlk3');
            } else {
              imgKey = 'std';
            }
          }
        }
        
        let cImg: any = IMG[imgKey];
        let drawImg: any = cImg;
        if (!this.isNPC) {
          const hasMushroom = game.equipped?.['mushroom'];
          const hasMagnet = game.equipped?.['magnet'];
          const hasSkates = game.equipped?.['skates'];
          if (hasMagnet) {
            if (hasSkates && BLUE_SNOW_IMG[imgKey]) {
              drawImg = BLUE_SNOW_IMG[imgKey];
            } else if (BLUE_IMG[imgKey]) {
              drawImg = BLUE_IMG[imgKey];
            }
          } else if (hasMushroom) {
            if (hasSkates && GREEN_SNOW_IMG[imgKey]) {
              drawImg = GREEN_SNOW_IMG[imgKey];
            } else if (GREEN_IMG[imgKey]) {
              drawImg = GREEN_IMG[imgKey];
            }
          } else if (hasSkates && SNOW_IMG[imgKey]) {
            drawImg = SNOW_IMG[imgKey];
          }
        }
        
        let useSp = true;
        let vS = config.playerSpriteScale || 1, vOy = config.playerSpriteOffsetY || 0;
        let bAl = (this.hitTimer > 0 && FLR(performance.now() / 50) % 2 === 0) ? 0.2 : 1.0;
        ctx.globalAlpha = bAl;
        
        if (bA > 0 && game.state === 'playing') {
          for (let i = 0; i < this.history.length; i++) {
            let pos = this.history[i];
            ctx.globalAlpha = MAX(0, 0.4 - i * 0.1) * bA * bAl;
            if (useSp && (drawImg.complete || drawImg.width > 0)) {
              ctx.save();
              ctx.translate(FLR(pos.x + this.w / 2), FLR(pos.y + dH));
              if (!pos.dir) ctx.scale(-1, 1);
              if (this.hitTimer > 0 && this.isNPC) {
                ctx.translate(0, -dH / 2);
                ctx.rotate((performance.now() / 50) % (PI * 2));
                ctx.translate(0, dH / 2);
              }
              ctx.drawImage(drawImg, FLR((-this.w / 2) * vS), FLR(-dH * vS + vOy), FLR(this.w * vS), FLR(dH * vS));
              this.drawHelmet(dH, vS, vOy, cImg);
              this.drawRod(dH, vS, vOy, imgKey);
              ctx.restore();
            } else {
              dR(pos.x, pos.y, this.w, dH, c);
            }
          }
        }
        
        ctx.globalAlpha = bAl;
        if (useSp && (drawImg.complete || drawImg.width > 0)) {
          ctx.save();
          ctx.translate(FLR(this.x + this.w / 2), FLR(dY + dH));
          if (!this.facingRight) ctx.scale(-1, 1);
          if (this.hitTimer > 0 && this.isNPC) {
            ctx.translate(0, -dH / 2);
            ctx.rotate((performance.now() / 50) % (PI * 2));
            ctx.translate(0, dH / 2);
          }
          ctx.drawImage(drawImg, FLR((-this.w / 2) * vS), FLR(-dH * vS + vOy), FLR(this.w * vS), FLR(dH * vS));
          this.drawHelmet(dH, vS, vOy, cImg);
          this.drawRod(dH, vS, vOy, imgKey);
          ctx.restore();
        } else {
          dR(this.x, dY, this.w, dH, c);
        }
        ctx.globalAlpha = 1.0;
      }

      drawRod(dH: number, vS: number, vOy: number, imgKey: string) {
        if (this.isNPC || !game.equipped?.["rod"]) return;
        if (imgKey !== "jmp" && imgKey !== "pwr") return;

        let startX = FLR(5 * vS);
        let startY = FLR(-dH * vS + vOy - 5 * vS);

        // Stick
        ctx.fillStyle = "#888";
        ctx.fillRect(startX, startY + 4 * vS, 2 * vS, 4 * vS);
        ctx.fillStyle = "#ccc";
        ctx.fillRect(startX, startY + 4 * vS, 1 * vS, 4 * vS);
        ctx.fillStyle = "#fff";
        ctx.fillRect(startX, startY + 4 * vS, 1 * vS, 1 * vS);

        // Sphere
        ctx.fillStyle = "#ddd";
        ctx.fillRect(startX - 1 * vS, startY + 1 * vS, 4 * vS, 4 * vS);
        ctx.fillStyle = "#777";
        ctx.fillRect(startX - 1 * vS, startY + 4 * vS, 4 * vS, 1 * vS);
        ctx.fillRect(startX + 2 * vS, startY + 1 * vS, 1 * vS, 4 * vS);
        ctx.fillStyle = "#fff";
        ctx.fillRect(startX, startY + 1 * vS, 2 * vS, 2 * vS);

        // Sparkle occasionally
        let sparkPhase = (performance.now() / 80) % 80;
        if (sparkPhase < 8) {
          let seed = FLR(performance.now() / 6400);
          let offsetX = SIN(seed * 7) * 4 * vS;
          let offsetY = SIN(seed * 13) * 4 * vS;
          ctx.save();
          let sx = startX + 1 * vS + offsetX;
          let sy = startY - 1 * vS + offsetY;
          ctx.translate(sx + 0.5 * vS, sy + 0.5 * vS);
          ctx.rotate(performance.now() / 100);
          let scale = SIN((sparkPhase / 8) * PI) * 1.5;
          ctx.scale(scale, scale);
          ctx.fillStyle = "#fff";
          ctx.fillRect(-0.5 * vS, -4 * vS, 1 * vS, 8 * vS);
          ctx.fillRect(-4 * vS, -0.5 * vS, 8 * vS, 1 * vS);
          ctx.rotate(PI / 4);
          ctx.fillRect(-0.5 * vS, -2 * vS, 1 * vS, 4 * vS);
          ctx.fillRect(-2 * vS, -0.5 * vS, 4 * vS, 1 * vS);
          ctx.restore();
        }
      }

      drawHelmet(dH: number, vS: number, vOy: number, cImg?: HTMLImageElement) {
        if (this.isNPC || !game.equipped?.['helmet']) return;
        
        // 巨大化してもヘルメットのサイズは変えない (固定のコンパクトサイズ)
        let helmW = 10;
        let helmH = 5;
        
        // 基本位置：頭の上にセット (yShift = -2)
        let yShift = -2;
        
        // 巨大化時は頭の位置に合わせてさらに1px下げる (+2px)
        if (this.isPoweredUp) {
          yShift += 2;
        }
        
        // 速度による慣性ずらし (明確かつシンプルな一元化ルール)
        if (this.vy < -1.5) {
          // 上昇中：押し付けられて1px下にずれる
          yShift += 1;
        } else if (this.vy > 3.5) {
          // 急落下中：風圧で上に浮き上がる (チビの時はさらに2px上げる)
          yShift -= this.isPoweredUp ? 2 : 4;
        } else if (this.vy > 0) {
          // 通常落下中：風圧で1px上に浮き上がる
          yShift -= 1;
        }

        let topY = -dH * vS + vOy + yShift;
        let startX = -Math.floor(helmW / 2);

        // 落ちる画像（IMG.fal）などで正面を向いているか
        let isFrontFalling = (cImg === IMG.fal);

        // 1. 黄色ドームベース (#ffdd00) - 上部左右を削って丸みを持たせる
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(startX + 2, topY, helmW - 4, 1); // 頂点部 (丸み)
        ctx.fillRect(startX, topY + 1, helmW, helmH - 1); // 本体

        // 2. ツバ (正面落下の時はツバなし)
        if (!isFrontFalling) {
          // 右向き（進行方向）に2pxツバを出す
          ctx.fillRect(startX, topY + helmH - 1, helmW + 2, 1);
          ctx.fillStyle = '#d4a000'; // ツバ影
          ctx.fillRect(startX + helmW, topY + helmH, 2, 1);
        } else {
          ctx.fillStyle = '#d4a000'; // 底面影
          ctx.fillRect(startX, topY + helmH, helmW, 1);
        }

        // 3. オレンジのリブ (正面時は中央、横向き時は進行方向寄り)
        ctx.fillStyle = '#ff8800';
        let ribX = isFrontFalling ? (startX + Math.floor(helmW / 2) - 1) : (startX + Math.floor(helmW * 0.4));
        ctx.fillRect(ribX, topY, 2, helmH);

        // 4. 白いハイライト (丸みのツヤ)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(startX + 2, topY + 1, 2, 1);
      }
      jump(p) {
        let fp = p;
        if (this.isPoweredUp && p > config.superJumpPower) fp = p * config.powerJumpMultiplier;
        this.vy = fp;
        this.isSuperJumping = (fp < config.jumpPower);
        if (fp <= -20 && !this.isNPC) game.shakeAmount = (ABS(fp) - 15) * 1.5;
      }
    }
