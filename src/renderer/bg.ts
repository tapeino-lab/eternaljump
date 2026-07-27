import { game, demoState } from '../state.js';
import { ctx, IMG } from '../display.js';
import { isAttractMode, runAttractUICycle, setIgnoreNextTap } from '../lifecycle.js';
import { fireworksSystem } from '../fireworks.js';
import { airplaneSystem } from '../airplane.js';
import { config } from '../config.js';
import { RankingAPI } from '../ranking.js';
import { RND, FLR, MIN, MAX, SIN, ABS, PI, $, hasPlayedOnce } from '../utils.js';

import { dR } from './core.js';
export function getColorAtScore(s) {
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

export function resetBGScore() {
  lastBGScore = -1;
}

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

export function drawBG(ts) {
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
    for (let _idx_stars = 0; _idx_stars < game.stars.length; _idx_stars++) {
    let st = game.stars[_idx_stars];
      let sy = (st.y - game.cameraY * st.speed) % config.gameHeight;
      if (sy < 0) sy += config.gameHeight;
      ctx.globalAlpha = sA * (bA ? (0.5 + 0.5 * SIN(ts * st.blink)) : 1);
      ctx.fillRect(FLR(st.x), FLR(sy), st.size, st.size);
    }
    ctx.globalAlpha = 1.0;
  }
  
  let cA = currentVisScore < 40000 ? 1 : (currentVisScore < 50000 ? 1 - (currentVisScore - 40000) / 10000 : 0);
  if (cA > 0) {
    for (let _idx_clouds = 0; _idx_clouds < game.clouds.length; _idx_clouds++) {
    let c = game.clouds[_idx_clouds];
      let sy = (c.y - game.cameraY) * c.speed, s = 10 * c.scale;
      if (sy > config.gameHeight || sy + s * 3 < 0) continue;
      ctx.globalAlpha = cA * (c.speed === 0.6 ? 0.15 : 0.25);
      let cc = cloudCaches[c.type];
      ctx.drawImage(cc, FLR(c.x - s), FLR(sy - s), FLR(cc.width * c.scale), FLR(cc.height * c.scale));
      ctx.globalAlpha = 1.0;
    }
  }
  return getColorAtScore(scoreTop);
}
