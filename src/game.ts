import { applyCoinCountUp } from './ui-effects.js';
import { startDemoRankingScroll } from './demo-ranking.js';
import { updateBirds, updateMeteors, updateParticles, updateFlyingCoins, updateNPCs, updatePlayingState, postUpdatePhysics } from "./update.js";
import { updatePhysicsMain } from './update.js';
import { B64 } from './assets.js';
import { config } from './config.js';
import { runAI } from './ai.js';
import { getLevelConfig } from './level.js';
import { Particle, Bird, Meteor, Player, NPC, Platform, Item, Coin, BackgroundCloud, getPt, getPl, getCn, getBd, getMt, getIt, getCl, spawnParticles, spawnDebris, trySpawnBirdsOnPlatform, P_PT, P_PL, P_CN, P_BD, P_MT, P_IT, P_CL } from './entities/index.js';
import { LootLockerAPI } from "./lootlocker.js";
import { RankingAPI } from "./ranking.js";
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI, getLang, $, escapeHTML, getPlayerName } from "./utils.js";
import { initSpawner, spawnGuideCoins, spawnCoins, spawnPlatform } from './spawner.js';
import { render, resetBGScore, dR } from './renderer.js';
import { inputHandler, setupInputListeners } from './input.js';
import { checkUpdateAndReload } from './pwa.js';
import { game, demoState } from './state.js';
import { setupKeyboardUI, openNameEditModal } from './keyboard.js';
import { fireworksSystem } from './fireworks.js';
import { airplaneSystem } from './airplane.js';
export { dR, inputHandler };
    
        
    export const IMG: Record<string, HTMLImageElement> = {};
    for (let k in B64) {
      IMG[k] = new Image();
      IMG[k].src = B64[k];
    }
    let isFirstPlay = true;
    
    const cvs = $('gameCanvas') as HTMLCanvasElement;
    export const ctx = cvs.getContext('2d');
    const ui = $('ui');
    const btnL = $('btnLeft');
    const btnR = $('btnRight');
    const wrap = $('canvasWrapper');
    export const pBtn = $('pauseBtn');
        const pScreen = $('pauseScreen');
    
    document.addEventListener('pwa-update-available', () => {
      if (game.state === 'intro' || demoState.active) {
        checkUpdateAndReload();
      }
    });
    
    [btnL, btnR].forEach(b => {
      for (let i = 0; i < 4; i++) {
        let w = document.createElement('div');
        w.className = 's-wrap s' + i;
        let s = document.createElement('div');
        s.className = 'screw';
        let sl = document.createElement('div');
        sl.className = 'screw-slot';
        sl.style.transform = 'rotate(' + FLR(RND() * 360) + 'deg)';
        s.appendChild(sl);
        w.appendChild(s);
        b.appendChild(w);
      }
    });
    
    export let isAttractMode = false;
    export let attractTimer = null;
    export let ignoreNextTap = false;
    export function setIgnoreNextTap(val) { ignoreNextTap = val; }
    
    export const groundCache = document.createElement('canvas');
    groundCache.width = config.gameWidth;
    groundCache.height = 400;
    const gCtx = groundCache.getContext('2d', { alpha: false });
    export let groundCached = false;
    
    function drawGroundCache() {
      if (IMG.gnd.complete && IMG.gnd.naturalWidth > 0) {
        let p = gCtx.createPattern(IMG.gnd, 'repeat');
        gCtx.fillStyle = p;
        gCtx.fillRect(0, 0, config.gameWidth, 400);
        groundCached = true;
      }
    }
    
    IMG.gnd.onload = drawGroundCache;
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        drawGroundCache();
        resetBGScore();
      } else {
        if (game.state === 'playing' && !game.isPaused && !game.demoMode) {
          togglePause();
        }
      }
    });
    
    (window as any).gameScale = 1;
    export let ctrlCenterX = 0;
    
    function resize() {
      let winW = window.innerWidth, winH = window.innerHeight;
      let ratio = config.gameWidth / config.gameHeight;
      let tW = winW, tH = tW / ratio;
      if (tH > winH * 0.85) {
        tH = winH * 0.85;
        tW = tH * ratio;
      }
      let cH = winH - tH;
      let gc = $('gameContainer'), ca = $('controlArea');
      gc.style.width = tW + 'px';
      gc.style.height = tH + 'px';
      ca.style.width = tW + 'px';
      ca.style.height = cH + 'px';
      (window as any).gameScale = tW / config.gameWidth;
      wrap.style.width = config.gameWidth + 'px';
      wrap.style.height = config.gameHeight + 'px';
      wrap.style.transform = `scale(${(window as any).gameScale})`;
      wrap.style.transformOrigin = 'center center';
      cvs.width = config.gameWidth;
      cvs.height = config.gameHeight;
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      $('tapToStartMsg').style.fontSize = MAX(10, FLR(10 * (window as any).gameScale)) + 'px';
      let r = ca.getBoundingClientRect();
      ctrlCenterX = r.left + r.width / 2;
    }
    
    window.addEventListener('resize', resize);
    resize();

    game.player = new Player();
    initSpawner(game);

    let lastTime = performance.now();
    let acc = 0;
    let frameDuration = 1000 / config.targetFPS;
    let tM = 4, tS = 0, tDemo = false, loopRunning = false;

    export function clearAttractTimer() {
      clearTimeout(attractTimer);
    }

    
    export function resetAttractTimer() {
      clearTimeout(attractTimer);
      attractTimer = setTimeout(() => {
        if (!isAttractMode || game.isPaused) return;
        
        let tn = document.getElementById('gamePlayerName');
        if (tn) tn.style.display = 'none';
        setAuto(true);
        startDemoRankingScroll(isAttractMode);
      }, 3000);
    }

    export function startAttractCycle() {
      clearTimeout(attractTimer);
      const tn = document.getElementById('gamePlayerName');
      if (tn) {
        tn.innerText = 'ID: ' + getPlayerName();
        tn.style.display = 'block';
      }
      isAttractMode = true;
      demoState.active = false;
      fireworksSystem.launch();
      
      let btnInsta = $('btnInstagram');
      if (btnInsta) btnInsta.style.display = 'flex';

      $('rankingModal').style.display = 'none';
      $('demoRankingContainer').style.display = 'none';
      $('tapToStartMsg').innerText = 'TAP TO START';
      $('tapToStartMsg').style.display = 'block';
      document.body.classList.add('attract-mode');
      const p = $('pauseBtn');
      if (p) {
        p.style.display = 'block';
        p.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" style="fill:#fff; pointer-events:none; display: block; margin: 1px;"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
      }
      if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(loop);
      }
      runAttractUICycle();
    }

    export function runAttractUICycle() {
      if (!isAttractMode) return;
      let wasDemo = game.demoMode;
      let earned = wasDemo ? game.scoreCoin : 0;
      tM = 4;
      tS = 0;
      config.scoreMultiplier = tM;
      game.startScore = tS;
      game.demoMode = true;
      
      let tnDisplay = $('titleNameDisplay');
      if(tnDisplay) tnDisplay.style.display = 'flex';
      $('demoRankingContainer').style.display = 'none';
      demoState.active = false;
      initGame(false);
      resetAttractTimer();
      
      if (wasDemo && earned > 0) {
        applyCoinCountUp(earned, 'DEMO BONUS', false, true);
      }
    }


    export function startRealGame() {
      if (ignoreNextTap) return;
      if (!isAttractMode) return;
      clearTimeout(attractTimer);
      isAttractMode = false;
      let wasDemo = game.demoMode || demoState.active;
      let earned = wasDemo ? game.scoreCoin : 0;
      demoState.active = false;
      document.body.classList.remove('attract-mode');
      
      const p = $('pauseBtn');
      if (p) {
        p.style.display = 'block';
        p.innerHTML = 'II';
      }

      let btnInsta = $('btnInstagram');
      if (btnInsta) btnInsta.style.display = 'none';

      $('rankingModal').style.display = 'none';
      $('demoRankingContainer').style.display = 'none';
      $('tapToStartMsg').style.display = 'none';
      const tn = document.getElementById('gamePlayerName');
      if (tn) tn.style.display = 'none';
      
      let fo = $('fadeOverlay');
      if (fo) {
        fo.style.display = 'none';
        fo.style.opacity = '0';
      }
      
      tM = 4;
      tS = 0;
      config.scoreMultiplier = tM;
      game.startScore = tS;
      game.demoMode = false;
      game.aiActive = false;
      initGame(false);
      if (wasDemo && earned > 0) {
        applyCoinCountUp(earned, 'DEMO BONUS', false, true);
      }
    }

    export function setAuto(isActive) {
      if (!game.demoMode) return;
      game.aiActive = isActive;
      if (isActive) {
        game.player.aiPath = [];
        game.player.visitedHistory = [];
        game.player.stagnationTimer = 0;
        game.player.adventureMode = false;
        game.player.lastPlatform = null;
        inputHandler.active.clear();
        game.player.inputDir = 0;
      }
    }

    function resetGameState(isConsecutive) {
      game.isConsecutive = isConsecutive;
      game.state = 'intro';
      game.isPaused = false;
      document.body.classList.remove('game-paused');
      game.playTime = 0;
      game.timerStarted = isConsecutive;
      pScreen.style.display = 'none';
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
      
      
        for (let i = 0; i < 3; i++) {
          game.npcs.push(new NPC(140 + i * 16, 240 - config.playerSize, (i + 1) * 1000, i));
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
      let storedPB = localStorage.getItem('EternalJumper_PB');
      if (storedPB) {
        try {
          game.personalBest = JSON.parse(storedPB);
        } catch (e) {
          game.personalBest = null;
        }
      } else {
        game.personalBest = null;
      }
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
      game.flyingCoins = [];
      game.totalCoins = parseInt(localStorage.getItem('JUMP_TOTAL_COINS') || '0');
      
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
      
      game.eventLog = [];
      if (!isAttractMode) {
        if (pBtn) {
          pBtn.style.display = 'block';
          pBtn.innerHTML = 'II';
        }
      } else {
        if (pBtn) {
          pBtn.style.display = demoState.active ? 'none' : 'block';
          pBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" style="fill:#fff; pointer-events:none; display: block; margin: 1px;"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
        }
      }
      
      setupGameCameraAndPlayer(isConsecutive);
      
      if (game.demoMode) {
        if (isAttractMode) {
          if (demoState.active) setAuto(true);
          else setAuto(false);
        } else {
          setAuto(true);
        }
      } else {
        game.aiActive = false;
      }
      
      setupGameEnvironment(isConsecutive);
      
      game.lastCoinY = 0;
      lastTime = performance.now();
      acc = 0;
      
      if (isAttractMode && !demoState.active) $('tapToStartMsg').style.display = 'block';
      checkUpdateAndReload();
    }


    function formatTime(ms) {
      let m = FLR(ms / 60000), s = FLR((ms % 60000) / 1000), msec = FLR(ms % 1000);
      return m + ':' + s.toString().padStart(2, '0') + '.' + msec.toString().padStart(3, '0');
    }


    function loop(ts) {
      let dT = ts - lastTime;
      lastTime = ts;
      if (dT > 250) dT = 250;
      
      if (!game.isPaused) {
        if (game.state === 'playing' || game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || game.state === 'intro') {
          if (!isAttractMode || demoState.active) game.playTime += dT;
        }
        acc += dT;
        let upd = 0;
        
        while (acc >= frameDuration && upd < 3) {
          updatePhysicsMain({
            game, isAttractMode, demoState, config, inputHandler, IMG,
            setIgnoreNextTap, pBtn, initGame, spawnPlatform, fireworksSystem,
            airplaneSystem, runAI, FLR, spawnParticles
          });
          acc -= frameDuration;
          upd++;
        }
        if (acc > frameDuration * 3) {
          acc = 0; // prevent spiral of death
        }

      }
      
      // アトラクトモード(タイトル画面)かつデモプレイ中ではなく一時停止もされていない時だけバージョン表示と設定ボタンを表示
      const tVer = $('titleVersion');
      if (tVer) {
        
        let nDisp = (isAttractMode && !demoState.active && !game.isPaused) ? 'block' : 'none';
        if (tVer.style.display !== nDisp) tVer.style.display = nDisp;
      }
      
      render(ts);
      if (loopRunning) requestAnimationFrame(loop);
    }

    export function togglePause(e?: any) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (game.state === 'gameover' || game.state === 'clear') return;
      game.isPaused = !game.isPaused;
      document.body.classList.toggle('game-paused', game.isPaused);
      $('pauseScreen').style.display = game.isPaused ? 'flex' : 'none';
      
      if (isAttractMode) {
          $('pauseBtn').style.display = game.isPaused || demoState.active ? 'none' : 'block';
          $('pauseBtn').innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" style="fill:#fff; pointer-events:none; display: block; margin: 1px;"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
      } else {
          $('pauseBtn').style.display = game.isPaused ? 'none' : 'block';
          $('pauseBtn').innerHTML = 'II';
      }
      
      if (game.isPaused) {
        if (isAttractMode) {
          clearTimeout(attractTimer);
          $('pauseTitle').innerText = 'SETTINGS';
          $('btnTitlePause').style.display = 'none';
          $('btnResumePause').style.display = 'none';
          $('tapToStartMsg').innerText = 'TAP TO CLOSE';
        } else {
          $('pauseTitle').innerText = 'PAUSED';
          $('btnTitlePause').style.display = 'block';
          $('btnResumePause').style.display = 'flex';
          $('tapToStartMsg').innerText = 'TAP TO RESUME';
        }
        $('tapToStartMsg').style.display = 'block';
      } else {
        $('tapToStartMsg').style.display = isAttractMode ? 'block' : 'none';
        if (isAttractMode) {
            $('tapToStartMsg').innerText = 'TAP TO START';
            resetAttractTimer();
        }
      }
      if (game.isPaused) {
        const pNameInput = document.getElementById('pausePlayerNameInput') as HTMLInputElement;
        if (pNameInput) {
          let fullName = getPlayerName();
          let parts = fullName.split(' ');
          let name = parts.length > 1 ? parts[1] : (parts[0] || '??');
          pNameInput.value = name;
        }
        const pb = document.getElementById('pauseBest');
        if (pb) {
            let pbData = localStorage.getItem(RankingAPI.pbKey);
            if (pbData) {
                try {
                    let d = JSON.parse(pbData);
                    pb.innerHTML = `<div style="text-align:center; margin-top:4px;">
                      <div style="color:#ddd; font-size:12px; font-weight:bold; margin-bottom:4px;">${d.alt}m</div>
                      <div class="coin-align" style="font-size:9px; color:#dd8;">
                        <div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>
                        <span>&times; ${d.coins || 0}</span>
                      </div>
                    </div>`;
                } catch(e) {
                    localStorage.removeItem(RankingAPI.pbKey);
                }
            } else {
                pb.innerHTML = '';
            }
        }
      } else {
        const pNameInput = document.getElementById('pausePlayerNameInput') as HTMLInputElement;
        if (pNameInput) {
          pNameInput.blur();
        }
      }
    }

    setupInputListeners();

    const tVer = $('titleVersion');
    if (tVer) {
      tVer.innerText = `v${__APP_VERSION__}`;
    }

    setupKeyboardUI();

    startAttractCycle();
