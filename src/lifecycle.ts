let tM = 4, tS = 0;
import { IMG, ctx, pBtn, groundCache, groundCached, ctrlCenterX } from './display.js';
import { loopRunning, resetLoopStats, startLoop } from './loop.js';
import { applyCoinCountUp } from './ui-effects.js';
import { secureStorage } from './secureStorage.js';
import { startDemoRankingScroll } from './demo-ranking.js';
import { updateBirds, updateMeteors, updateParticles, updateFlyingCoins, updateNPCs, updatePlayingState, postUpdatePhysics } from "./update.js";
import { updatePhysicsMain } from './update.js';
import { B64 } from './assets.js';
import { config, SCORE_THRESHOLDS } from './config.js';
import { runAI } from './ai.js';
import { getLevelConfig } from './level.js';
import { Particle, Bird, Meteor, Player, NPC, Platform, Item, Coin, BackgroundCloud, getPt, getPl, getCn, getBd, getMt, getIt, getCl, spawnParticles, spawnDebris, trySpawnBirdsOnPlatform, P_PT, P_PL, P_CN, P_BD, P_MT, P_IT, P_CL, P_FC } from './entities/index.js';
import { LootLockerAPI } from "./lootlocker.js";
import { RankingAPI } from "./ranking.js";
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI, getLang, $, escapeHTML, getPlayerName } from "./utils.js";
import { initSpawner, spawnGuideCoins, spawnCoins, spawnPlatform, getSafetyLineY, isInMushroomForbiddenZone } from './spawner.js';
import { dR } from './renderer/core.js';
import { resetBGScore } from './renderer/bg.js';
import { render } from './renderer/index.js';

import { inputHandler, setupInputListeners } from './input.js';
import { checkUpdateAndReload } from './pwa.js';
import { game, demoState, resetGameStateData } from './state.js';
import { setupKeyboardUI, openNameEditModal } from './keyboard.js';
import { fireworksSystem } from './fireworks.js';
import { airplaneSystem } from './airplane.js';
import { initShop, updateShopUI, onEnterShop } from './shop.js';
export { dR, inputHandler };

const GEAR_ICON_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" style="fill:#fff; pointer-events:none; display: block; margin: auto;"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
const PAUSE_ICON_SVG = `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" style="pointer-events:none; display: block; margin: auto;"><rect x="3" y="2" width="3" height="12" fill="#ffffff"/><rect x="10" y="2" width="3" height="12" fill="#ffffff"/></svg>`;

let cachedPauseBtn: HTMLElement | null = null;
let cachedShopScreen: HTMLElement | null = null;
let cachedRankingModal: HTMLElement | null = null;
let lastPauseBtnState: string = '';

