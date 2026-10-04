import { game } from '../state.js';
import { ctx, IMG, restoreGameCanvas } from '../display.js';
import { fireworksSystem } from '../fireworks.js';
import { config } from '../config.js';
import { RND, FLR } from '../utils.js';

import { resetFillColor } from './core.js';
import { drawBG } from './bg.js';
import { drawGameEntities } from './entities.js';
import { drawOffscreenIndicators, updateHUD, updateDemoRanking } from './ui.js';

export function drawBackgroundLayer(ts: number) {
  return drawBG(ts);
}

export function drawWorldLayer(ts: number) {
  fireworksSystem.draw(ctx);
  if (IMG.title && IMG.title.complete && IMG.title.naturalWidth > 0) {
    ctx.drawImage(IMG.title, FLR((config.gameWidth - IMG.title.naturalWidth) / 2), 95);
  }
}

export function drawEntitiesLayer(ts: number) {
  drawGameEntities(ts);
}

export function drawUILayer(topColor: any, ts: number) {
  if (game.flyingCoins) {
    for (let _idx_fcoins = 0; _idx_fcoins < game.flyingCoins.length; _idx_fcoins++) {
    let fc = game.flyingCoins[_idx_fcoins]; fc.draw(); }
  }
  
  drawOffscreenIndicators();
  updateHUD(topColor);
  updateDemoRanking(ts);
}

export function render(ts: number) {
  if (!ctx || (ctx.isContextLost && ctx.isContextLost())) {
    if (!restoreGameCanvas()) return;
  }

  resetFillColor();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1.0;

  let topColor = drawBackgroundLayer(ts);

  let sX = 0, sY = 0;
  if (game.shakeAmount > 0) {
    sX = (RND() - 0.5) * 2 * game.shakeAmount;
    sY = (RND() - 0.5) * 2 * game.shakeAmount;
    game.shakeAmount *= 0.85;
    if (game.shakeAmount < 0.5) game.shakeAmount = 0;
  }
  
  let camX = FLR(sX);
  let camY = FLR(-game.cameraY + sY);

  ctx.translate(camX, camY);
  drawWorldLayer(ts);
  drawEntitiesLayer(ts);
  ctx.translate(-camX, -camY);

  drawUILayer(topColor, ts);
}

