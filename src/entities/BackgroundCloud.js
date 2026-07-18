
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from '../utils.js';
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';
import { getPt } from './index.js'; // Needed by Player, etc
export class BackgroundCloud {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = RND() < 0.5 ? 0.6 : 0.8;
        this.scale = this.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
        this.type = FLR(RND() * 3);
      }
    }

