import type { GameState } from "./types.js";
import { applyCoinCountUp } from './ui-effects.js';
import { config } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, P_PT, P_PL, P_IT, P_CN, P_CL, FlyingCoin } from './entities/index.js';
import { RND, FLR, MAX, MIN, $ } from './utils.js';
import { initGame } from './game.js';
import { RankingAPI } from './ranking.js';

export function updatePlayingState(game: GameState, setIgnoreNextTap: (val: boolean) => void, pBtn: HTMLElement | null, isAttractMode: boolean) {
  game.items.forEach(function(i) {
    if (!i.collected && game.player.x < i.x + i.w && game.player.x + game.player.w > i.x && game.player.y < i.y + i.h && game.player.y + game.player.h > i.y) {
      i.collected = true;
      game.player.powerUp();
      spawnParticles(i.x + i.w / 2, i.y + i.h, '#ccc', 6);
      if (game.demoMode && game.aiActive) {
        if (game.player.aiPath.length > 0 && game.player.aiPath[0] === i) game.player.aiPath.shift();
        game.player.stagnationTimer = 0;
        game.player.adventureMode = false;
      }
    }
    if (!i.collected) {
      game.npcs.forEach(function(npc) {
        if (npc.active && npc.vy > 0 && npc.x < i.x + i.w && npc.x + npc.w > i.x && npc.y < i.y + i.h && npc.y + npc.h > i.y) {
          npc.y = i.y - npc.h;
          npc.jump(config.superJumpPower);
          npc.isSparkleJumping = true;
          npc.squatTimer = 3;
          spawnParticles(npc.x + npc.w / 2, i.y + i.h, '#ccc', 3);
          if (npc.aiPath.length > 0 && npc.aiPath[0] === i) npc.aiPath.shift();
        }
      });
    }
  });

  game.coins.forEach(function(c) {
    c.update();
    let ox = (c.hitW - c.w) / 2, oy = (c.hitH - c.h) / 2;
    if (!c.collected && game.player.x < c.x - ox + c.hitW && game.player.x + game.player.w > c.x - ox && game.player.y < c.y - oy + c.hitH && game.player.y + game.player.h > c.y - oy) {
      c.collected = true;
      c.dead = true;
      if (game.scoreCoin < 999) game.scoreCoin++;
      game.flyingCoins.push(new FlyingCoin(c.x + c.w / 2, c.y + c.h / 2));
    }
  });

  if (game.player.vy > 0) {
    game.platforms.forEach(function(p) {
      if (p.broken || p.isCrumbling) return;
      if (game.player.x + game.player.w > p.x && game.player.x < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + p.h + game.player.vy) {
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
            pBtn.style.display = 'none';
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
          
          if (game.demoMode && game.aiActive) {
            if (game.player.aiPath.length > 0 && game.player.aiPath[0] === p) game.player.aiPath.shift();
            if (game.player.lastPlatform === p) {
              game.player.sameBounceCount++;
              if (game.player.sameBounceCount >= 2) {
                p.blacklisted = true;
                if (game.player.aiPath.length > 0) game.player.aiPath[0].blacklisted = true;
                game.player.aiPath = [];
                game.player.sameBounceCount = 0;
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
    });
  }
}

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
  game.npcs.forEach(n => {
    if (n.y > lowestY && n.y < 1500) lowestY = n.y;
  });
  
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
  
  while (game.platforms.length > 0 && game.platforms[game.platforms.length - 1].type !== 'goal' && game.platforms[game.platforms.length - 1].y > game.cameraY - config.gameHeight) {
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
        game.platforms.forEach(function(p) {
          if (p.isGround && p.y === 240 && plX + plW > p.x && plX < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + 15) {
            game.player.y = p.y - game.player.h;
            game.player.vy = 0;
            onG = true;
            if (!game.timerStarted && (!isAttractMode || demoState.active)) {
              game.timerStarted = true;
              game.playTime = 0;
            }
          }
        });
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
        game.platforms.forEach(function(p) {
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
        });
      }
    }


