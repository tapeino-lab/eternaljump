import type { GameState } from "./types.js";
import { applyCoinCountUp } from './ui-effects.js';
import { config, SCORE_THRESHOLDS } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, spawnDebris, spawnFireSparks, P_PT, P_PL, P_IT, P_CN, P_CL, P_FC, getFc } from './entities/index.js';
import { RND, FLR, MAX, MIN, $, swapRemove } from './utils.js';
import { initGame } from './lifecycle.js';

import { RankingAPI } from './ranking.js';

export function updateBirds(game: GameState) {
  for (let i = 0; i < game.birds.length; i++) {
    let b = game.birds[i];
    b.update();
    if (b.y > game.cameraY + config.gameHeight + 100 || b.y < game.cameraY - 1000 || b.x < -50 || b.x > config.gameWidth + 50) {
      P_BD.push(b);
      swapRemove(game.birds, i);
      i--;
    }
  }

  if (game.score > game.startScore + 1000 && game.score < SCORE_THRESHOLDS.MEDIUM) {
    if (RND() < 0.012) {
      let hasType2 = false;
      for (let i = 0; i < game.birds.length; i++) {
        if (game.birds[i].type === 2) { hasType2 = true; break; }
      }
      if (!hasType2) {
        let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
        let startX = dir === 1 ? -20 : config.gameWidth + 20;
        game.birds.push(getBd(2, startX, game.cameraY + 50 + RND() * (config.gameHeight * 0.5), false));
      }
    }
    if (game.score >= 40000 && RND() < 0.02) {
      let bt = RND() < 0.8 ? 0 : 1;
      let num = 2 + FLR(RND() * 3);
      let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
      let startX = dir === 1 ? -20 : config.gameWidth + 20;
      let startY = game.cameraY + RND() * config.gameHeight;
      for (let j = 0; j < num; j++) {
        game.birds.push(getBd(bt, startX + (RND() - 0.5) * 20, startY + (RND() - 0.5) * 20, false));
      }
    }
  }
}


export function updateMeteors(game: GameState) {
  for (let i = 0; i < game.meteors.length; i++) {
    let m = game.meteors[i];
    m.update();
    if (m.y > game.cameraY + config.gameHeight + 100) {
      P_MT.push(m);
      swapRemove(game.meteors, i);
      i--;
    } else if (game.state === 'playing' && !(game.player.hitTimer > 0) && game.player.x < m.x + m.w && game.player.x + game.player.w > m.x && game.player.y < m.y + m.h && game.player.y + game.player.h > m.y) {
      let isStomping = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= m.y + m.h * 0.5);
      let isPunchingUp = (game.player.vy < 0 && (game.player.y - game.player.vy) >= m.y + m.h * 0.5);
      
      game.player.recentExternalCollisionTimer = 180;
      if (isStomping) {
        m.hitTimer = 60;
        game.player.y = m.y - game.player.h;
        game.player.jump(config.jumpPower * 0.8);
        if (game.demoMode && game.aiActive) {
          game.player.highestReachedY = m.y;
          game.player.visitedHistory = [];
          game.player.stagnationTimer = 0;
          game.player.adventureMode = false;
          game.player.aiPath = [];
        }
        spawnParticles(m.x + m.w / 2, m.y, '#fff', 15, 4);
      } else if (isPunchingUp && game.equipped?.['rod']) {
        let heatIncrease = m.isLarge ? 40 : 20;
        let potentialReward = m.isLarge ? 3 : 1;
        let reward = 0;
        let prob = Math.max(0, 1.0 - (game.meteorOverheat / 100));
        for (let j = 0; j < potentialReward; j++) {
          if (Math.random() < prob) {
            reward++;
          }
        }
        game.meteorOverheat = Math.min(100, game.meteorOverheat + heatIncrease);
        for (let j = 0; j < reward; j++) {
          if (game.scoreCoin < 999) game.scoreCoin++;
          game.totalCoins++;
          let fc = getFc(m.x + m.w / 2 + (j * 15 - 15), m.y + m.h / 2 + (j * 10 - 10));
          fc.maxProgress = 30 + j * 5;
          game.flyingCoins.push(fc);
        }
        let sBase = m.isLarge ? 1.0 : 0.5;
        let cBase = m.isLarge ? 1.0 : 0.4;
        if (reward === 0) {
          spawnParticles(m.x + m.w / 2, m.y + m.h / 2, '#eee', 6, 2);
          spawnParticles(m.x + m.w / 2, m.y + m.h / 2, '#ddd', 6, 1.5);
          spawnDebris(m.x, m.y, m.w, m.h, '#853', Math.ceil(3 * cBase), 1.5 * sBase);
          spawnDebris(m.x, m.y, m.w, m.h, '#632', Math.ceil(4 * cBase), 1.0 * sBase);
        } else {
          spawnDebris(m.x, m.y, m.w, m.h, '#853', Math.ceil(3 * cBase), 1.5 * sBase);
          spawnDebris(m.x, m.y, m.w, m.h, '#632', Math.ceil(4 * cBase), 1.0 * sBase);
          spawnDebris(m.x, m.y, m.w, m.h, '#421', Math.ceil(5 * cBase), 0.5 * sBase);
          spawnFireSparks(m.x + m.w / 2, m.y + m.h / 2, m.isLarge ? 10 : 4);
        }
        game.shakeAmount = 6;
        P_MT.push(m);
        swapRemove(game.meteors, i);
        i--;
        game.player.vy *= 0.5;
        if (game.player.isPoweredUp && !game.equipped?.['helmet']) {
          game.player.history = [];
          game.player.savedVy = game.player.vy;
          game.player.savedVx = game.player.vx;
          game.player.isPoweredUp = false;
          game.state = 'powerdown_anim';
          game.player.animTimer = 48;
          game.player.baseY = game.player.y;
        }
      } else {
        if (m.hitTimer > 0) continue;
        m.hitTimer = 60;
        if (game.demoMode && game.aiActive) game.player.aiPath = [];
        if (game.player.isPoweredUp && !game.equipped?.['helmet']) {
          game.player.history = [];
          game.player.savedVy = game.player.vy;
          game.player.savedVx = game.player.vx;
          game.player.isPoweredUp = false;
          game.state = 'powerdown_anim';
          game.player.animTimer = 48;
          game.player.baseY = game.player.y;
        } else {
          game.player.vy = 0;
          game.player.vx = game.player.x < m.x ? -1.5 : 1.5;
          game.shakeAmount = m.isLarge ? 8 : 4;
          if (game.equipped?.['helmet']) {
            spawnParticles(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2, '#ffd700', 8, 2);
          }
        }
      }
    }
  }

  if (game.score >= SCORE_THRESHOLDS.MID_HIGH && game.score <= SCORE_THRESHOLDS.METEOR_END && game.state === 'playing') {
    let meteorSpan = SCORE_THRESHOLDS.METEOR_END - SCORE_THRESHOLDS.MID_HIGH;
    let dF = (game.score - SCORE_THRESHOLDS.MID_HIGH) / meteorSpan;
    let mM = dF < 0.33 ? 1 : (dF < 0.66 ? 2 : 3);
    if (game.meteors.length < mM && RND() < (0.015 + dF * 0.015) * config.scoreMultiplier) {
      game.meteors.push(getMt(10 + RND() * (config.gameWidth - 40), game.cameraY - 40, (RND() - 0.5) * 1.0, 0.8 + dF * 0.7));
    }
  }
}


