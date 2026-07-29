import type { GameState } from "./types.js";
import { applyCoinCountUp } from './ui-effects.js';
import { config } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, P_PT, P_PL, P_IT, P_CN, P_CL, getFc } from './entities/index.js';
import { RND, FLR, MAX, MIN, $, swapRemove } from './utils.js';
import { initGame } from './lifecycle.js';

import { RankingAPI } from './ranking.js';

export function updatePlayingState(game: GameState, setIgnoreNextTap: (val: boolean) => void, pBtn: HTMLElement | null, isAttractMode: boolean) {
  const camY = game.cameraY;
  const camH = config.gameHeight;
  const top100 = camY - 100;
  const bot100 = camY + camH + 100;

  for (let _idx_items = 0; _idx_items < game.items.length; _idx_items++) {
    let i = game.items[_idx_items];
    if (i.type !== 'green' && (i.y > bot100 || i.y + i.h < top100)) continue;

    if (game.player.x < i.x + i.w && game.player.x + game.player.w > i.x && game.player.y < i.y + i.h && game.player.y + game.player.h > i.y) {
      if (i.type === 'green') {
        let superPower = config.superJumpPower * config.glowingMovingJumpMultiplier;
        game.player.jump(superPower);
        game.player.isSparkleJumping = true;
        game.player.inGreenMushroomChain = true;
        game.player.squatTimer = 3;
        game.shakeAmount = 10;
        spawnParticles(i.x + i.w / 2, i.y, '#2c2', 8, 3);
        spawnParticles(i.x + i.w / 2, i.y, '#fff', 6, 2);
        if (game.demoMode && game.aiActive) {
          if (game.player.aiPath.length > 0 && game.player.aiPath[0] === i) game.player.aiPath.shift();
          game.player.stagnationTimer = 0;
          game.player.adventureMode = false;
        }
      } else if (!i.collected) {
        i.collected = true;
        game.player.powerUp();
        spawnParticles(i.x + i.w / 2, i.y + i.h, '#ccc', 6);
        if (game.demoMode && game.aiActive) {
          if (game.player.aiPath.length > 0 && game.player.aiPath[0] === i) game.player.aiPath.shift();
          game.player.stagnationTimer = 0;
          game.player.adventureMode = false;
        }
      }
    }

    for (let _idx_npcs = 0; _idx_npcs < game.npcs.length; _idx_npcs++) {
    let npc = game.npcs[_idx_npcs];
      if (npc.active && (npc.vy > 0 || i.type === 'green') && npc.x < i.x + i.w && npc.x + npc.w > i.x && npc.y < i.y + i.h && npc.y + npc.h > i.y) {
        let ap = (i.type === 'green') ? config.superJumpPower * config.glowingMovingJumpMultiplier : config.superJumpPower;
        npc.y = i.y - npc.h;
        npc.jump(ap);
        npc.isSparkleJumping = true;
        npc.squatTimer = 3;
        spawnParticles(npc.x + npc.w / 2, i.y, i.type === 'green' ? '#2c2' : '#ccc', 6, 2);
        if (i.type === 'green') {
          npc.inGreenMushroomChain = true;
          spawnParticles(npc.x + npc.w / 2, i.y, '#fff', 4, 2);
        }
        if (npc.aiPath.length > 0 && npc.aiPath[0] === i) npc.aiPath.shift();
      }
    }
  }

  for (let _idx_coins = 0; _idx_coins < game.coins.length; _idx_coins++) {
    let c = game.coins[_idx_coins];
    if (c.y > bot100 || c.y + c.h < top100) continue;
    c.update();
    
    if (!c.collected) {
      if (game.equipped?.['magnet']) {
        let px = game.player.x + game.player.w / 2;
        let py = game.player.y + game.player.h / 2;
        let cx = c.x + c.w / 2;
        let cy = c.y + c.h / 2;
        let dx = px - cx;
        let dy = py - cy;
        let dist = Math.hypot(dx, dy);
        let magnetRadius = 64;
        
        if (dist < magnetRadius && dist > 1) {
          let pullAccel = 0.18;
          c.mvx += (dx / dist) * pullAccel;
          c.mvy += (dy / dist) * pullAccel;
          
          let curSpeed = Math.hypot(c.mvx, c.mvy);
          let maxSpeed = 1.6;
          if (curSpeed > maxSpeed) {
            c.mvx = (c.mvx / curSpeed) * maxSpeed;
            c.mvy = (c.mvy / curSpeed) * maxSpeed;
          }
          
          if (Math.random() < 0.2) {
            spawnParticles(c.x + c.w / 2, c.y + c.h / 2, '#80eec0', 1, 1);
          }
        }
      }

      if (Math.abs(c.mvx) > 0.01 || Math.abs(c.mvy) > 0.01) {
        c.x += c.mvx;
        c.y += c.mvy;
        let friction = 0.82;
        c.mvx *= friction;
        c.mvy *= friction;
        if (Math.abs(c.mvx) < 0.02) c.mvx = 0;
        if (Math.abs(c.mvy) < 0.02) c.mvy = 0;
      }
    }

    let ox = (c.hitW - c.w) / 2, oy = (c.hitH - c.h) / 2;
    if (!c.collected && game.player.x < c.x - ox + c.hitW && game.player.x + game.player.w > c.x - ox && game.player.y < c.y - oy + c.hitH && game.player.y + game.player.h > c.y - oy) {
      c.collected = true;
      c.dead = true;
      if (game.scoreCoin < 999) game.scoreCoin++;
      game.flyingCoins.push(getFc(c.x + c.w / 2, c.y + c.h / 2));
    }
  }

  if (game.player.vy > 0) {
    for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
      let p = game.platforms[_idx_plats];
      if (Math.abs(p.y - game.player.y) > 200) continue;
      if (p.broken || p.isCrumbling) continue;
      if (game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + p.h + game.player.vy && game.player.x + game.player.w > p.x && game.player.x < p.x + p.w) {
        if (p.type === 'goal') {
          let impact = game.player.vy;
          game.player.vy = -impact * 0.1;
          game.state = 'clear';
          document.body.classList.add('game-ended');
          game.endReason = 'CLEAR';
          if (!isAttractMode && !game.demoMode) {
          }
          game.clearTime = game.playTime;
          game.shakeAmount = 0;
          if (!isAttractMode && pBtn) {
            // pBtn.style.display = 'none';
          }
          $('tapToStartMsg').style.display = 'none';
          setIgnoreNextTap(true);
          
          let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
          RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'CLEAR');
          if (true) {
            setTimeout(() => {
              if (game.state === 'clear') {
                if (!isAttractMode) RankingAPI.show('clear');
                else {
                  setIgnoreNextTap(false);
                  $('tapToStartMsg').style.display = 'block';
                }
              }
            }, 800);
          }
          
          if (game.demoMode && !game.isBenchmarking) {
            setTimeout(function() {
              if (game.state === 'gameover' || game.state === 'clear') {
                let earned = game.scoreCoin;
                initGame();
                if (isAttractMode) applyCoinCountUp(earned, 'DEMO BONUS', false);
              }
            }, isAttractMode ? 2000 : 5000);
          }
        } else {
          if (p.y < game.player.highestReachedY - 5) {
            game.player.highestReachedY = p.y;
            game.player.visitedHistory = [];
            game.player.stagnationTimer = 0;
            game.player.adventureMode = false;
            game.player.sameBounceCount = 0;
          } else {
            game.player.stagnationTimer++;
          }
          
          game.player.y = p.y - game.player.h;
          let ap = config.jumpPower;
          if (p.isGlowing) ap = config.superJumpPower * config.glowingMovingJumpMultiplier;
          else if (p.type === 'super') ap = config.superJumpPower;
          else if (p.type === 'h-slide' || p.type === 'v-slide') ap = config.jumpPower * config.movingPlatformJumpMultiplier;
          
          if (game.aiActive) {
            if (game.player.aiPath.length > 0 && game.player.aiPath[0] === p) game.player.aiPath.shift();
            if (game.player.lastPlatform === p) {
              if (!(game.player.recentExternalCollisionTimer > 0)) {
                game.player.sameBounceCount++;
                if (game.player.sameBounceCount >= 2) {
                  p.blacklisted = true;
                  if (game.player.aiPath.length > 0) game.player.aiPath[0].blacklisted = true;
                  game.player.aiPath = [];
                  game.player.sameBounceCount = 0;
                }
              }
            } else {
              game.player.sameBounceCount = 0;
              game.player.lastPlatform = p;
            }
            if (ap <= config.superJumpPower) {
              game.player.stagnationTimer = 0;
              game.player.adventureMode = false;
            }
            game.player.visitedHistory.push(p);
            if (game.player.visitedHistory.length > 8) game.player.visitedHistory.shift();
          }
          
          let seg = FLR((game.player.x + game.player.w / 2 - p.x) / config.platformW);
          if (seg < 0) seg = 0;
          if (seg >= p.count) seg = p.count - 1;
          p.squishTimers[seg] = 12;
          p.breakOnSquish[seg] = true;
          game.player.squatTimer = 3;
          if (!p.isIcy && !p.noEffect) {
            spawnParticles(game.player.x + game.player.w / 2, p.y, '#ccc', 5);
          }
          game.player.isSparkleJumping = (p.type === 'super' || p.isGlowing) && !p.noEffect;
          game.player.jump(ap);
        }
      }
    }
  }
}
