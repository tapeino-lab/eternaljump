import type { GameState } from "./types.js";
import { applyCoinCountUp } from './ui-effects.js';
import { config } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, P_PT, P_PL, P_IT, P_CN, P_CL, FlyingCoin } from './entities/index.js';
import { RND, FLR, MAX, MIN, $, swapRemove } from './utils.js';
import { initGame } from './lifecycle.js';

import { RankingAPI } from './ranking.js';

export function postUpdatePhysics(game: GameState, setIgnoreNextTap: (val: boolean) => void, pBtn: HTMLElement | null, isAttractMode: boolean, initGame: any, spawnPlatform: any) {
  let upB = game.cameraY + config.gameHeight * 0.4, lowB = game.cameraY + config.gameHeight * 0.6, nY = game.cameraY;
  if (game.player.y < upB) nY -= (upB - game.player.y) * 0.15;
  else if (game.player.y > lowB) nY += (game.player.y - lowB) * 0.15;
  
  let mY = game.goalY - config.gameHeight * 0.25;
  if (nY < mY) nY = mY;
  if (nY < game.highestCameraY) game.highestCameraY = nY;
  
  game.cameraY = MIN(nY, game.highestCameraY + config.gameHeight * config.recoveryScreens);
  if (game.player.y < game.highestPlayerY) {
    let delta = game.highestPlayerY - game.player.y;
    if (game.meteorOverheat > 0) {
      game.meteorOverheat = Math.max(0, game.meteorOverheat - delta * 0.5);
    }
    game.highestPlayerY = game.player.y;
  }
  
  game.score = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
  
  let lowestY = game.player.y;
  for (let _idx_npcs = 0; _idx_npcs < game.npcs.length; _idx_npcs++) {
    let n = game.npcs[_idx_npcs];
    if (n.active && n.y > lowestY) lowestY = n.y;
  }
  
  let dL = lowestY + config.gameHeight * 2;
  for (let i = 0; i < game.platforms.length; i++) {
    let p = game.platforms[i];
    if (p.broken || (!p.isGround && p.y >= dL)) {
      P_PL.push(p);
      swapRemove(game.platforms, i);
      i--;
    }
  }
  for (let i = 0; i < game.items.length; i++) {
    if (game.items[i].y >= dL || game.items[i].collected) {
      P_IT.push(game.items[i]);
      swapRemove(game.items, i);
      i--;
    }
  }
  for (let i = 0; i < game.coins.length; i++) {
    let c = game.coins[i];
    if (c.y >= dL || c.dead) {
      P_CN.push(c);
      swapRemove(game.coins, i);
      i--;
    }
  }
  let cloudThresh = game.cameraY + config.gameHeight * 2.0;
  for (let i = 0; i < game.clouds.length; i++) {
    let c = game.clouds[i];
    if (c.y > cloudThresh) {
      P_CL.push(c);
      swapRemove(game.clouds, i);
      i--;
    }
  }
  
  let hp;
  while (game.platforms.length > 0 && (hp = game.highestPlatform) && hp.type !== 'goal' && hp.y > game.cameraY - config.gameHeight) {
    spawnPlatform();
  }
  
  if (game.player.y + game.player.h >= game.cameraY + config.gameHeight && game.state !== 'powerdown_anim') {
    if (game.player.isPoweredUp) {
      game.player.y = game.cameraY + config.gameHeight - config.playerSize * 2;
      game.player.isPoweredUp = false;
      game.state = 'powerdown_anim';
      game.player.animTimer = 48;
      game.player.baseY = game.player.y;
      if (game.demoMode && game.aiActive) {
        game.player.adventureMode = false;
        game.player.stagnationTimer = 0;
        game.player.aiPath = [];
      }
    } else {
      if (game.state !== 'gameover') {
        game.shakeAmount = 0;
        game.state = 'gameover';
        document.body.classList.add('game-ended');
        game.endReason = 'DEATH_FALL';
        game.player.y = game.cameraY + config.gameHeight - game.player.h * 0.5;
        
        if (!isAttractMode && pBtn) {
          // pBtn.style.display = 'none';
        }
        $('tapToStartMsg').style.display = 'none';
        setIgnoreNextTap(true);
        
        let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
        RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'DEATH_FALL');
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
        
        if (game.demoMode && !game.isBenchmarking && isAttractMode) {
          setTimeout(function() {
            if (game.state === 'gameover' || game.state === 'clear') {
              let earned = game.scoreCoin;
              initGame();
              if (isAttractMode) applyCoinCountUp(earned, 'DEMO BONUS', false);
            }
          }, 2000);
        }
      }
    }
  }
  
  if (game.playTime >= config.timeLimit * 1000 && game.state !== 'gameover' && game.state !== 'clear') {
    game.shakeAmount = 0;
    game.state = 'gameover';
    document.body.classList.add('game-ended');
    game.endReason = 'TIME_UP';
    if (!isAttractMode && pBtn) {
      // pBtn.style.display = 'none';
    }
    $('tapToStartMsg').style.display = 'none';
    setIgnoreNextTap(true);
    
    let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
    RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'TIME_UP');
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
    
    if (game.demoMode && !game.isBenchmarking && isAttractMode) {
      setTimeout(function() {
        if (game.state === 'gameover' || game.state === 'clear') {
          let earned = game.scoreCoin;
          initGame();
          if (isAttractMode) applyCoinCountUp(earned, 'DEMO BONUS', false);
        }
      }, 2000);
    }
  }
}
    export function updateStateAnimations(game: GameState, config: any, FLR: any) {
      if (game.state === 'powerup_anim') {
        game.player.animTimer--;
        if (game.player.animTimer < 0) {
          game.state = 'playing';
          game.player.isPoweredUp = true;
          game.player.h = config.playerSize * 2;
          game.player.y = game.player.baseY - config.playerSize;
          game.player.jump(config.superJumpPower);
        }
      } else if (game.state === 'powerdown_anim') {
        game.player.animTimer--;
        if (game.player.animTimer < 0) {
          game.state = 'playing';
          game.player.h = config.playerSize;
          game.player.y = game.player.baseY + config.playerSize - 1;
          if (game.player.savedVy !== undefined) {
            game.player.vy = game.player.savedVy;
            game.player.savedVy = undefined;
            if (game.player.savedVx !== undefined) {
              game.player.vx = game.player.savedVx;
              game.player.savedVx = undefined;
            }
          } else {
            game.player.jump(config.superJumpPower);
          }
        }
      } else if (game.state === 'clear') {
        game.player.inputDir = 0;
        game.player.update();
        if (game.player.y + game.player.h >= game.goalY) {
          game.player.y = game.goalY - game.player.h;
          game.player.vy = 0;
        }
      } else if ((game.state as any) === 'intro_anim') {
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.inputDir = 0;
        let last = game.player.history.pop();
        if (last) {
          last.x = game.player.x;
          last.y = game.player.y;
          last.dir = game.player.facingRight;
          game.player.history.unshift(last);
        }
        
        game.introAnimTimer--;
        let cover = null;
        for (let i = 0; i < game.platforms.length; i++) {
          if (game.platforms[i].isIntroCover) { cover = game.platforms[i]; break; }
        }
        if (cover) cover.blink = (FLR(game.introAnimTimer / 4) % 2 === 0);
        
        if (game.introAnimTimer < 60 && game.introAnimTimer > 0 && game.introAnimTimer % 4 === 0) {
          game.shakeAmount = 0;
        }
        
        if (game.introAnimTimer <= 0) {
          if (cover) {
            cover.isCrumbling = true;
          }
          if (game.npcs && game.npcs.length > 0) {
            if (!(window as any).hasShownFirstExclamation) {
              game.npcs[0].balloonText = '!';
              game.npcs[0].balloonTimer = 60;
              (window as any).hasShownFirstExclamation = true;
            } else if (Math.random() < 0.2) {
              game.npcs[0].balloonText = '!';
              game.npcs[0].balloonTimer = 60;
            }
          }
          game.shakeAmount = 0;
          game.state = 'intro';
        }
      }
    }




    export function updateIntroState(game: GameState, config: any, FLR: any, isAttractMode: boolean, demoState: any, IMG: any, inputHandler: any, spawnParticles: any) {
      let plX = game.player.x, plW = game.player.w, onG = false;
      if (game.player.vy > 0) {
        for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
    let p = game.platforms[_idx_plats];
          if (p.isGround && p.y === 240 && plX + plW > p.x && plX < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + 15) {
            game.player.y = p.y - game.player.h;
            game.player.vy = 0;
            onG = true;
            if (!game.timerStarted && (!isAttractMode || demoState.active)) {
              game.timerStarted = true;
              game.playTime = 0;
            }
          }
        }
      }
      if (!game.isConsecutive && onG) {
        let cover = null;
        for (let i = 0; i < game.platforms.length; i++) {
          if (game.platforms[i].isIntroCover && !game.platforms[i].broken) { cover = game.platforms[i]; break; }
        }
        if (cover) {
          let pcX = plX + plW / 2;
          if (pcX >= 106 && pcX <= 118) {
            game.state = 'intro_anim';
            game.introAnimTimer = 60;
            game.player.vx = 0;
            game.player.inputDir = 0;
            game.player.savedIntroImgKey = (FLR(performance.now() / 100) % 3) === 0 ? 'wlk1' : ((FLR(performance.now() / 100) % 3) === 1 ? 'wlk2' : 'wlk3');
            inputHandler.active.clear();
            inputHandler.update();
          }
        }
      }
      if (!onG) {
        for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
    let p = game.platforms[_idx_plats];
          if (!p.isGround && !p.broken && plX + plW > p.x && plX < p.x + p.w && game.player.y + game.player.h > p.y && game.player.y + game.player.h < p.y + p.h + game.player.vy) {
            game.player.y = p.y - game.player.h;
            let seg = FLR((plX + plW / 2 - p.x) / config.platformW);
            if (seg < 0) seg = 0;
            if (seg >= p.count) seg = p.count - 1;
            p.squishTimers[seg] = 12;
            p.breakOnSquish[seg] = true;
            game.player.squatTimer = 3;
            game.player.jump(config.superJumpPower);
            game.player.isSparkleJumping = false;
            if (!p.noEffect) spawnParticles(game.player.x + plW / 2, p.y, '#ccc', 6);
            game.state = 'playing';
            if (!game.timerStarted) {
              game.timerStarted = true;
              game.playTime = 0;
            }
          }
        }
      }
    }


