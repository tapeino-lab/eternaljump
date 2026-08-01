import { B64 } from './assets.js';
import { config } from './config.js';
import { game, demoState } from './state.js';
import { togglePause } from './lifecycle.js';
import { resetBGScore, drawCloudCaches } from './renderer/bg.js';
import { render } from './renderer/index.js';

import { checkUpdateAndReload } from './pwa.js';
import { MAX, FLR, RND, $ } from './utils.js';

export const GREEN_IMG: Record<string, HTMLCanvasElement> = {};

function generateGreenVariant(img: HTMLImageElement): HTMLCanvasElement {
  const cvs = document.createElement('canvas');
  cvs.width = img.naturalWidth || img.width || 16;
  cvs.height = img.naturalHeight || img.height || 16;
  const c = cvs.getContext('2d');
  if (!c) return cvs;
  c.drawImage(img, 0, 0);
  
  try {
    const imgData = c.getImageData(0, 0, cvs.width, cvs.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 0) {
        // 赤色(#d80000 -> R=216, G=0, B=0) 近傍ピクセルをエメラルドグリーン(#00d880)に置換
        if (r > 180 && g < 50 && b < 50) {
          data[i] = 0;       // Red
          data[i + 1] = 216; // Green
          data[i + 2] = 128; // Blue
        }
      }
    }
    c.putImageData(imgData, 0, 0);
  } catch (e) {}
  return cvs;
}

export const IMG: Record<string, HTMLImageElement> = {};
for (let k in B64) {
  IMG[k] = new Image();
  IMG[k].onload = () => {
    GREEN_IMG[k] = generateGreenVariant(IMG[k]);
  };
  IMG[k].src = B64[k];
  if (IMG[k].complete && IMG[k].naturalWidth > 0) {
    GREEN_IMG[k] = generateGreenVariant(IMG[k]);
  }
}

let isFirstPlay = true;

const cvsElement = $('gameCanvas') as HTMLCanvasElement;
export let cvs = cvsElement;
export let ctx = cvs ? cvs.getContext('2d', { alpha: false }) : null;
if (ctx) {
  ctx.imageSmoothingEnabled = false;
}

export function setupCanvasListeners(c: HTMLCanvasElement) {
  if (!c) return;
  c.addEventListener('contextlost', (e) => {
    e.preventDefault();
    console.warn('[Canvas] Context lost, restoring canvas...');
    setTimeout(restoreGameCanvas, 50);
  });
  c.addEventListener('contextrestored', () => {
    console.log('[Canvas] Context restored');
    restoreGameCanvas();
  });
}

if (cvs) {
  setupCanvasListeners(cvs);
}

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
let gCtx = groundCache.getContext('2d', { alpha: false });
export let groundCached = false;

export function drawGroundCache() {
  if (IMG.gnd && IMG.gnd.complete && IMG.gnd.naturalWidth > 0) {
    groundCache.width = config.gameWidth; // Force reallocation
    groundCache.height = 400;
    if (!gCtx || (gCtx.isContextLost && gCtx.isContextLost())) {
      gCtx = groundCache.getContext('2d', { alpha: false });
    }
    if (gCtx) {
      let p = gCtx.createPattern(IMG.gnd, 'repeat');
      if (p) {
        gCtx.fillStyle = p;
        gCtx.fillRect(0, 0, config.gameWidth, 400);
        groundCached = true;
      }
    }
  }
}

IMG.gnd.onload = drawGroundCache;

export function restoreGameCanvas(): boolean {
  try {
    const oldCvs = ($('gameCanvas') || document.querySelector('canvas')) as HTMLCanvasElement;
    const canvasWrap = $('canvasWrapper');

    // Create a fresh canvas element to replace any corrupted or purged canvas DOM element
    const newCvs = document.createElement('canvas');
    newCvs.id = 'gameCanvas';
    newCvs.width = config.gameWidth;
    newCvs.height = config.gameHeight;
    newCvs.style.width = '100%';
    newCvs.style.height = '100%';
    newCvs.style.imageRendering = 'pixelated';

    if (oldCvs && oldCvs.parentNode) {
      oldCvs.parentNode.replaceChild(newCvs, oldCvs);
    } else if (canvasWrap) {
      canvasWrap.innerHTML = '';
      canvasWrap.appendChild(newCvs);
    }

    cvs = newCvs;
    ctx = newCvs.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }

    setupCanvasListeners(newCvs);

    drawGroundCache();
    drawCloudCaches();
    resetBGScore();

    for (let k in B64) {
      if (IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0) {
        GREEN_IMG[k] = generateGreenVariant(IMG[k]);
      }
    }

    resize();
    updateCtrlCenter();
    render(performance.now());
    return true;
  } catch (e) {
    console.error('Failed to restore canvas:', e);
    return false;
  }
}

function handleAppResume() {
  if (document.visibilityState === 'visible') {
    if (!cvs || !ctx || (ctx.isContextLost && ctx.isContextLost()) || cvs.width === 0) {
      restoreGameCanvas();
    } else {
      cvs.width = config.gameWidth;
      cvs.height = config.gameHeight;
      if (ctx) ctx.imageSmoothingEnabled = false;
      resize();
      updateCtrlCenter();
      drawGroundCache();
      drawCloudCaches();
      resetBGScore();
      render(performance.now());
    }
  } else {
    if (game.state === 'playing' && !game.isPaused && !game.demoMode) {
      togglePause();
    }
  }
}

document.addEventListener('visibilitychange', handleAppResume);
window.addEventListener('pageshow', handleAppResume);
window.addEventListener('focus', handleAppResume);

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
  
  // 最低高さは 96px または 画面高さの 1/7 (約14.3%) の大きい方
  const minCtrlH = Math.max(96, Math.floor(winH / 7));

  // まず画面横幅いっぱいにゲーム画面を配置
  let tW = winW;
  let tH = tW / ratio;

  // 最大高さは「画面全体の高さの1/5」または「200px」の小さい方（最低高さ以上）
  const maxCtrlH = Math.max(minCtrlH, Math.min(200, Math.floor(winH / 5)));

  let remH = winH - tH;
  let ctrlH = 0;

  if (remH >= minCtrlH) {
    // 十分な高さがある場合（一般的な縦長Android端末など）: 左右余白0pxで横幅いっぱい
    ctrlH = Math.min(maxCtrlH, remH);
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
  document.documentElement.style.setProperty("--control-max-height", maxCtrlH + "px");
  // Cap the scale factor at 1.3 to prevent elements from becoming huge in fullscreen mode
  let ctrlScale = Math.min(1.3, Math.max(1, ctrlH / 96));
  document.documentElement.style.setProperty("--ctrl-scale", ctrlScale.toString());
  if (wrap) {
    wrap.style.width = config.gameWidth + 'px';
    wrap.style.height = config.gameHeight + 'px';
    wrap.style.transform = `scale(${(window as any).gameScale})`;
    wrap.style.transformOrigin = 'center center';
  }
  if (cvs) {
    if (cvs.width !== config.gameWidth) cvs.width = config.gameWidth;
    if (cvs.height !== config.gameHeight) cvs.height = config.gameHeight;
    cvs.style.width = '100%';
    cvs.style.height = '100%';
    if (ctx) ctx.imageSmoothingEnabled = false;
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
