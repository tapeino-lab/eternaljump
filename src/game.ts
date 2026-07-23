import { updateBirds, updateMeteors, updateParticles, updateNPCs, updatePlayingState, postUpdatePhysics } from "./update.js";
import { B64 } from './assets.js';
import { config } from './config.js';
import { runAI } from './ai.js';
import { getLevelConfig } from './level.js';
import { Particle, Bird, Meteor, Player, NPC, Platform, Item, Coin, BackgroundCloud, getPt, getPl, getCn, getBd, getMt, getIt, getCl, spawnParticles, spawnDebris, trySpawnBirdsOnPlatform, P_PT, P_PL, P_CN, P_BD, P_MT, P_IT, P_CL } from './entities.js';
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
        startDemoRankingScroll();
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
      if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(loop);
      }
      runAttractUICycle();
    }

    export function runAttractUICycle() {
      if (!isAttractMode) return;
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
    }

    export function startRealGame() {
      if (ignoreNextTap) return;
      if (!isAttractMode) return;
      clearTimeout(attractTimer);
      isAttractMode = false;
      demoState.active = false;
      document.body.classList.remove('attract-mode');
      
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
        pBtn.style.display = 'block';
        pBtn.innerText = 'II';
      } else {
        pBtn.style.display = 'none';
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


    function updateStateAnimations() {
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




    function updateIntroState() {
      let plX = game.player.x, plW = game.player.w, onG = false;
      if (game.player.vy > 0) {
        game.platforms.forEach(function(p) {
          if (p.isGround && p.y === 240 && plX + plW > p.x && plX < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + 15) {
            game.player.y = p.y - game.player.h;
            game.player.vy = 0;
            onG = true;
            if (!game.timerStarted && !game.demoMode) {
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



    function updatePhysics() {
      updateParticles(game);
      fireworksSystem.update(game, isAttractMode);
      airplaneSystem.update(game, isAttractMode);
      
      if (game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || (game.state as any) === 'intro_anim') {
        updateStateAnimations();
      } else if (game.state !== 'gameover') {
        if (game.demoMode && game.aiActive && (game.state === 'playing' || game.state === 'intro')) runAI(game.player);
        game.player.update();
        
        updateBirds(game);
        updateNPCs(game, setIgnoreNextTap, pBtn, isAttractMode);
        
        if (game.state !== 'intro' && (game.state as any) !== 'intro_anim') {
          if (game.player.y < game.goalY - 120) {
            game.player.y = game.goalY - 120;
            if (game.player.vy < 0) game.player.vy = 0;
          }
          if (game.player.y < game.goalY && game.player.vy > 1.5) game.player.vy = 1.5;
        }
        
        game.platforms.forEach(function(p) { p.update(); });
        
        updateMeteors(game);
        
        if (game.state === 'intro') {
          updateIntroState();
        } else if ((game.state as any) !== 'intro_anim') {
          updatePlayingState(game, setIgnoreNextTap, pBtn, isAttractMode);
        }
        
        postUpdatePhysics(game, setIgnoreNextTap, pBtn, isAttractMode, initGame, spawnPlatform);
      }
    }

    function formatTime(ms) {
      let m = FLR(ms / 60000), s = FLR((ms % 60000) / 1000), msec = FLR(ms % 1000);
      return m + ':' + s.toString().padStart(2, '0') + '.' + msec.toString().padStart(3, '0');
    }

    async function startDemoRankingScroll() {
      if (!isAttractMode) return;
      $('demoRankingContainer').style.display = 'block';
      $('demoRankingContainer').style.opacity = '1';
      $('demoRankingContainer').style.transition = 'none';
      $('demoRankingContainer').style.background = 'rgba(0,0,0,0.3)';
      $('demoHeader').innerHTML = '<div style="color:#fff;font-size:10px;text-align:center;margin-top:20px;">LOADING...</div>';
      $('demoTop3').innerHTML = '';
      $('demoOthers').innerHTML = '';
      
      let s = await RankingAPI.getScores();
      if (!isAttractMode) return;
      
      let curLen = s.length;
      for (let i = 0; i < 100 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2000, coins: 0, lang: 'CPU', n: 'CPU --' });
      
      let headerHtml = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;"><tr style="color:rgba(255,255,255,0.85);font-size:8px;"><th style="padding:4px 0;text-align:left;width:24px;padding-left:4px;vertical-align:middle;font-weight:normal;">#</th><th style="padding:4px 0;text-align:center;width:32px;vertical-align:middle;font-weight:normal;">LANG</th><th style="padding:4px 0;width:4px;padding:0;vertical-align:middle;font-weight:normal;"></th><th style="padding:4px 0;text-align:center;width:32px;vertical-align:middle;font-weight:normal;">NAME</th><th style="padding:4px 0;text-align:center;vertical-align:middle;font-weight:normal;">HEIGHT</th><th style="padding:4px 0;width:32px;padding-right:4px;vertical-align:middle;font-weight:normal;"><div style="display:flex;justify-content:center;align-items:center;height:8px;"><div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div></div></th></tr></table>';
      $('demoHeader').innerHTML = headerHtml;
      
      let t3Html = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;">';
      let otHtml = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;">';
      
      s.forEach((r, idx) => {
        let i = (r.rank ? r.rank - 1 : idx);
        let m = '';
        let color = 'rgba(255,255,255,0.85)';
        let fw = 'normal';
        let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : null;
        let isC = (r.id === LootLockerAPI.playerIdentifier || (pIdVal && r.id === pIdVal));
        if (i === 0) { m = '<span class="mdl mdl-1"></span>'; color = '#ff0'; fw = 'normal'; }
        else if (i === 1) { m = '<span class="mdl mdl-2"></span>'; color = '#ccc'; fw = 'normal'; }
        else if (i === 2) { m = '<span class="mdl mdl-3"></span>'; color = '#d98'; fw = 'normal'; }
        
        let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:normal;' : '';
        let pt = '6px 0';
        
        let nVal = r.n || '--- ??';
        let lang = '---';
        let name = '??';
        if (nVal.includes(' ')) {
          let parts = nVal.split(' ');
          lang = parts[0] || '---';
          name = parts[1] || '??';
        } else if (nVal.length >= 3) {
          lang = nVal.substring(0, 3);
          name = nVal.substring(3) || '??';
        }
        if (lang === '???' || lang === '---') {
          if (r.lang && r.lang !== '---') lang = r.lang;
        }
        if (lang.length > 3) lang = lang.substring(0, 3);
        if (name.length > 2) name = name.substring(0, 2);

        let row = `<tr style="color:${color};font-weight:${fw};${bg}"><td style="padding:${pt};text-align:left;width:24px;white-space:nowrap;overflow:hidden;padding-left:4px;vertical-align:middle;">${m}${i + 1}</td><td style="padding:${pt};text-align:center;width:32px;white-space:nowrap;overflow:hidden;vertical-align:middle;font-size:8px;">${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:${pt};text-align:center;width:32px;white-space:nowrap;overflow:hidden;vertical-align:middle;font-size:8px;">${escapeHTML(name)}</td><td style="text-align:right;padding:${pt};white-space:nowrap;overflow:hidden;vertical-align:middle;">${escapeHTML(r.alt)}m</td><td style="text-align:right;padding:${pt};padding-right:4px;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;vertical-align:middle;">${escapeHTML(r.coins || 0)}</td></tr>`;
        
        if (i < 3) t3Html += row;
        else otHtml += row;
      });
      
      t3Html += '</table>';
      otHtml += '</table>';
      $('demoTop3').innerHTML = t3Html;
      $('demoOthers').innerHTML = otHtml;
      
      demoState.active = true;
      demoState.phase = 'scroll';
      demoState.startTime = performance.now();
      demoState.calculated = false;
      
      $('demoHeader').style.top = '0px';
      $('demoTop3').style.top = '0px';
      $('demoOthersWrapper').style.top = '0px';
      $('demoOthers').style.top = '0px';
      $('demoHeader').style.transform = 'translateY(1000px)';
      $('demoTop3').style.transform = 'translateY(1000px)';
      $('demoOthersWrapper').style.transform = 'translateY(1000px)';
      $('demoOthersWrapper').style.maskImage = 'none';
      $('demoOthersWrapper').style.webkitMaskImage = 'none';
    }

    function loop(ts) {
      let dT = ts - lastTime;
      lastTime = ts;
      if (dT > 250) dT = 250;
      
      if (!game.isPaused) {
        if (game.state === 'playing' || game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || game.state === 'intro') {
          if (game.timerStarted) game.playTime += dT;
        }
        acc += dT;
        let upd = 0;
        while (acc >= frameDuration && upd < 3) {
          updatePhysics();
          acc -= frameDuration;
          upd++;
        }
      }
      
      // アトラクトモード(タイトル画面)かつデモプレイ中ではなく一時停止もされていない時だけバージョン表示と設定ボタンを表示
      const tVer = $('titleVersion');
      if (tVer) {
        tVer.style.display = (isAttractMode && !demoState.active && !game.isPaused) ? 'block' : 'none';
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
          $('pauseBtn').style.display = 'none';
      } else {
          $('pauseBtn').style.display = game.isPaused ? 'none' : 'block';
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

    setupKeyboardUI();

    startAttractCycle();