export function updatePauseButton() {
  if (!cachedPauseBtn) cachedPauseBtn = $('pauseBtn');
  const pBtn = cachedPauseBtn;
  if (!pBtn) return;
  
  if (!cachedShopScreen) cachedShopScreen = $('shopScreen');
  if (!cachedRankingModal) cachedRankingModal = $('rankingModal');

  const isShopOpen = cachedShopScreen?.style.display === 'flex';
  const isRankingOpen = cachedRankingModal?.style.display === 'flex';
  
  let targetState = 'none';
  if (game.isPaused || isShopOpen || isRankingOpen || game.state === 'gameover' || game.state === 'clear' || demoState.active) {
    targetState = 'none';
  } else if (game.state === 'playing' || game.state === 'intro' || game.state === 'intro_anim' || game.state === 'powerup_anim' || game.state === 'powerdown_anim') {
    targetState = isAttractMode ? 'flex_gear' : 'flex_pause';
  }

  if (lastPauseBtnState !== targetState) {
    if (targetState === 'none') {
      pBtn.style.display = 'none';
    } else {
      pBtn.style.display = 'flex';
      pBtn.innerHTML = (targetState === 'flex_gear') ? GEAR_ICON_SVG : PAUSE_ICON_SVG;
    }
    lastPauseBtnState = targetState;
  }
}
    
        
export let isAttractMode = false;
export let attractTimer = null;
export let ignoreNextTap = false;
export function setIgnoreNextTap(val) { ignoreNextTap = val; }


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
    startDemoRankingScroll(isAttractMode, demoState.rankingMode);
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
  demoState.rankingMode = 'ta';
  fireworksSystem.launch();
  
  let btnInsta = $('btnInstagram');
  if (btnInsta) btnInsta.style.display = 'flex';

  $('rankingModal').style.display = 'none'; document.body.classList.remove('showing-ranking');
  $('demoRankingContainer').style.display = 'none';
  $('tapToStartMsg').innerText = 'TAP TO START';
  $('tapToStartMsg').style.display = 'block';
  document.body.classList.add('attract-mode');
  updatePauseButton();
  if (!loopRunning) startLoop();

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
  demoState.rankingMode = 'ta';
  
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
  
  updatePauseButton();

  let btnInsta = $('btnInstagram');
  if (btnInsta) btnInsta.style.display = 'none';

  $('rankingModal').style.display = 'none'; document.body.classList.remove('showing-ranking');
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
  if (!game.demoMode && !(game.equipped && game.equipped['autocruise'])) return;
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
  updateAutoCruiseBtnVisibility();
}

let cachedAutoCruiseBtn: HTMLElement | null = null;
let lastAutoCruiseState: string = '';

export function updateAutoCruiseBtnVisibility() {
  if (!cachedAutoCruiseBtn) cachedAutoCruiseBtn = document.getElementById('autoCruiseBtn');
  const autoCruiseBtn = cachedAutoCruiseBtn;
  if (!autoCruiseBtn) return;

  if (!cachedRankingModal) cachedRankingModal = $('rankingModal');
  if (!cachedShopScreen) cachedShopScreen = $('shopScreen');

  const isModalOpen = 
    game.isPaused ||
    (cachedRankingModal && cachedRankingModal.style.display === 'flex') ||
    (cachedShopScreen && cachedShopScreen.style.display === 'flex') ||
    game.state === 'gameover' ||
    game.state === 'clear' ||
    game.state === 'shop';

  const canShow = 
    !isModalOpen &&
    !game.demoMode &&
    !isAttractMode &&
    (game.state === 'playing' || game.state === 'intro' || game.state === 'intro_anim' || game.state === 'powerup_anim' || game.state === 'powerdown_anim') &&
    !!(game.equipped && game.equipped['autocruise']);

  const nextDisplay = canShow ? 'block' : 'none';
  if (autoCruiseBtn.style.display !== nextDisplay) {
    autoCruiseBtn.style.display = nextDisplay;
  }

  if (canShow) {
    const curState = game.aiActive ? 'active' : 'inactive';
    if (lastAutoCruiseState !== curState) {
      autoCruiseBtn.innerHTML = 'AUTO';
      autoCruiseBtn.style.color = game.aiActive ? '#a0f020' : '#fff';
      autoCruiseBtn.style.borderColor = game.aiActive ? '#a0f020' : 'rgba(255, 255, 255, 0.7)';
      lastAutoCruiseState = curState;
    }
  } else {
    lastAutoCruiseState = '';
  }
}

export function resetGameState(isConsecutive) {
  document.body.classList.remove('game-paused');
  $('pauseScreen').style.display = 'none';
  $('rankingModal').style.display = 'none'; document.body.classList.remove('showing-ranking');
  
  // オブジェクトプールへの返却 (メモリ効率向上)
  if (game.platforms) P_PL.releaseAll(game.platforms);
  if (game.particles) P_PT.releaseAll(game.particles);
  if (game.coins) P_CN.releaseAll(game.coins);
  if (game.birds) P_BD.releaseAll(game.birds);
  if (game.meteors) P_MT.releaseAll(game.meteors);
  if (game.items) P_IT.releaseAll(game.items);
  if (game.clouds && game.clouds.length > 0) P_CL.releaseAll(game.clouds);
  if (game.flyingCoins && game.flyingCoins.length > 0) P_FC.releaseAll(game.flyingCoins);

  const flockDir = RND() < 0.5 ? 1 : -1;
  const pb = secureStorage.getItem<any>('EternalJumper_PB', null);

  resetGameStateData(game, isConsecutive, flockDir, pb);

  for (let i = 0; i < 3; i++) {
    game.npcs.push(new NPC(140 + i * 16, 240 - config.playerSize, (i + 1) * 1000, i));
  }

  if (game.player) {
    game.player.reset();
  }
}

