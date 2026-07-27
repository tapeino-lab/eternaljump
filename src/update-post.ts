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
  if (game.player.y < game.highestPlayerY) game.highestPlayerY = game.player.y;
  
  game.score = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
  
  let lowestY = game.player.y;
  for (let _idx_npcs = 0; _idx_npcs < game.npcs.length; _idx_npcs++) {
    let n = game.npcs[_idx_npcs];
    if (n.y > lowestY && n.y < 1500) lowestY = n.y;
  }
  
  let dL = Math.max(game.cameraY, lowestY) + config.gameHeight * (1 + config.recoveryScreens);
  for (let i = game.platforms.length - 1; i >= 0; i--) {
    let p = game.platforms[i];
    if (p.broken || (!p.isGround && p.y >= dL)) {
      P_PL.push(p);
      game.platforms.splice(i, 1);
    }
  }
  for (let i = game.items.length - 1; i >= 0; i--) {
    if (game.items[i].y >= dL || game.items[i].collected) {
      P_IT.push(game.items[i]);
      game.items.splice(i, 1);
    }
  }
  for (let i = game.coins.length - 1; i >= 0; i--) {
    let c = game.coins[i];
    if (c.y >= dL || c.dead) {
      P_CN.push(c);
      game.coins.splice(i, 1);
    }
  }
  let cloudThresh = game.cameraY + config.gameHeight * 2.0;
  for (let i = game.clouds.length - 1; i >= 0; i--) {
    let c = game.clouds[i];
    if (c.y > cloudThresh) {
      P_CL.push(c);
      game.clouds.splice(i, 1);
    }
  }
  
  let hp = null;
  while (game.platforms.length > 0 && (hp = game.platforms.reduce((min, p) => p.y < min.y ? p : min, game.platforms[0])) && hp.type !== 'goal' && hp.y > game.cameraY - config.gameHeight) {
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
          pBtn.style.display = 'none';
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
        
        if (game.demoMode && !game.isBenchmarking) {
          setTimeout(function() {
            if (game.state === 'gameover' || game.state === 'clear') {
              let earned = game.scoreCoin;
              initGame();
              if (isAttractMode) applyCoinCountUp(earned, 'DEMO BONUS', false);
            }
          }, isAttractMode ? 2000 : 5000);
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
      pBtn.style.display = 'none';
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
    
    if (game.demoMode && !game.isBenchmarking) {
      setTimeout(function() {
        if (game.state === 'gameover' || game.state === 'clear') {
          let earned = game.scoreCoin;
          initGame();
          if (isAttractMode) applyCoinCountUp(earned, 'DEMO BONUS', false);
        }
      }, isAttractMode ? 2000 : 5000);
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
        game.player.history.unshift({ x: game.player.x, y: game.player.y, dir: game.player.facingRight });
        if (game.player.history.length > 4) game.player.history.pop();
        
        game.introAnimTimer--;
        let cover = game.platforms.find(p => p.isIntroCover);
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
        let cover = game.platforms.find(p => p.isIntroCover && !p.broken);
        if (cover) {
          let pcX = plX + plW / 2;
          if (pcX >= 106 && pcX <= 118) {
            game.state = 'intro_anim';
            game.introAnimTimer = 60;
            game.player.vx = 0;
            game.player.inputDir = 0;
            game.player.savedIntroImg = (FLR(performance.now() / 100) % 3) === 0 ? IMG.wlk1 : ((FLR(performance.now() / 100) % 3) === 1 ? IMG.wlk2 : IMG.wlk3);
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