export function updateParticles(game: GameState) {
  for (let i = 0; i < game.particles.length; i++) {
    let pt = game.particles[i];
    pt.update();
    if (pt.life <= 0 || pt.y > game.cameraY + config.gameHeight + 200 || pt.y < game.cameraY - 400) {
      P_PT.push(pt);
      swapRemove(game.particles, i);
      i--;
    }
  }
}

export function updateFlyingCoins(game: GameState) {
  if (!game.flyingCoins) return;
  for (let i = 0; i < game.flyingCoins.length; i++) {
    let fc = game.flyingCoins[i];
    fc.update();
    if (fc.dead) {
      P_FC.push(fc);
      swapRemove(game.flyingCoins, i);
      i--;
    }
  }
}


export function updateNPCs(game: GameState, setIgnoreNextTap: (val: boolean) => void, pBtn: HTMLElement | null, isAttractMode: boolean) {
  if (game.state === 'playing' && game.npcs.length > 0 && Math.random() < 0.00003) {
    let anyBalloon = false;
    for (let i = 0; i < game.npcs.length; i++) {
      if (game.npcs[i].balloonTimer > 0) { anyBalloon = true; break; }
    }
    if (!anyBalloon) {
      let activeNpcs = [];
      for (let i = 0; i < game.npcs.length; i++) {
        let n = game.npcs[i];
        if (n.active && n.y < game.cameraY + config.gameHeight + 300) activeNpcs.push(n);
      }
      if (activeNpcs.length > 0) {
        let rndIdx = Math.floor(Math.random() * activeNpcs.length);
        activeNpcs[rndIdx].balloonText = 'Load!';
        activeNpcs[rndIdx].balloonTimer = 90;
      }
    }
  }
  for (let i = 0; i < game.npcs.length; i++) {
    let npc = game.npcs[i];
    npc.update();

    if (npc.y > 1500) {
      swapRemove(game.npcs, i);
      i--;
      continue;
    }
    if (npc.stagnationTimer > 1800 && npc.y > game.cameraY + config.gameHeight) {
      swapRemove(game.npcs, i);
      i--;
      continue;
    }
    if (!npc.active) continue;

    if (game.state === 'playing' && !(game.player.hitTimer > 0) && !(npc.hitTimer > 0) && game.player.x < npc.x + npc.w && game.player.x + game.player.w > npc.x && game.player.y < npc.y + npc.h && game.player.y + game.player.h > npc.y) {
      let pStomp = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= npc.y + npc.h * 0.5);
      let nStomp = (npc.vy > 0 && (npc.y + npc.h - npc.vy) <= game.player.y + game.player.h * 0.5);
      
      if (pStomp) {
        game.player.recentExternalCollisionTimer = 120;
        npc.recentExternalCollisionTimer = 120;
        game.player.y = npc.y - game.player.h;
        game.player.jump(config.jumpPower * 0.8);
        npc.vy = -3;
        npc.vx = npc.x > game.player.x ? 2 : -2;
        npc.hitTimer = 20;
        spawnParticles(npc.x + npc.w / 2, npc.y, '#fff', 5, 2);
      } else if (nStomp) {
        game.player.recentExternalCollisionTimer = 120;
        npc.recentExternalCollisionTimer = 120;
        npc.y = game.player.y - npc.h;
        npc.jump(config.jumpPower * 0.8);
        game.player.vy = -3;
        game.player.vx = game.player.x > npc.x ? 2 : -2;
        game.player.hitTimer = 20;
        game.shakeAmount = 4;
        spawnParticles(game.player.x + game.player.w / 2, game.player.y, '#fff', 5, 2);
      }
    }

    let onG = false;
    if (npc.isIntro && npc.vy > 0) {
      for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
        let p = game.platforms[_idx_plats];
        if (Math.abs(p.y - npc.y) > 200) continue;
        if (p.isGround && p.y === 240 && npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + 15) {
          npc.y = p.y - npc.h;
          npc.vy = 0;
          onG = true;
        }
      }
    }

    if (!onG && npc.vy > 0) {
      for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
        let p = game.platforms[_idx_plats];
        if (Math.abs(p.y - npc.y) > 200) continue;
        if (p.broken || p.isCrumbling) continue;
        if (npc.isIntro && p.isGround) continue;
        if (npc.y + npc.h >= p.y && npc.y + npc.h < p.y + p.h + npc.vy && npc.x + npc.w > p.x && npc.x < p.x + p.w) {
          if (p.type === 'goal') {
            npc.y = p.y - npc.h;
            npc.vy = -npc.vy * 0.1;
            if (game.state === 'playing') {
              game.state = 'gameover';
              document.body.classList.add('game-ended');
              game.endReason = 'NPC_CLEAR';
              game.clearTime = game.playTime;
              game.shakeAmount = 0;
              if (!isAttractMode && pBtn) {
                // pBtn.style.display = 'none';
              }
              $('tapToStartMsg').style.display = 'none';
              setIgnoreNextTap(true);
              spawnParticles(npc.x + npc.w / 2, p.y, '#f00', 5);
              let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
              RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'NPC_CLEAR');
              if (true) {
                setTimeout(() => {
                  if (game.state === 'gameover') {
                    if (!isAttractMode) RankingAPI.show('gameover');
                    else {
                      setIgnoreNextTap(false);
                      $('tapToStartMsg').style.display = 'block';
                    }
                  }
                }, 800);
              }
              if (game.demoMode && !isAttractMode) {
                setTimeout(function() {
                  if (game.state === 'gameover') initGame(false);
                }, 5000);
              }
            }
            continue;
          }

          if (npc.isIntro && !p.isGround) npc.isIntro = false;

          if (p.y < npc.highestReachedY - 5) {
            npc.highestReachedY = p.y;
            npc.visitedHistory = [];
            npc.stagnationTimer = 0;
            npc.adventureMode = false;
            npc.sameBounceCount = 0;
          } else {
            npc.stagnationTimer++;
          }

          npc.y = p.y - npc.h;
          let ap = config.jumpPower;
          if (p.isGlowing) ap = config.superJumpPower * config.glowingMovingJumpMultiplier;
          else if (p.type === 'super') ap = config.superJumpPower;
          else if (p.type === 'h-slide' || p.type === 'v-slide') ap = config.jumpPower * config.movingPlatformJumpMultiplier;

          if (npc.aiPath.length > 0 && npc.aiPath[0] === p) npc.aiPath.shift();

          if (npc.lastPlatform === p) {
            if (!(npc.recentExternalCollisionTimer > 0)) {
              npc.sameBounceCount++;
              if (npc.sameBounceCount >= 2) {
                p.blacklisted = true;
                if (npc.aiPath.length > 0) npc.aiPath[0].blacklisted = true;
                npc.aiPath = [];
                npc.sameBounceCount = 0;
              }
            }
          } else {
            npc.sameBounceCount = 0;
            npc.lastPlatform = p;
          }

          if (ap <= config.superJumpPower) {
            npc.stagnationTimer = 0;
            npc.adventureMode = false;
          }
          npc.visitedHistory.push(p);
          if (npc.visitedHistory.length > 8) npc.visitedHistory.shift();

          let seg = FLR((npc.x + npc.w / 2 - p.x) / config.platformW);
          if (seg < 0) seg = 0;
          if (seg >= p.count) seg = p.count - 1;
          p.squishTimers[seg] = 12;
          p.breakOnSquish[seg] = true;
          npc.squatTimer = 3;
          if (!p.isIcy && !p.noEffect) spawnParticles(npc.x + npc.w / 2, p.y, '#ccc', 3);
          npc.isSparkleJumping = (p.type === 'super' || p.isGlowing) && !p.noEffect;
          npc.jump(ap);
        }
      }
    }
  }
}
