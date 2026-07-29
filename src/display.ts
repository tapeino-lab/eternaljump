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
  
  // 最低高さは 96px または 画面高さの 1/8 (12.5%) の大きい方
  const minCtrlH = Math.max(96, Math.floor(winH / 8));
  const MAX_CTRL_H = 320;

  // まず画面横幅いっぱいにゲーム画面を配置
  let tW = winW;
  let tH = tW / ratio;

  let remH = winH - tH;
  let ctrlH = 0;

  if (remH >= minCtrlH) {
    // 十分な高さがある場合（一般的な縦長Android端末など）: 左右余白0pxで横幅いっぱい
    ctrlH = Math.min(MAX_CTRL_H, remH);
  } else {
    // 縦長比率が不十分な場合（iPhone 14/15等）:
    // 操作エリアに最低高さを保証するためゲーム画面を縮小し、その分左右に余白を作る
    ctrlH = minCtrlH;
    let availGameH = winH - ctrlH;
    if (availGameH > 0) {
      tH = availGameH;
      tW = tH * ratio;
    }
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
  document.documentElement.style.setProperty("--control-min-height", minCtrlH + "px");
  document.documentElement.style.setProperty("--control-max-height", MAX_CTRL_H + "px");
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
