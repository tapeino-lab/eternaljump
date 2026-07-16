import { updateBirds, updateMeteors, updateParticles, updateNPCs, updatePlayingState, postUpdatePhysics } from "./update.js";
import { B64 } from './assets.js';
import { config } from './config.js';
import { runAI } from './ai.js';
import { getLevelConfig } from './level.js';
import { Particle, Bird, Meteor, Player, NPC, Platform, Item, Coin, BackgroundCloud, getPt, getPl, getCn, getBd, getMt, getIt, spawnParticles, spawnDebris, trySpawnBirdsOnPlatform, P_PT, P_PL, P_CN, P_BD, P_MT, P_IT } from './entities.js';
import { LootLockerAPI } from "./lootlocker.js";
import { RankingAPI } from "./ranking.js";
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI, getLang, $, escapeHTML } from "./utils.js";
import { initSpawner, spawnGuideCoins, spawnCoins, spawnPlatform } from './spawner.js';
import { render, resetBGScore, dR } from './renderer.js';
import { inputHandler, setupInputListeners } from './input.js';
export { dR, inputHandler };
    
        
    export const IMG = {};
    for (let k in B64) {
      IMG[k] = new Image();
      IMG[k].src = B64[k];
    }
    let isFirstPlay = true;
    
    const cvs = $('gameCanvas');
    export const ctx = cvs.getContext('2d');
    const ui = $('ui');
    const btnL = $('btnLeft');
    const btnR = $('btnRight');
    const wrap = $('canvasWrapper');
    const dbgModal = $('debugModal');
    export const pBtn = $('pauseBtn');
    export const autoBtn = $('autoBtn');
    const pScreen = $('pauseScreen');
    
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
    
    export const isDev = new URLSearchParams(window.location.search).get('dev') === '1';
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
      }
    });
    
    window.gameScale = 1;
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
      window.gameScale = tW / config.gameWidth;
      wrap.style.width = config.gameWidth + 'px';
      wrap.style.height = config.gameHeight + 'px';
      wrap.style.transform = `scale(${window.gameScale})`;
      wrap.style.transformOrigin = 'center center';
      cvs.width = config.gameWidth;
      cvs.height = config.gameHeight;
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      $('tapToStartMsg').style.fontSize = MAX(10, FLR(10 * window.gameScale)) + 'px';
      let r = ca.getBoundingClientRect();
      ctrlCenterX = r.left + r.width / 2;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    
    export function logAIEvent(type, detail) {
      if (!game.isBenchmarking) return;
      let alt = FLR((game.baseScoreY - game.player.y) * config.scoreMultiplier);
      game.eventLog.push('[Alt: ' + alt + 'm] ' + type.padEnd(12, ' ') + ' | ' + detail);
      if (type === 'ADV_START') game.loopCount++;
    }

    export const game = {
      state: 'intro',
      isPaused: false,
      demoMode: false,
      aiActive: false,
      isConsecutive: false,
      isBenchmarking: false,
      playTime: 0,
      timerStarted: false,
      shakeAmount: 0,
      introAnimTimer: 0,
      particles: [],
      meteors: [],
      npcs: [],
      birds: [],
      player: new Player(),
      platforms: [],
      items: [],
      coins: [],
      clouds: [],
      stars: [],
      cameraY: 0,
      highestCameraY: 0,
      highestPlayerY: 0,
      score: 0,
      scoreCoin: 0,
      lastCoinY: 0,
      baseScoreY: 0,
      goalY: 0,
      startScore: 0,
      eventLog: [],
      loopCount: 0,
      endReason: null,
      lastScoreId: null,
      lastRank: null,
      lastScoreObj: null,
      allowAutoRank: false,
      clearTime: 0,
      lastUI: '',
      flockDir: 1,
      isNewRecord: false,
      personalBest: null
    };

    initSpawner(game);

    export const demoState = {
      active: false,
      phase: 'none',
      startTime: 0,
      dist1: 0,
      dist2: 0,
      totalDist: 0,
      containerH: 0,
      fixedTop3Y: 0,
      t3H: 0,
      otH: 0,
      scrollDuration: 110000,
      calculated: false,
      gap: 8
    };

    let lastTime = performance.now();
    let acc = 0;
    let frameDuration = 1000 / config.targetFPS;
    let tM = 4, tS = 0, tDemo = false, loopRunning = false;

    export function clearAttractTimer() {
      clearTimeout(attractTimer);
    }

    export function startAttractCycle() {
      clearTimeout(attractTimer);
      isAttractMode = true;
      demoState.active = false;
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
      $('prodControls').style.display = 'flex';
      $('btnToDev').style.display = 'flex';
      $('demoRankingContainer').style.display = 'none';
      demoState.active = false;
      initGame(false);
      attractTimer = setTimeout(() => {
        if (!isAttractMode) return;
        $('btnToDev').style.display = 'none';
        setAuto(true);
        startDemoRankingScroll();
      }, 3000);
    }

    export function startRealGame() {
      if (ignoreNextTap) return;
      if (!isAttractMode) return;
      clearTimeout(attractTimer);
      isAttractMode = false;
      demoState.active = false;
      document.body.classList.remove('attract-mode');
      $('prodControls').style.display = 'none';
      $('rankingModal').style.display = 'none';
      $('demoRankingContainer').style.display = 'none';
      $('tapToStartMsg').style.display = 'none';
      
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

    export let selMode = function(d, el) {
      tDemo = d;
      document.querySelectorAll('.mode-btn').forEach(b => b.style.borderColor = '#555');
      el.style.borderColor = '#0f0';
    };

    export let selHgt = function(s, el) {
      tS = s;
      document.querySelectorAll('.hgt-btn').forEach(b => b.style.borderColor = '#555');
      el.style.borderColor = '#0f0';
    };

    export let startWithSettings = function() {
      config.scoreMultiplier = tM;
      game.startScore = tS;
      game.demoMode = tDemo;
      game.isBenchmarking = false;
      $('debugModal').style.display = 'none';
      initGame(false);
      if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(loop);
      }
    };

    export async function startBenchmark(runs) {
      $('debugModal').style.display = 'none';
      loopRunning = false;
      ui.style.justifyContent = 'center';
      ui.style.alignItems = 'center';
      ui.style.width = '100%';
      ui.style.height = '100%';
      ui.style.top = '0';
      ui.style.left = '0';
      ui.style.backgroundColor = 'rgba(0,0,0,0.9)';
      ui.style.pointerEvents = 'auto';
      
      let scores = [];
      let fullLogHTML = '';
      let clearTimes = [];
      let endReasons = { CLEAR: 0, TIME_UP: 0, DEATH_FALL: 0 };
      
      game.isBenchmarking = true;
      config.scoreMultiplier = tM;
      game.startScore = tS;
      let clears = 0;
      let totalLoops = 0;
      
      for (let i = 0; i < runs; i++) {
        ui.innerHTML = '<div style="text-align:center;"><h2 style="color:#0f0;font-size:16px;margin-bottom:5px;">BENCHMARKING...</h2><p style="font-size:12px;color:#fff;">RUN ' + (i + 1) + ' / ' + runs + '</p><p style="font-size:10px;color:#aaa;margin-top:10px;">* Skipping rendering for high-speed AI testing</p></div>';
        await new Promise(r => setTimeout(r, 10));
        
        initGame(false);
        game.eventLog = [];
        game.demoMode = true;
        setAuto(true);
        
        let timeout = 0;
        while (game.state !== 'gameover' && game.state !== 'clear' && timeout < 300000) {
          if (game.state === 'playing' || game.state === 'powerup_anim' || game.state === 'powerdown_anim') {
            if (game.timerStarted) game.playTime += frameDuration;
          }
          updatePhysics();
          timeout++;
        }
        
        let sc = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
        scores.push(sc);
        if (sc >= config.goalScore) clears++;
        totalLoops += game.loopCount;
        
        let reason = game.endReason || 'UNKNOWN';
        endReasons[reason] = (endReasons[reason] || 0) + 1;
        if (reason === 'CLEAR') clearTimes.push(game.playTime);
        
        let color = '#aaa';
        if (sc >= config.goalScore) color = '#ff0';
        else if (sc >= 100000) color = '#0ff';
        else if (sc >= 50000) color = '#0f0';
        
        if (sc < 20000 || reason === 'TIME_UP') {
          fullLogHTML += '<div style="color:' + color + '; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;"><b>[Run ' + (i + 1) + '] ' + sc + 'm (' + reason + ')</b><br>' + game.eventLog.join('<br>') + '</div>';
        }
      }
      
      let sum = scores.reduce((a, b) => a + b, 0);
      let avg = FLR(sum / runs);
      let max = MAX(...scores);
      let min = MIN(...scores);
      
      let avgTimeStr = 'N/A';
      if (clearTimes.length > 0) {
        let avgMs = clearTimes.reduce((a, b) => a + b, 0) / clearTimes.length;
        let m = FLR(avgMs / 60000), s = FLR((avgMs % 60000) / 1000);
        avgTimeStr = m + ':' + s.toString().padStart(2, '0');
      }
      
      let summaryText = '[BENCHMARK SUMMARY]<br>Runs: ' + runs + '<br>Avg/Max/Min: ' + avg + 'm / ' + max + 'm / ' + min + 'm<br>Clear Rate: ' + (clears / runs * 100).toFixed(1) + '%<br><span style="color:#0ff">Avg Clear Time: ' + avgTimeStr + '</span><br>End Reasons: CLEAR(' + (endReasons.CLEAR || 0) + ') FALL(' + (endReasons.DEATH_FALL || 0) + ') TIME(' + (endReasons.TIME_UP || 0) + ')<br><br>';
      
      ui.innerHTML = '<div style="text-align:center;background:#111;padding:10px;border:2px solid #fff;border-radius:6px;width:90%;max-width:400px;display:flex;flex-direction:column;gap:5px;"><h2 style="color:#0f0;margin:0;font-size:16px;">BENCHMARK RESULTS</h2><p style="font-size:10px;color:#ddd;margin:0;">Runs: ' + runs + '</p><p style="font-size:16px;color:#ff0;margin:3px 0;font-weight:bold;">Avg: ' + avg + 'm</p><div style="font-size:10px;color:#ccc;display:flex;justify-content:space-around;"><span>Max: ' + max + 'm</span><span>Min: ' + min + 'm</span></div><div style="font-size:10px;color:#0ff;display:flex;justify-content:space-around;margin-top:3px;"><span>Clear Rate: ' + (clears / runs * 100).toFixed(1) + '%</span><span>Loops: ' + totalLoops + '</span></div><div style="width:100%;height:75px;background:#222;font-family:monospace;font-size:8px;border:1px solid #555;padding:3px;box-sizing:border-box;overflow-y:auto;text-align:left; cursor:pointer;" onclick="this.select()" contenteditable="true"><div style="color:#fff;">' + summaryText + '</div>' + fullLogHTML + '</div><button id="db_reload" class="dbg-btn" style="padding:5px;font-size:10px;background:#e60012;border-color:#faa;width:100%;">RELOAD</button></div>';
    }

    export function setAuto(isActive) {
      if (!game.demoMode) return;
      game.aiActive = isActive;
      $('autoBtn').innerText = isActive ? '🤖 ON' : '🤖 OFF';
      $('autoBtn').style.background = isActive ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)';
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
      
      if (!game.isBenchmarking) {
        for (let i = 0; i < 3; i++) {
          game.npcs.push(new NPC(140 + i * 16, 240 - config.playerSize, (i + 1) * 1000, i));
        }
      }
      
      game.player.reset();
      game.platforms = [];
      game.items = [];
      game.coins = [];
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
        game.clouds.push(new BackgroundCloud(RND() * config.gameWidth, cy));
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
      lastTime = performance.now();
      acc = 0;
      
      if (isAttractMode && !demoState.active) $('tapToStartMsg').style.display = 'block';
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
      } else if (game.state === 'intro_anim') {
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
      
      if (game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || game.state === 'intro_anim') {
        updateStateAnimations();
      } else if (game.state !== 'gameover') {
        if (game.demoMode && game.aiActive && (game.state === 'playing' || game.state === 'intro')) runAI(game.player, logAIEvent);
        game.player.update();
        
        updateBirds(game);
        updateNPCs(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode);
        
        if (game.state !== 'intro' && game.state !== 'intro_anim') {
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
        } else if (game.state !== 'intro_anim') {
          updatePlayingState(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode);
        }
        
        postUpdatePhysics(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode, initGame, spawnPlatform);
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
      for (let i = 0; i < 100 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2500, coins: 0, lang: '---' });
      
      let headerHtml = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;"><tr style="color:rgba(255,255,255,0.85);font-size:8px;"><th style="padding:4px 0;text-align:left;width:20%;">RANK</th><th style="padding:4px 0;text-align:center;width:20%;">LANG</th><th style="padding:4px 0;text-align:center;width:40%;">HEIGHT</th><th style="padding:4px 0;text-align:right;width:20%;">COIN</th></tr></table>';
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
        if (i === 0) { m = '<span class="mdl mdl-1"></span>'; color = '#ff0'; fw = 'bold'; }
        else if (i === 1) { m = '<span class="mdl mdl-2"></span>'; color = '#ccc'; fw = 'bold'; }
        else if (i === 2) { m = '<span class="mdl mdl-3"></span>'; color = '#d98'; fw = 'bold'; }
        
        let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:bold;' : '';
        let pt = '6px 0';
        let row = `<tr style="color:${color};font-weight:${fw};${bg}"><td style="padding:${pt};text-align:left;width:20%;white-space:nowrap;overflow:hidden;">${m}${i + 1}</td><td style="text-align:center;padding:${pt};width:20%;white-space:nowrap;overflow:hidden;">${escapeHTML(r.lang || '---')}</td><td style="text-align:center;padding:${pt};width:40%;white-space:nowrap;overflow:hidden;">${escapeHTML(r.alt)}m</td><td style="text-align:right;padding:${pt};width:20%;color:#ffb;white-space:nowrap;overflow:hidden;">${escapeHTML(r.coins || 0)}</td></tr>`;
        
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
      
      if (!game.isBenchmarking) render(ts);
      if (loopRunning) requestAnimationFrame(loop);
    }

    export function togglePause(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (game.state === 'gameover' || game.state === 'clear' || game.isBenchmarking) return;
      game.isPaused = !game.isPaused;
      $('pauseScreen').style.display = game.isPaused ? 'flex' : 'none';
      $('pauseBtn').innerText = game.isPaused ? '▶' : 'II';
    }

    setupInputListeners();

    if (isDev) {
      $('debugModal').style.display = 'flex';
      $('devControls').style.display = 'flex';
      $('prodControls').style.display = 'none';
    } else {
      $('debugModal').style.display = 'none';
      startAttractCycle();
    }
