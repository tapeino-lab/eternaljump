import { Player } from './player.js';
import { config } from '../config.js';
import { ABS, FLR, SIN, POW, MAX, MIN, RND, PI, hasPlayedOnce } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG } from '../display.js';

import { dR } from '../renderer/core.js';

import { getPt } from './particles.js';
import { runAI } from '../ai.js';
import { spawnParticles } from './particles.js';

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
        if (!(this.hitTimer > 0)) runAI(this);
        super.update();
      }
    }

