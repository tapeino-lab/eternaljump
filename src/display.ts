import { B64 } from './assets.js';
import { config } from './config.js';
import { game, demoState } from './state.js';
import { togglePause } from './lifecycle.js';
import { resetBGScore } from './renderer/bg.js';

import { checkUpdateAndReload } from './pwa.js';
import { MAX, FLR, RND, $ } from './utils.js';

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

function updateCtrlCenter() {
  let ca = $('controlArea');
  if (ca) {
    let r = ca.getBoundingClientRect();
    ctrlCenterX = r.left + r.width / 2;
  }
}

function resize() {
  let winW = window.innerWidth, winH = window.innerHeight;
  let ratio = config.gameWidth / config.gameHeight;
  
  let tW = winW;
  let tH = tW / ratio;
  
  const MAX_CTRL_H = 160;
  const MIN_CTRL_H = 50;

  let remH = winH - tH;
  let ctrlH = 0;

  if (remH >= MIN_CTRL_H) {
    ctrlH = Math.min(MAX_CTRL_H, Math.max(MIN_CTRL_H, remH));
  } else {
    ctrlH = MIN_CTRL_H;
    let scale = winH / (tH + ctrlH);
    tW = tW * scale;
    tH = tW / ratio;
    ctrlH = Math.min(MAX_CTRL_H, Math.max(MIN_CTRL_H, winH - tH));
  }

  let gc = $('gameContainer'), ca = $('controlArea'), sca = $('shopControlArea'), ac = $('appContainer');
  if (ac) {
    ac.style.width = tW + 'px';
    ac.style.height = (tH + ctrlH) + 'px';
  }
  if (gc) {
    gc.style.width = tW + 'px';
    gc.style.height = tH + 'px';
  }
  if (ca) {
    ca.style.width = tW + 'px';
    ca.style.height = ctrlH + 'px';
  }
  if (sca) {
    sca.style.width = tW + 'px';
    sca.style.height = ctrlH + 'px';
  }
  (window as any).gameScale = tW / config.gameWidth;
  document.documentElement.style.setProperty("--game-scale", (window as any).gameScale);
  document.documentElement.style.setProperty("--game-height", tH + "px");
  document.documentElement.style.setProperty("--control-height", ctrlH + "px");
  if (wrap) {
    wrap.style.width = config.gameWidth + 'px';
    wrap.style.height = config.gameHeight + 'px';
    wrap.style.transform = `scale(${(window as any).gameScale})`;
    wrap.style.transformOrigin = 'center center';
  }
  if (cvs) {
    cvs.width = config.gameWidth;
    cvs.height = config.gameHeight;
    cvs.style.width = '100%';
    cvs.style.height = '100%';
  }
  let tapMsg = $('tapToStartMsg');
  if (tapMsg) {
    tapMsg.style.fontSize = MAX(10, FLR(10 * (window as any).gameScale)) + 'px';
  }
  updateCtrlCenter();
  requestAnimationFrame(updateCtrlCenter);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  setTimeout(resize, 100);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize);
}
if (typeof ResizeObserver !== 'undefined') {
  const observer = new ResizeObserver(() => {
    resize();
  });
  let ac = $('appContainer');
  if (ac) observer.observe(ac);
}
resize();
