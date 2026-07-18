
import { config } from './config.js';
import { RND, FLR, ABS, MAX, MIN, POW, $ } from "./utils.js";
import { game, demoState } from './state.js';
import { checkUpdateAndReload } from "./pwa.js";
import { isAttractMode, pBtn, autoBtn, isDev, resetTime, setAuto } from "./game.js";
import { inputHandler } from './input.js';
import { P_PL, P_PT, P_CN, P_BD, P_MT, P_IT, P_CL, getPl, getCl, getBd, trySpawnBirdsOnPlatform, NPC } from './entities/index.js';

export function resetGameState(isConsecutive) {
      game.isConsecutive = isConsecutive;
      game.state = 'intro';
      game.isPaused = false;
      document.body.classList.remove('game-paused');
      game.playTime = 0;
      game.timerStarted = isConsecutive;
      $('pauseScreen').style.display = 'none';
      $('rankingModal').style.display = 'none';
      game.shakeAmount = 0;
      game.flockDir = RND() < 0.5 ? 1 : -1;
      
      if (game.platforms) game.platforms.forEach(p => P_PL.push(p));
      if (game.particles) game.particles.forEach(p => P_PT.push(p));
      if (game.coins) game.coins.forEach(c => P_CN.push(c));
      if (game.birds) game.birds.forEach(b => P_BD.push(b));
      if (game.meteors) game.meteors.forEach(m => P_MT.push(m));
      if (game.items) game.items.forEach(i => P_IT.push(i));
      
      game.particles = [];
      game.meteors = [];
      game.npcs = [];
      game.birds = [];
      
      if (!game.isBenchmarking) {
        for (let i = 0; i < 3; i++) {
          game.npcs.push(new NPC(140 + i * 16, 240 - config.playerSize, (i + 1) * 1000, i));
        }
      }
      
      game.player.reset();
      game.platforms = [];
      game.items = [];
      game.coins = [];
      if (game.clouds && game.clouds.length > 0) {
        game.clouds.forEach(c => P_CL.push(c));
      }
      game.clouds = [];
      game.stars = [];
      game.loopCount = 0;
      game.endReason = null;
      game.lastScoreId = null;
      game.lastRank = null;
      game.lastScoreObj = null;
      game.isNewRecord = false;
      game.personalBest = null;
      game.clearTime = 0;
      game.lastUI = '';
    }

    function setupGameCameraAndPlayer(isConsecutive) {
      game.baseScoreY = (240 - config.playerSize) + (game.startScore / config.scoreMultiplier);
      game.player.x = isConsecutive ? 104 : 48;
      game.player.y = 240 - config.playerSize;
      game.goalY = game.baseScoreY - (config.goalScore / config.scoreMultiplier);
      
      let idealCam = MAX(0, game.player.y - config.gameHeight * 0.6);
      game.cameraY = idealCam;
      game.highestCameraY = idealCam;
      game.highestPlayerY = game.player.y;
      game.score = game.startScore;
      game.scoreCoin = 0;
      
      inputHandler.active.clear();
    }

    function setupGameEnvironment(isConsecutive) {
      let pl1 = getPl(240, 'normal', true, 0, 96, 400);
      pl1.noEffect = true;
      game.platforms.push(pl1);
      
      let pl2 = getPl(240, 'normal', true, 128, config.gameWidth - 128, 400);
      pl2.noEffect = true;
      game.platforms.push(pl2);
      
      if (!isConsecutive) {
        let plCover = getPl(240, 'normal', true, 96, 32, 400);
        plCover.noEffect = true;
        plCover.isIntroCover = true;
        game.platforms.push(plCover);
      }
      
      let pl3 = getPl(416, 'super', false, 104, config.platformW, 32, 1);
      pl3.noEffect = true;
      game.platforms.push(pl3);
      
      let pl4 = getPl(416 + config.platformH, 'normal', true, 0, config.gameWidth, 400);
      pl4.noEffect = true;
      game.platforms.push(pl4);
      
      let sNY = 416 - POW(ABS(config.superJumpPower), 2) / (2 * config.jumpGravity) + 100;
      game.platforms.push(getPl(sNY, 'normal', false, config.gameWidth / 2 - (config.platformW * 9) / 2, null, null, 9, false));
      
      for (let i = 0; i < config.basePlatforms; i++) {
        let py = sNY - 80 - (i * (config.gameHeight / config.basePlatforms));
        let sc = (game.baseScoreY - py) * config.scoreMultiplier;
        let tc = (sc < 20000 && i % 3 === 0) ? MAX(2, 3 - FLR(sc / 8000)) : 1;
        let np = getPl(py, 'normal', false, null, null, null, tc, false);
        game.platforms.push(np);
        trySpawnBirdsOnPlatform(np, sc);
        
        if (sc < 20000) {
          let np2 = getPl(py + (RND() * 40 - 20), 'normal', false, null, null, null, MAX(1, tc), false);
          if (np2.isOverlapping) {
            P_PL.push(np2);
          } else {
            game.platforms.push(np2);
            trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
          }
        } else if (sc < 52000) {
          if (RND() < (1 - (sc - 20000) / 32000) * 0.7) {
            let np2 = getPl(py + (RND() * 40 - 20), 'normal', false, null, null, null, MAX(1, tc - 1), false);
            if (np2.isOverlapping) {
              P_PL.push(np2);
            } else {
              game.platforms.push(np2);
              trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
            }
          }
        }
      }
      
      for (let i = 0; i < 60; i++) {
        game.stars.push({
          x: RND() * config.gameWidth,
          y: RND() * config.gameHeight,
          size: RND() < 0.2 ? 2 : 1,
          speed: 0.01,
          blink: 0.001 + RND() * 0.003
        });
      }
      
      let cCount = FLR(200 / config.scoreMultiplier);
      for (let i = 0; i < cCount; i++) {
        let ts = 1000 + RND() * 49000;
        let cy = game.baseScoreY - (ts / config.scoreMultiplier);
        game.clouds.push(getCl(RND() * config.gameWidth, cy));
      }
      
      let bC = 8 + FLR(RND() * 7);
      for (let i = 0; i < bC; i++) {
        let bX = RND() < 0.5 ? 35 + RND() * 40 : 145 + RND() * 40;
        game.birds.push(getBd(0, bX, 95, true, null, true));
      }
      
      game.clouds.sort((a, b) => a.speed - b.speed);
    }

    export function initGame(isConsecutive = false) {
      document.body.classList.remove('game-ended');
      $('tapToStartMsg').style.display = 'none';
      $('tapToStartMsg').innerText = 'TAP TO START';
      
      resetGameState(isConsecutive);
      
      if (!game.isBenchmarking) {
        game.eventLog = [];
        if (!isAttractMode) {
          pBtn.style.display = 'block';
          pBtn.innerText = 'II';
        } else {
          pBtn.style.display = 'none';
        }
      } else {
        pBtn.style.display = 'none';
      }
      
      setupGameCameraAndPlayer(isConsecutive);
      
      if (game.demoMode) {
        if (isDev && !game.isBenchmarking) autoBtn.style.display = 'block';
        else autoBtn.style.display = 'none';
        if (isAttractMode) {
          if (demoState.active) setAuto(true);
          else setAuto(false);
        } else {
          setAuto(true);
        }
      } else {
        autoBtn.style.display = 'none';
        game.aiActive = false;
      }
      
      setupGameEnvironment(isConsecutive);
      
      game.lastCoinY = 0;
      resetTime();
      
      
      if (isAttractMode && !demoState.active) $('tapToStartMsg').style.display = 'block';
      checkUpdateAndReload();
    }