export function setupGameCameraAndPlayer(isConsecutive) {
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
  game.totalCoins = secureStorage.getItem<number>('JUMP_TOTAL_COINS', 0);
  game.inventory = secureStorage.getItem<Record<string, boolean>>('JUMP_INVENTORY', {});
  let loadedEq = secureStorage.getItem<any>('JUMP_EQUIPPED', {});
  if (typeof loadedEq === 'string') {
    game.equipped = loadedEq ? { [loadedEq]: true } : {};
  } else if (loadedEq && typeof loadedEq === 'object') {
    game.equipped = loadedEq;
  } else {
    game.equipped = {};
  }
  
  inputHandler.active.clear();
}

export function setupGameEnvironment(isConsecutive) {
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
  
  let sNY = getSafetyLineY();
  game.platforms.push(getPl(sNY, 'normal', false, config.gameWidth / 2 - (config.platformW * 9) / 2, null, null, 9, false));
  
  for (let i = 0; i < config.basePlatforms; i++) {
    let py = sNY - 80 - (i * (config.gameHeight / config.basePlatforms));
    if (isInMushroomForbiddenZone(py, sNY)) {
      continue;
    }
    let sc = (game.baseScoreY - py) * config.scoreMultiplier;
    let tc = (sc < SCORE_THRESHOLDS.EASY && i % 3 === 0) ? MAX(2, 3 - FLR(sc / 8000)) : 1;
    let np = getPl(py, 'normal', false, null, null, null, tc, false);
    game.platforms.push(np);
    trySpawnBirdsOnPlatform(np, sc);
    
    if (sc < SCORE_THRESHOLDS.EASY) {
      let np2 = getPl(py + (RND() * 40 - 20), 'normal', false, null, null, null, MAX(1, tc), false);
      if (np2.isOverlapping) {
        P_PL.push(np2);
      } else {
        game.platforms.push(np2);
        trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
      }
    } else if (sc < SCORE_THRESHOLDS.MEDIUM) {
      let mediumSpan = SCORE_THRESHOLDS.MEDIUM - SCORE_THRESHOLDS.EASY;
      if (RND() < (1 - (sc - SCORE_THRESHOLDS.EASY) / mediumSpan) * 0.7) {
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
  if (pBtn) {
    lastPauseBtnState = '';
    updatePauseButton();
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
  updateAutoCruiseBtnVisibility();
  
  setupGameEnvironment(isConsecutive);
  
  game.lastCoinY = 0;
  resetLoopStats();
  
  if (isAttractMode && !demoState.active) $('tapToStartMsg').style.display = 'block';
  checkUpdateAndReload();
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
  updateAutoCruiseBtnVisibility();
  
  updatePauseButton();
  
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
    setIgnoreNextTap(true);
    setTimeout(() => setIgnoreNextTap(false), 50);
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
        let d = secureStorage.getItem<any>(RankingAPI.pbKey, null);
        if (d && typeof d.alt === 'number') {
            pb.innerHTML = `<div style="text-align:center; margin-top:4px;">
              <div style="color:#ddd; font-size:12px; font-weight:bold; margin-bottom:4px;">${d.alt}m</div>
              <div class="coin-align" style="font-size:9px; color:#dd8;">
                <div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>
                <span>&times; ${d.coins || 0}</span>
              </div>
            </div>`;
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

