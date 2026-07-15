import { B64 } from './assets.js';
import { config } from './config.js';
import { runAI } from './ai.js';
import { getLevelConfig } from './level.js';
import { Particle, Bird, Meteor, Player, NPC, Platform, Item, Coin, BackgroundCloud, getPt, getPl, getCn, getBd, getMt, getIt, spawnParticles, spawnDebris, trySpawnBirdsOnPlatform, P_PT, P_PL, P_CN, P_BD, P_MT, P_IT } from './entities.js';
import { LootLockerAPI } from "./lootlocker.js";
import { RankingAPI } from "./ranking.js";
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI, getLang, $ } from "./utils.js";
    
        
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
    const pBtn = $('pauseBtn');
    const autoBtn = $('autoBtn');
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
    let isAttractMode = false;
    let attractTimer = null;
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
        lastBGScore = -1;
      }
    });
    
    window.gameScale = 1;
    let ctrlCenterX = 0;
    
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
    
    export function dR(x, y, w, h, c) {
      if (c !== null) ctx.fillStyle = c;
      ctx.fillRect(FLR(x), FLR(y), FLR(w), FLR(h));
    }
    
    
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

    let demoState = {
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

    let selMode = function(d, el) {
      tDemo = d;
      document.querySelectorAll('.mode-btn').forEach(b => b.style.borderColor = '#555');
      el.style.borderColor = '#0f0';
    };

    let selHgt = function(s, el) {
      tS = s;
      document.querySelectorAll('.hgt-btn').forEach(b => b.style.borderColor = '#555');
      el.style.borderColor = '#0f0';
    };

    let startWithSettings = function() {
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

    async function startBenchmark(runs) {
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

    function setAuto(isActive) {
      if (!game.demoMode) return;
      game.aiActive = isActive;
      autoBtn.innerText = isActive ? '🤖 ON' : '🤖 OFF';
      autoBtn.style.background = isActive ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)';
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

    export function initGame(isConsecutive = false) {
      document.body.classList.remove('game-ended');
      $('tapToStartMsg').style.display = 'none';
      $('tapToStartMsg').innerText = 'TAP TO START';
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
      game.lastCoinY = 0;
      lastTime = performance.now();
      acc = 0;
      
      if (isAttractMode && !demoState.active) $('tapToStartMsg').style.display = 'block';
    }

    function spawnGuideCoins(sX, sY) {
      sX = MAX(35, MIN(config.gameWidth - 35, sX));
      let tp = FLR(RND() * 3), top = sY;
      if (tp === 0) {
        for (let i = 0; i < 10; i++) game.coins.push(getCn(sX, sY - i * 72));
        top = sY - 9 * 72;
      } else if (tp === 1) {
        let d = RND() < 0.5 ? 1 : -1;
        for (let i = 0; i < 10; i++) {
          let cx = MAX(10, MIN(config.gameWidth - 22, sX + SIN(i * 0.15) * 75 * d));
          game.coins.push(getCn(cx, sY - i * 72));
          top = sY - 9 * 72;
        }
      } else {
        for (let i = 0; i < 10; i++) {
          game.coins.push(getCn(sX - 14, sY - i * 72));
          game.coins.push(getCn(sX + 14, sY - i * 72));
          top = sY - 9 * 72;
        }
      }
      game.lastCoinY = top;
    }

    function spawnCoins(y) {
      let pR = config.coinSpawnProb;
      if (game.score >= 120000 && game.score <= 135000) pR = 0.8;
      if (RND() > pR) return;
      
      let tp = FLR(RND() * 3);
      if (game.score >= 120000 && game.score <= 135000) tp = RND() < 0.5 ? 1 : 2;
      
      let bw = 12, bh = 12;
      if (tp === 0) bh = 108;
      else if (tp === 1) { bw = 36; bh = 36; }
      else { bw = 132; bh = 72; }
      
      for (let a = 0; a < 5; a++) {
        let cx = 10 + RND() * (config.gameWidth - 20 - bw), cy = y - 100 - RND() * 100, ol = false;
        if (cy < 230 && cy > -1500) {
          let avoidW = 28, centerX = config.gameWidth / 2;
          if (cx + bw > centerX - avoidW && cx < centerX + avoidW) ol = true;
        }
        if (!ol) {
          for (let p of game.platforms) {
            if (p.broken) continue;
            let px = p.x, py = p.y, pw = p.w, ph = p.h;
            if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
            else if (p.type === 'v-slide') { py = p.startY - 50; ph = p.h + 100; }
            if (cx - 20 < px + pw && cx + bw + 20 > px && cy - 20 < py + ph && cy + bh + 20 > py) { ol = true; break; }
          }
        }
        if (!ol) {
          for (let i of game.items) {
            if (cx - 20 < i.x + i.w && cx + bw + 20 > i.x && cy - 20 < i.y + i.h && cy + bh + 20 > i.y) { ol = true; break; }
          }
        }
        if (!ol) {
          for (let c of game.coins) {
            if (cx - 20 < c.x + c.w && cx + bw + 20 > c.x && cy - 20 < c.y + c.h && cy + bh + 20 > c.y) { ol = true; break; }
          }
        }
        if (ol) continue;
        
        if (tp === 0) {
          for (let i = 0; i < 5; i++) game.coins.push(getCn(cx, cy + i * 24));
        } else if (tp === 1) {
          for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) game.coins.push(getCn(cx + i * 24, cy + j * 24));
          }
        } else {
          let d = cx > config.gameWidth / 2 ? -1 : 1;
          for (let i = 0; i < 5; i++) game.coins.push(getCn(MAX(0, MIN(config.gameWidth - 12, cx + i * 30 * d)), cy - SIN((i / 4) * PI) * 60 + 60));
        }
        game.lastCoinY = cy - bh;
        break;
      }
    }

    function spawnPlatform() {
      let lP = game.platforms[game.platforms.length - 1];
      if (lP && lP.type === 'goal') return;
      
      let gap = 50 + RND() * (MIN(80, 50 + game.score / 100) - 50);
      if (lP && lP.count > 1) gap += 30;
      if (lP && lP.type === 'super') gap += 80;
      let y = lP.y - gap;
      
      if (y <= game.goalY + 170) {
        game.platforms.push(getPl(game.goalY + 170, 'normal', false, null, null, null, 1, true));
        game.platforms.push(getPl(game.goalY + 85, 'normal', false, null, null, null, 1, true));
        game.platforms.push(getPl(game.goalY, 'goal', false, 0, config.gameWidth, 32));
        return;
      }
      
      let spS = (game.baseScoreY - y) * config.scoreMultiplier;
      let lc = getLevelConfig(spS, RND, MAX, FLR);
      let t = lc.t;
      let np = getPl(y, t, false, null, null, null, lc.c, lc.icy);
      game.platforms.push(np);
      
      let genSub = lc.genSub;
      if (genSub) {
        let np2 = getPl(y, lc.subT, false, null, null, null, lc.subC, lc.subIcy);
        if (np2.isOverlapping) {
          P_PL.push(np2);
        } else {
          game.platforms.push(np2);
          trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
        }
      }
      
      let hasM = false, mx = 0, my = 0;
      if (config.itemsEnabled && game.score >= config.mushroomMinScore && spS < 120000 && RND() < config.mushroomSpawnProb) {
        let it = getIt(y - 50 - RND() * 150);
        game.items.push(it);
        hasM = true;
        mx = it.x;
        my = it.y;
      }
      
      let sc = false, cD = (game.score >= 120000 && game.score <= 135000) ? 0.3 : config.coinMinDistance;
      if (y - 300 < game.lastCoinY - config.gameHeight * cD) {
        if (t === 'super' && RND() < 0.5) {
          spawnGuideCoins(np.x + np.w / 2 - 6, y - 60);
          sc = true;
        } else if (hasM && RND() < 0.5) {
          spawnGuideCoins(mx + 2, my - 60);
          sc = true;
        }
        if (!sc) spawnCoins(y);
      }
      trySpawnBirdsOnPlatform(np, spS);
    }

    function updatePhysics() {
      for (let i = game.particles.length - 1; i >= 0; i--) {
        let pt = game.particles[i];
        pt.update();
        if (pt.life <= 0) {
          P_PT.push(pt);
          game.particles.splice(i, 1);
        }
      }
      
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
      } else if (game.state !== 'gameover') {
        if (game.demoMode && game.aiActive && (game.state === 'playing' || game.state === 'intro')) runAI(game.player, logAIEvent);
        game.player.update();
        
        for (let i = game.birds.length - 1; i >= 0; i--) {
          let b = game.birds[i];
          b.update();
          if (b.y > game.cameraY + config.gameHeight + 100 || b.y < game.cameraY - 1000 || b.x < -50 || b.x > config.gameWidth + 50) {
            P_BD.push(b);
            game.birds.splice(i, 1);
          }
        }
        
        if (game.score > game.startScore + 1000 && game.score < 52000) {
          if (RND() < 0.012 && game.birds.filter(b => b.type === 2).length < 1) {
            let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
            let startX = dir === 1 ? -20 : config.gameWidth + 20;
            game.birds.push(getBd(2, startX, game.cameraY + 50 + RND() * (config.gameHeight * 0.5), false));
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
        
        for (let i = game.npcs.length - 1; i >= 0; i--) {
          let npc = game.npcs[i];
          npc.update();
          if (npc.y > 1500) {
            game.npcs.splice(i, 1);
            continue;
          }
          if (npc.stagnationTimer > 1800 && npc.y > game.cameraY + config.gameHeight) {
            game.npcs.splice(i, 1);
            continue;
          }
          if (!npc.active) continue;
          
          if (game.state === 'playing' && !(game.player.hitTimer > 0) && !(npc.hitTimer > 0) && game.player.x < npc.x + npc.w && game.player.x + game.player.w > npc.x && game.player.y < npc.y + npc.h && game.player.y + game.player.h > npc.y) {
            let pStomp = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= npc.y + npc.h * 0.5);
            let nStomp = (npc.vy > 0 && (npc.y + npc.h - npc.vy) <= game.player.y + game.player.h * 0.5);
            
            if (pStomp) {
              game.player.y = npc.y - game.player.h;
              game.player.jump(config.jumpPower * 0.8);
              npc.vy = -3;
              npc.vx = npc.x > game.player.x ? 2 : -2;
              npc.hitTimer = 20;
              spawnParticles(npc.x + npc.w / 2, npc.y, '#fff', 5, 2);
            } else if (nStomp) {
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
            game.platforms.forEach(p => {
              if (p.isGround && p.y === 240 && npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + 15) {
                npc.y = p.y - npc.h;
                npc.vy = 0;
                onG = true;
              }
            });
          }
          
          if (!onG && npc.vy > 0) {
            game.platforms.forEach(p => {
              if (p.broken || p.isCrumbling) return;
              if (npc.isIntro && p.isGround) return;
              if (npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + p.h + npc.vy) {
                if (p.type === 'goal') {
                  npc.y = p.y - npc.h;
                  npc.vy = -npc.vy * 0.1;
                  if (game.state === 'playing') {
                    game.state = 'gameover';
                    document.body.classList.add('game-ended');
                    game.endReason = 'NPC_CLEAR';
                    game.clearTime = game.playTime;
                    game.shakeAmount = 0;
                    if (!isAttractMode) {
                      pBtn.style.display = 'none';
                      autoBtn.style.display = 'none';
                    }
                    $('tapToStartMsg').style.display = 'none';
                    ignoreNextTap = true;
                    spawnParticles(npc.x + npc.w / 2, p.y, '#f00', 5);
                    let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
                    (async () => {
                      await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'NPC_CLEAR');
                      if (!game.isBenchmarking) {
                        setTimeout(() => {
                          if (game.state === 'gameover') {
                            if (!isAttractMode) RankingAPI.show('gameover');
                            else {
                              ignoreNextTap = false;
                              $('tapToStartMsg').style.display = 'block';
                            }
                          }
                        }, 500);
                      }
                    })();
                    if (game.demoMode && !game.isBenchmarking && !isAttractMode) {
                      setTimeout(function() {
                        if (game.state === 'gameover') initGame(false);
                      }, 5000);
                    }
                  }
                  return;
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
                  npc.sameBounceCount++;
                  if (npc.sameBounceCount > 4) {
                    p.blacklisted = true;
                    if (npc.aiPath.length > 0) npc.aiPath[0].blacklisted = true;
                    npc.aiPath = [];
                    npc.sameBounceCount = 0;
                  }
                } else {
                  npc.sameBounceCount = 0;
                  npc.lastPlatform = p;
                }
                
                if (ap <= config.superJumpPower) {
                  npc.stagnationTimer = 0;
                  npc.adventureMode = false;
                }
                if (!npc.visitedHistory.includes(p)) npc.visitedHistory.push(p);
                
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
            });
          }
        }
        
        if (game.state !== 'intro' && game.state !== 'intro_anim') {
          if (game.player.y < game.goalY - 120) {
            game.player.y = game.goalY - 120;
            if (game.player.vy < 0) game.player.vy = 0;
          }
          if (game.player.y < game.goalY && game.player.vy > 1.5) game.player.vy = 1.5;
        }
        
        game.platforms.forEach(function(p) { p.update(); });
        
        for (let i = game.meteors.length - 1; i >= 0; i--) {
          let m = game.meteors[i];
          m.update();
          if (m.y > game.cameraY + config.gameHeight + 100) {
            P_MT.push(m);
            game.meteors.splice(i, 1);
          } else if (game.state === 'playing' && !(game.player.hitTimer > 0) && game.player.x < m.x + m.w && game.player.x + game.player.w > m.x && game.player.y < m.y + m.h && game.player.y + game.player.h > m.y) {
            let isStomping = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= m.y + m.h * 0.5);
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
            } else {
              if (m.hitTimer > 0) continue;
              m.hitTimer = 60;
              if (game.demoMode && game.aiActive) game.player.aiPath = [];
              if (game.player.isPoweredUp) {
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
              }
            }
          }
        }
        
        if (game.score >= 80000 && game.score <= 120000 && game.state === 'playing') {
          let dF = (game.score - 80000) / 40000;
          let mM = dF < 0.33 ? 1 : (dF < 0.66 ? 2 : 3);
          if (game.meteors.length < mM && RND() < (0.015 + dF * 0.015) * config.scoreMultiplier) {
            game.meteors.push(getMt(10 + RND() * (config.gameWidth - 40), game.cameraY - 40, (RND() - 0.5) * 1.0, 0.8 + dF * 0.7));
          }
        }
        
        if (game.state === 'intro') {
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
        } else if (game.state !== 'intro_anim') {
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
              c.animTimer = 30;
              c.vy = -5;
              game.scoreCoin++;
              spawnParticles(c.x + c.w / 2, c.y + c.h / 2, '#fd0', 3, 2);
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
                  game.clearTime = game.playTime;
                  game.shakeAmount = 0;
                  if (!isAttractMode) {
                    pBtn.style.display = 'none';
                    autoBtn.style.display = 'none';
                  }
                  $('tapToStartMsg').style.display = 'none';
                  ignoreNextTap = true;
                  spawnParticles(game.player.x + game.player.w / 2, p.y, '#ccc', 5);
                  
                  let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
                  (async () => {
                    await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'CLEAR');
                    if (!game.isBenchmarking) {
                      setTimeout(() => {
                        if (game.state === 'clear') {
                          if (!isAttractMode) RankingAPI.show('clear');
                          else {
                            ignoreNextTap = false;
                            $('tapToStartMsg').style.display = 'block';
                          }
                        }
                      }, 500);
                    }
                  })();
                  
                  if (game.demoMode && !game.isBenchmarking) {
                    setTimeout(function() {
                      if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
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
                      if (game.player.sameBounceCount > 4) {
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
                    if (!game.player.visitedHistory.includes(p)) game.player.visitedHistory.push(p);
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
      }
      
      let upB = game.cameraY + config.gameHeight * 0.4, lowB = game.cameraY + config.gameHeight * 0.6, nY = game.cameraY;
      if (game.player.y < upB) nY -= (upB - game.player.y) * 0.15;
      else if (game.player.y > lowB) nY += (game.player.y - lowB) * 0.15;
      
      let mY = game.goalY - config.gameHeight * 0.25;
      if (nY < mY) nY = mY;
      if (nY < game.highestCameraY) game.highestCameraY = nY;
      
      game.cameraY = MIN(nY, game.highestCameraY + config.gameHeight * config.recoveryScreens);
      if (game.player.y < game.highestPlayerY) game.highestPlayerY = game.player.y;
      
      game.score = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
      
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
            logAIEvent('DEATH_FALL', 'adv:' + game.player.adventureMode + ' vy:' + game.player.vy.toFixed(1));
            game.shakeAmount = 0;
            game.state = 'gameover';
            document.body.classList.add('game-ended');
            game.endReason = 'DEATH_FALL';
            game.player.y = game.cameraY + config.gameHeight - game.player.h * 0.5;
            
            if (!isAttractMode) {
              pBtn.style.display = 'none';
              autoBtn.style.display = 'none';
            }
            $('tapToStartMsg').style.display = 'none';
            ignoreNextTap = true;
            
            let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
            (async () => {
              await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'DEATH_FALL');
              if (!game.isBenchmarking) {
                setTimeout(() => {
                  if (game.state === 'gameover') {
                    if (!isAttractMode) RankingAPI.show('gameover');
                    else {
                      ignoreNextTap = false;
                      $('tapToStartMsg').style.display = 'block';
                    }
                  }
                }, 500);
              }
            })();
            
            if (game.demoMode && !game.isBenchmarking) {
              setTimeout(function() {
                if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
              }, isAttractMode ? 2000 : 5000);
            }
          }
        }
      }
      
      if (game.playTime >= config.timeLimit * 1000 && game.state !== 'gameover' && game.state !== 'clear') {
        logAIEvent('TIME_UP', '');
        game.shakeAmount = 0;
        game.state = 'gameover';
        document.body.classList.add('game-ended');
        game.endReason = 'TIME_UP';
        if (!isAttractMode) {
          pBtn.style.display = 'none';
          autoBtn.style.display = 'none';
        }
        $('tapToStartMsg').style.display = 'none';
        ignoreNextTap = true;
        
        let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
        (async () => {
          await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'TIME_UP');
          if (!game.isBenchmarking) {
            setTimeout(() => {
              if (game.state === 'gameover') {
                if (!isAttractMode) RankingAPI.show('gameover');
                else {
                  ignoreNextTap = false;
                  $('tapToStartMsg').style.display = 'block';
                }
              }
            }, 500);
          }
        })();
        
        if (game.demoMode && !game.isBenchmarking) {
          setTimeout(function() {
            if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
          }, isAttractMode ? 2000 : 5000);
        }
      }
    }

    function formatTime(ms) {
      let m = FLR(ms / 60000), s = FLR((ms % 60000) / 1000), msec = FLR(ms % 1000);
      return m + ':' + s.toString().padStart(2, '0') + '.' + msec.toString().padStart(3, '0');
    }

    function getColorAtScore(s) {
      let phases = config.bgPhases;
      if (s <= phases[0].score) return phases[0].color;
      if (s >= phases[phases.length - 1].score) return phases[phases.length - 1].color;
      
      for (let i = 0; i < phases.length - 1; i++) {
        let p1 = phases[i], p2 = phases[i + 1];
        if (s >= p1.score && s <= p2.score) {
          let r = (s - p1.score) / (p2.score - p1.score);
          return {
            r: p1.color.r + (p2.color.r - p1.color.r) * r,
            g: p1.color.g + (p2.color.g - p1.color.g) * r,
            b: p1.color.b + (p2.color.b - p1.color.b) * r
          };
        }
      }
      return phases[0].color;
    }

    const bgCache = document.createElement('canvas');
    bgCache.width = 1;
    bgCache.height = config.gameHeight;
    const bgCtx = bgCache.getContext('2d', { alpha: false });
    let lastBGScore = -1;
    const cloudCaches = [];
    
    for (let i = 0; i < 3; i++) {
      let c = document.createElement('canvas');
      let cx = c.getContext('2d', { alpha: true });
      let s = 10;
      if (i === 0) {
        c.width = s * 6; c.height = s * 3;
        cx.fillStyle = '#fff';
        cx.fillRect(s, s, s * 4, s * 2);
        cx.fillRect(s * 2, 0, s * 2, s);
        cx.fillRect(0, s * 2, s * 6, s);
      } else if (i === 1) {
        c.width = s * 7; c.height = s * 3;
        cx.fillStyle = '#fff';
        cx.fillRect(s, s, s * 5, s * 2);
        cx.fillRect(s * 2, 0, s * 3, s);
        cx.fillRect(0, s * 2, s * 7, s);
      } else {
        c.width = s * 5; c.height = s * 3;
        cx.fillStyle = '#fff';
        cx.fillRect(s, s, s * 3, s * 2);
        cx.fillRect(s * 2, 0, s * 2, s);
        cx.fillRect(0, s * 2, s * 5, s);
      }
      cloudCaches.push(c);
    }

    function drawBG(ts) {
      let scoreTop = (game.baseScoreY - game.cameraY) * config.scoreMultiplier;
      let sT = FLR(scoreTop);
      if (sT !== lastBGScore) {
        let scoreBottom = (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier;
        let grad = bgCtx.createLinearGradient(0, 0, 0, config.gameHeight);
        for (let i = 0; i <= 4; i++) {
          let ratio = i / 4;
          let s = scoreTop - (scoreTop - scoreBottom) * ratio;
          let c = getColorAtScore(s);
          grad.addColorStop(ratio, 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')');
        }
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1, config.gameHeight);
        lastBGScore = sT;
      }
      ctx.drawImage(bgCache, 0, 0, 1, config.gameHeight, 0, 0, config.gameWidth, config.gameHeight);
      
      let currentVisScore = (scoreTop + (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier) / 2;
      let sA = 0;
      if (currentVisScore >= 45000 && currentVisScore < 60000) sA = (currentVisScore - 45000) / 15000;
      else if (currentVisScore >= 60000 && currentVisScore < 125000) sA = 1;
      else if (currentVisScore >= 125000 && currentVisScore < 135000) sA = 1 - (currentVisScore - 125000) / 10000;
      
      let bA = (currentVisScore < 100000);
      if (sA > 0) {
        ctx.fillStyle = '#fff';
        game.stars.forEach(function(st) {
          let sy = (st.y - game.cameraY * st.speed) % config.gameHeight;
          if (sy < 0) sy += config.gameHeight;
          ctx.globalAlpha = sA * (bA ? (0.5 + 0.5 * SIN(ts * st.blink)) : 1);
          ctx.fillRect(FLR(st.x), FLR(sy), st.size, st.size);
        });
        ctx.globalAlpha = 1.0;
      }
      
      let cA = currentVisScore < 40000 ? 1 : (currentVisScore < 50000 ? 1 - (currentVisScore - 40000) / 10000 : 0);
      if (cA > 0) {
        game.clouds.forEach(function(c) {
          let sy = (c.y - game.cameraY) * c.speed, s = 10 * c.scale;
          if (sy > config.gameHeight || sy + s * 3 < 0) return;
          ctx.globalAlpha = cA * (c.speed === 0.6 ? 0.15 : 0.25);
          let cc = cloudCaches[c.type];
          ctx.drawImage(cc, FLR(c.x - s), FLR(sy - s), FLR(cc.width * c.scale), FLR(cc.height * c.scale));
          ctx.globalAlpha = 1.0;
        });
      }
      return getColorAtScore(scoreTop);
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
        if (i === 0) { m = '<span class="mdl mdl-1"></span>'; color = '#ff0'; fw = 'bold'; }
        else if (i === 1) { m = '<span class="mdl mdl-2"></span>'; color = '#ccc'; fw = 'bold'; }
        else if (i === 2) { m = '<span class="mdl mdl-3"></span>'; color = '#d98'; fw = 'bold'; }
        
        let pt = '6px 0';
        let row = `<tr style="color:${color};font-weight:${fw};"><td style="padding:${pt};text-align:left;width:20%;white-space:nowrap;overflow:hidden;">${m}${i + 1}</td><td style="text-align:center;padding:${pt};width:20%;white-space:nowrap;overflow:hidden;">${r.lang || '---'}</td><td style="text-align:center;padding:${pt};width:40%;white-space:nowrap;overflow:hidden;">${r.alt}m</td><td style="text-align:right;padding:${pt};width:20%;color:#ffb;white-space:nowrap;overflow:hidden;">${r.coins || 0}</td></tr>`;
        
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

    function render(ts) {
      let topColor = drawBG(ts);
      ctx.save();
      
      let sX = 0, sY = 0;
      if (game.shakeAmount > 0) {
        sX = (RND() - 0.5) * 2 * game.shakeAmount;
        sY = (RND() - 0.5) * 2 * game.shakeAmount;
        game.shakeAmount *= 0.85;
        if (game.shakeAmount < 0.5) game.shakeAmount = 0;
      }
      ctx.translate(FLR(sX), FLR(-game.cameraY + sY));
      
      if (IMG.title && IMG.title.complete && IMG.title.naturalWidth > 0) {
        ctx.drawImage(IMG.title, FLR((config.gameWidth - IMG.title.naturalWidth) / 2), 95);
        ctx.save();
        ctx.font = '6px "Press Start 2P", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'right';
        ctx.fillText(RankingAPI.version, config.gameWidth - 5, 205);
        ctx.restore();
      }
      
      if (isDev && game.demoMode && game.aiActive && game.player.aiPath && game.player.aiPath.length > 0) {
        ctx.strokeStyle = game.player.adventureMode ? 'rgba(255, 255, 0, 0.8)' : 'rgba(0, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let px = game.player.x + game.player.w / 2;
        let py = game.player.y + game.player.h / 2;
        ctx.moveTo(px, py);
        for (let n of game.player.aiPath) {
          let nx = n.x + (n.w ? n.w / 2 : 8);
          let ny = n.y + (n.h ? n.h / 2 : 8);
          if (n.type === 'h-slide') nx += n.direction * 30;
          let dx = nx - px;
          if (ABS(dx) > config.gameWidth / 2) {
            let wrappedNx = dx > 0 ? nx - config.gameWidth : nx + config.gameWidth;
            let wrappedPx = dx > 0 ? px + config.gameWidth : px - config.gameWidth;
            ctx.lineTo(wrappedNx, ny);
            ctx.moveTo(wrappedPx, py);
          }
          ctx.lineTo(nx, ny);
          ctx.fillStyle = game.player.adventureMode ? 'rgba(255, 255, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
          ctx.arc(nx, ny, 3, 0, PI * 2);
          ctx.fill();
          ctx.moveTo(nx, ny);
          px = nx;
          py = ny;
        }
        ctx.stroke();
      }
      
      game.birds.forEach(function(b) {
        if (!b.isPerched && (b.type === 1 || b.type === 2)) b.draw(ts);
      });
      game.platforms.forEach(function(p) {
        if (p.y > game.cameraY + config.gameHeight + 100 || p.y + (p.h || 32) < game.cameraY - 100) return;
        p.draw();
      });
      game.items.forEach(function(i) {
        if (i.y > game.cameraY + config.gameHeight + 50 || i.y + i.h < game.cameraY - 50) return;
        i.draw();
      });
      game.coins.forEach(function(c) {
        if (c.y > game.cameraY + config.gameHeight + 50 || c.y + c.h < game.cameraY - 50) return;
        c.draw();
      });
      game.meteors.forEach(function(m) {
        m.draw();
      });
      game.particles.forEach(function(pt) {
        pt.draw();
      });
      game.birds.forEach(function(b) {
        if (b.type === 0 || (b.isPerched && b.type === 1)) b.draw(ts);
      });
      game.npcs.forEach(function(n) {
        n.draw();
      });
      game.player.draw();
      
      ctx.restore();
      
      game.npcs.forEach(function(n) {
        let cx = n.x + n.w / 2, cy = n.y + n.h / 2, sy = cy - game.cameraY, sx = cx;
        if (sy < 0 || sy > config.gameHeight || sx < 0 || sx > config.gameWidth) {
          let indX = MAX(10, MIN(config.gameWidth - 10, sx)), indY = MAX(10, MIN(config.gameHeight - 10, sy)), ang = Math.atan2(sy - indY, sx - indX);
          if (sy > config.gameHeight) ang = Math.PI / 2;
          else if (sy < 0) ang = -Math.PI / 2;
          ctx.save();
          ctx.translate(indX, indY);
          ctx.rotate(ang);
          ctx.fillStyle = n.active ? 'rgba(100,150,255,0.8)' : 'rgba(100,100,100,0.5)';
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(-5, 5);
          ctx.lineTo(-5, -5);
          ctx.fill();
          ctx.restore();
        }
      });
      
      let lum = topColor.r * 0.299 + topColor.g * 0.587 + topColor.b * 0.114;
      if (lum > 140) wrap.classList.add('bright-bg');
      else wrap.classList.remove('bright-bg');
      
      let effPlayTime = (game.state === 'clear') ? game.clearTime : game.playTime;
      let timeLeft = MAX(0, config.timeLimit - effPlayTime / 1000);
      let timeStr = Math.ceil(timeLeft).toString().padStart(3, '0');
      
      let timeNumStyle = '';
      if (timeLeft <= 10 && timeLeft > 0) timeNumStyle = 'color:#f33;animation:blinkRetro 0.3s infinite;';
      else if (timeLeft <= 60 && timeLeft > 0) timeNumStyle = 'color:#ff0;animation:blinkRetro 0.3s infinite;';
      else if (timeLeft === 0) timeNumStyle = 'color:#f00;';
      
      let aiStatus = '';
      if (isDev && game.demoMode && game.aiActive) {
        if (game.player.adventureMode) aiStatus = '<br><span style="color:#ff0;font-size:5px;animation:blink 0.5s infinite alternate">⚡ SURVIVAL MODE</span>';
        else if (game.player.stagnationTimer > 80) aiStatus = '<br><span style="color:#fa0;font-size:5px;">DEEP SEARCH...</span>';
        else aiStatus = '<br><span style="color:#0f0;font-size:5px;">FEARLESS AI</span>';
      }
      
      let curState = game.scoreCoin + '_' + MIN(config.goalScore, game.score) + '_' + timeStr + '_' + aiStatus;
      if (game.lastUI !== curState) {
        let cI = '<div style="display:inline-block;width:10px;height:10px;position:relative;margin-right:4px;"><div style="position:absolute;left:2px;top:0;width:6px;height:10px;background:#fd0;"></div><div style="position:absolute;left:0;top:2px;width:10px;height:6px;background:#fd0;"></div><div style="position:absolute;left:3px;top:2px;width:4px;height:6px;background:#ff9;"></div></div>';
        let nUI = '<span style="flex:1;text-align:left;display:flex;align-items:center;">' + cI + game.scoreCoin + '</span><span style="flex:1;text-align:center;">' + MIN(config.goalScore, game.score) + 'm' + aiStatus + '</span><span style="flex:1;text-align:right;">TIME <span style="' + timeNumStyle + '">' + timeStr + '</span></span>';
        ui.innerHTML = nUI;
        game.lastUI = curState;
      }
      
      if (demoState.active && demoState.phase === 'scroll') {
        if (!demoState.calculated) {
          demoState.containerH = $('demoRankingContainer').offsetHeight;
          demoState.headerH = $('demoHeader').offsetHeight;
          demoState.t3H = $('demoTop3').offsetHeight;
          demoState.otH = $('demoOthers').offsetHeight;
          demoState.startScrollY = demoState.containerH;
          demoState.fixedHeaderY = demoState.containerH * 0.15;
          demoState.fixedTop3Y = demoState.fixedHeaderY + demoState.headerH;
          demoState.gap = 8;
          demoState.wH = demoState.containerH - demoState.fixedTop3Y - demoState.t3H - demoState.gap;
          $('demoOthersWrapper').style.height = demoState.wH + 'px';
          demoState.dist1 = demoState.containerH - demoState.fixedHeaderY;
          demoState.dist2 = MAX(0, demoState.otH - demoState.wH + 40);
          demoState.totalDist = demoState.dist1 + demoState.dist2;
          demoState.scrollDuration = (demoState.totalDist / 0.035);
          demoState.calculated = true;
        }
        
        let elapsed = ts - demoState.startTime;
        let progress = MIN(1, elapsed / demoState.scrollDuration);
        let currentScrolled = demoState.totalDist * progress;
        
        if (currentScrolled < demoState.dist1) {
          let headerY = demoState.containerH - currentScrolled;
          $('demoHeader').style.transform = `translateY(${headerY}px)`;
          $('demoTop3').style.transform = `translateY(${headerY + demoState.headerH}px)`;
          $('demoOthersWrapper').style.transform = `translateY(${headerY + demoState.headerH + demoState.t3H + demoState.gap}px)`;
          $('demoOthers').style.transform = 'translateY(0px)';
          $('demoOthersWrapper').style.maskImage = 'none';
          $('demoOthersWrapper').style.webkitMaskImage = 'none';
        } else {
          $('demoHeader').style.transform = `translateY(${demoState.fixedHeaderY}px)`;
          $('demoTop3').style.transform = `translateY(${demoState.fixedTop3Y}px)`;
          $('demoOthersWrapper').style.transform = `translateY(${demoState.fixedTop3Y + demoState.t3H + demoState.gap}px)`;
          let othersScrolled = currentScrolled - demoState.dist1;
          $('demoOthers').style.transform = `translateY(${-othersScrolled}px)`;
          $('demoOthersWrapper').style.maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)';
          $('demoOthersWrapper').style.webkitMaskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)';
        }
        
        if (progress >= 1) {
          demoState.phase = 'wait';
          setTimeout(() => {
            if (!isAttractMode) return;
            let fo = $('fadeOverlay');
            fo.style.display = 'block';
            fo.offsetHeight;
            fo.style.opacity = '1';
            setTimeout(() => {
              if (!isAttractMode) return;
              $('demoRankingContainer').style.display = 'none';
              $('demoRankingContainer').style.opacity = '1';
              $('demoRankingContainer').style.transition = 'none';
              runAttractUICycle();
              setTimeout(() => {
                fo.style.opacity = '0';
                setTimeout(() => { fo.style.display = 'none'; }, 1000);
              }, 500);
            }, 1000);
          }, 3000);
        }
      }
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

    function togglePause(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (game.state === 'gameover' || game.state === 'clear' || game.isBenchmarking) return;
      game.isPaused = !game.isPaused;
      pScreen.style.display = game.isPaused ? 'flex' : 'none';
      pBtn.innerText = game.isPaused ? '▶' : 'II';
    }

    ['touchstart', 'mousedown'].forEach(function(ev) {
      pBtn.addEventListener(ev, togglePause, { passive: false });
      autoBtn.addEventListener(ev, function(e) {
        e.preventDefault();
        e.stopPropagation();
        setAuto(!game.aiActive);
      }, { passive: false });
      $('pauseScreen').addEventListener(ev, e => {
        if (e.target.id === 'btnTitlePause') {
          e.preventDefault();
          e.stopPropagation();
          game.isPaused = false;
          $('pauseScreen').style.display = 'none';
          ignoreNextTap = true;
          setTimeout(() => ignoreNextTap = false, 500);
          startAttractCycle();
        }
      }, { passive: false });
    });

    document.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (t) {
        if (t.id === 'db_m') selMode(false, t);
        else if (t.id === 'db_a') selMode(true, t);
        else if (t.id === 'db_ar') {
          game.allowAutoRank = !game.allowAutoRank;
          t.innerText = game.allowAutoRank ? 'ENTRY: ON' : 'ENTRY: OFF';
          t.style.borderColor = game.allowAutoRank ? '#0f0' : '#555';
        }
        else if (t.id === 'db_h0') selHgt(0, t);
        else if (t.id === 'db_h35') selHgt(35000, t);
        else if (t.id === 'db_h75') selHgt(75000, t);
        else if (t.id === 'db_h115') selHgt(115000, t);
        else if (t.id === 'db_h130') selHgt(130000, t);
        else if (t.id === 'db_start') startWithSettings();
        else if (t.id === 'db_rank_reset') RankingAPI.reset();
        else if (t.id === 'db_title') { $('debugModal').style.display = 'none'; startAttractCycle(); }
        else if (t.id === 'db_b10') startBenchmark(10);
        else if (t.id === 'db_b50') startBenchmark(50);
        else if (t.id === 'db_b100') startBenchmark(100);
        else if (t.id === 'closeRankBtn') $('rankingModal').style.display = 'none';
        else if (t.id === 'db_reload') location.reload();
      } else {
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          RankingAPI.showRanking(game.state);
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            e.preventDefault();
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
        }
      }
    });

    ['touchstart', 'mousedown'].forEach(ev => {
      $('rankingModal').addEventListener(ev, e => {
        if (e.target.id === 'closeRankBtn') return;
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          e.preventDefault();
          RankingAPI.showRanking(game.state);
          return;
        }
        if (isAttractMode) {
          if (ignoreNextTap) return;
          e.preventDefault();
          startRealGame();
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            e.preventDefault();
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
        }
      }, { passive: false });
      
      let dc = $('demoRankingContainer');
      if (dc) {
        dc.addEventListener(ev, e => {
          if (isAttractMode) {
            if (ignoreNextTap) return;
            e.preventDefault();
            startRealGame();
          }
        }, { passive: false });
      }
    });

    const inputHandler = {
      active: new Map(),
      update: function() {
        if (game.demoMode && game.aiActive) return;
        let d = 0;
        this.active.forEach(v => { d = v; });
        game.player.inputDir = d;
        btnL.classList.toggle('active-visual', d === -1);
        btnR.classList.toggle('active-visual', d === 1);
      },
      start: function(id, d) {
        if (game.state === 'gameover' || game.state === 'clear') return;
        this.active.set(id, d);
        this.update();
      },
      end: function(id) {
        this.active.delete(id);
        this.update();
      }
    };

    const ctrlArea = $('controlArea');
    function getCtrlDir(cx) {
      return (cx - ctrlCenterX < 0) ? -1 : 1;
    }

    ['touchstart', 'mousedown'].forEach(ev => {
      ctrlArea.addEventListener(ev, e => {
        e.preventDefault();
        if (isAttractMode) {
          startRealGame();
          return;
        }
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          RankingAPI.showRanking(game.state);
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
          return;
        }
        if (game.demoMode && game.aiActive) setAuto(false);
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => inputHandler.start('c_' + t.identifier, getCtrlDir(t.clientX)));
        } else {
          inputHandler.start('c_m', getCtrlDir(e.clientX));
        }
      }, { passive: false });
    });

    ['touchmove', 'mousemove'].forEach(ev => {
      ctrlArea.addEventListener(ev, e => {
        if (e.cancelable) e.preventDefault();
        if (isAttractMode) return;
        if (game.demoMode && game.aiActive) return;
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => {
            if (inputHandler.active.has('c_' + t.identifier)) inputHandler.start('c_' + t.identifier, getCtrlDir(t.clientX));
          });
        } else {
          if (inputHandler.active.has('c_m')) inputHandler.start('c_m', getCtrlDir(e.clientX));
        }
      }, { passive: false });
    });

    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
      ctrlArea.addEventListener(ev, e => {
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => inputHandler.end('c_' + t.identifier));
        } else {
          inputHandler.end('c_m');
        }
      });
    });

    const tOv = $('touchOverlay');
    const tOrgs = new Map();

    ['touchstart', 'mousedown'].forEach(ev => {
      tOv.addEventListener(ev, e => {
        e.preventDefault();
        if (isAttractMode) {
          startRealGame();
          return;
        }
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          RankingAPI.showRanking(game.state);
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
          return;
        }
        if (game.demoMode && game.aiActive) return;
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => {
            let id = 'sc_' + t.identifier;
            tOrgs.set(id, t.clientX);
            inputHandler.start(id, 0);
          });
        } else {
          tOrgs.set('sc_m', e.clientX);
          inputHandler.start('sc_m', 0);
        }
      }, { passive: false });
    });

    ['touchmove', 'mousemove'].forEach(ev => {
      tOv.addEventListener(ev, e => {
        if (e.cancelable) e.preventDefault();
        if (game.demoMode && game.aiActive) return;
        let proc = (id, cx) => {
          if (inputHandler.active.has(id) && tOrgs.has(id)) {
            let b = tOrgs.get(id);
            let thr = 12 * window.gameScale;
            if (cx > b + thr) b = cx - thr;
            else if (cx < b - thr) b = cx + thr;
            tOrgs.set(id, b);
            let df = cx - b;
            inputHandler.start(id, df > 2 * window.gameScale ? 1 : (df < -2 * window.gameScale ? -1 : 0));
          }
        };
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => proc('sc_' + t.identifier, t.clientX));
        } else {
          proc('sc_m', e.clientX);
        }
      }, { passive: false });
    });

    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
      tOv.addEventListener(ev, e => {
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => {
            let id = 'sc_' + t.identifier;
            inputHandler.end(id);
            tOrgs.delete(id);
          });
        } else {
          inputHandler.end('sc_m');
          tOrgs.delete('sc_m');
        }
      });
    });

    let themeBtn = document.querySelectorAll('.thm-btn');
    themeBtn.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        themeBtn.forEach(b => b.style.borderColor = '#555');
        this.style.borderColor = '#0f0';
        let th = 'neo';
        if (this.id === 'th_cls') th = 'classic';
        else if (this.id === 'th_vin') th = 'vintage';
        $('controlArea').setAttribute('data-theme', th);
      });
    });

    btnL.style.display = btnR.style.display = 'flex';

    function startAttractCycle() {
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

    function runAttractUICycle() {
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

    function startRealGame() {
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

    ['touchstart', 'mousedown'].forEach(ev => {
      $('prodControls').addEventListener(ev, e => {
        if (ignoreNextTap) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.target.closest('#btnToDev')) {
          e.stopPropagation();
          clearTimeout(attractTimer);
          isAttractMode = false;
          demoState.active = false;
          document.body.classList.remove('attract-mode');
          $('prodControls').style.display = 'none';
          $('tapToStartMsg').style.display = 'none';
          $('demoRankingContainer').style.display = 'none';
          $('devControls').style.display = 'flex';
          $('debugModal').style.display = 'flex';
          $('debugModal').style.background = 'rgba(0,0,0,0.85)';
          return;
        }
        if (isAttractMode) {
          e.preventDefault();
          startRealGame();
        }
      }, { passive: false });
    });

    if (isDev) {
      $('debugModal').style.display = 'flex';
      $('devControls').style.display = 'flex';
      $('prodControls').style.display = 'none';
    } else {
      $('debugModal').style.display = 'none';
      startAttractCycle();
    }
