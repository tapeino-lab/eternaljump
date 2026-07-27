import { game, demoState } from '../state.js';
import { ctx, IMG } from '../display.js';
import { isAttractMode, runAttractUICycle, setIgnoreNextTap } from '../lifecycle.js';
import { fireworksSystem } from '../fireworks.js';
import { airplaneSystem } from '../airplane.js';
import { config } from '../config.js';
import { RankingAPI } from '../ranking.js';
import { RND, FLR, MIN, MAX, SIN, ABS, PI, $, hasPlayedOnce } from '../utils.js';

import { dR } from './core.js';
export function drawHorizontalPipe(ctx: CanvasRenderingContext2D) {
  if (game.cameraY > 300) return;
  if (!hasPlayedOnce()) return;

  ctx.save();

  // NES Super Mario Style Horizontal Green Pipe (Mouth facing Right at x = 17)
  // Y range: 210 to 241 (Lip height 32px, 1px overlap with ground at Y=240 for seamless fit)

  // 1. Black Outer Outline
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 211, 8, 30);   // Body outer border (0..8)
  ctx.fillRect(8, 209, 10, 33);  // Lip outer border (8..18)

  // 2. Pipe Body (x = 0..8)
  ctx.fillStyle = '#b8f818';
  ctx.fillRect(0, 212, 8, 2);    // Top highlight line

  ctx.fillStyle = '#00d800';
  ctx.fillRect(0, 214, 8, 3);    // Bright green band

  ctx.fillStyle = '#00a800';
  ctx.fillRect(0, 217, 8, 15);   // Base green

  ctx.fillStyle = '#005000';
  ctx.fillRect(0, 232, 8, 5);    // Dark green shadow

  ctx.fillStyle = '#002800';
  ctx.fillRect(0, 237, 8, 3);    // Bottom extra dark shadow

  // 3. Pipe Lip / Rim (x = 8..15)
  ctx.fillStyle = '#b8f818';
  ctx.fillRect(8, 210, 8, 3);    // Lip top highlight

  ctx.fillStyle = '#00d800';
  ctx.fillRect(8, 213, 8, 3);    // Lip bright green

  ctx.fillStyle = '#00a800';
  ctx.fillRect(8, 216, 8, 17);   // Lip base green

  ctx.fillStyle = '#005000';
  ctx.fillRect(8, 233, 8, 6);    // Lip shadow

  ctx.fillStyle = '#002800';
  ctx.fillRect(8, 239, 8, 2);    // Lip bottom shadow

  // Lip left bevel line for pixel depth
  ctx.fillStyle = '#002800';
  ctx.fillRect(8, 210, 1, 31);

  // 4. Mouth Hole Opening on Right (x = 16..17)
  ctx.fillStyle = '#000000';
  ctx.fillRect(16, 210, 2, 31);
  ctx.fillStyle = '#002800';
  ctx.fillRect(16, 212, 1, 27);

  ctx.restore();
}

export function drawGameEntities(ts) {
  airplaneSystem.draw(ctx, game, isAttractMode);
  for (let _idx_birds = 0; _idx_birds < game.birds.length; _idx_birds++) {
    let b = game.birds[_idx_birds];
    if (b.y > game.cameraY + config.gameHeight + 50 || b.y < game.cameraY - 50) continue;
    if (!b.isPerched && (b.type === 1 || b.type === 2)) b.draw(ts);
  }
  for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
    let p = game.platforms[_idx_plats];
    if (p.y > game.cameraY + config.gameHeight + 100 || p.y + (p.h || 32) < game.cameraY - 100) continue;
    p.draw();
  }
  for (let _idx_items = 0; _idx_items < game.items.length; _idx_items++) {
    let i = game.items[_idx_items];
    if (i.y > game.cameraY + config.gameHeight + 50 || i.y + i.h < game.cameraY - 50) continue;
    i.draw();
  }
  for (let _idx_coins = 0; _idx_coins < game.coins.length; _idx_coins++) {
    let c = game.coins[_idx_coins];
    if (c.y > game.cameraY + config.gameHeight + 50 || c.y + c.h < game.cameraY - 50) continue;
    c.draw();
  }
  for (let _idx_meteors = 0; _idx_meteors < game.meteors.length; _idx_meteors++) {
    let m = game.meteors[_idx_meteors];
    if (m.y > game.cameraY + config.gameHeight + 100 || m.y < game.cameraY - 100) continue;
    m.draw();
  }
let lastAlpha = -1, lastColor = '';
  for (let _idx_particles = 0; _idx_particles < game.particles.length; _idx_particles++) {
    let pt = game.particles[_idx_particles];
    if (pt.y > game.cameraY + config.gameHeight + 50 || pt.y < game.cameraY - 50) continue;
    if (pt.isSp) {
      let b = pt.life % 6 < 3, s = b ? 4 : 2, c = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'][FLR(RND() * 7)];
      if (lastAlpha !== 0.9) { ctx.globalAlpha = 0.9; lastAlpha = 0.9; }
      dR(pt.x - 1, pt.y - s, 2, s * 2, c);
      dR(pt.x - s, pt.y - 1, s * 2, 2, c);
      if (b) dR(pt.x, pt.y, 2, 2, '#fff');
    } else {
      let alpha = MAX(0, MIN(1.0, (pt.life / pt.maxLife) * 2.0));
      alpha = Math.round(alpha * 10) / 10;
      if (lastAlpha !== alpha) { ctx.globalAlpha = alpha; lastAlpha = alpha; }
      if (lastColor !== pt.color) { ctx.fillStyle = pt.color; lastColor = pt.color; }
      ctx.fillRect(FLR(pt.x), FLR(pt.y), FLR(pt.size), FLR(pt.size));
    }
  }
  if (lastAlpha !== -1) ctx.globalAlpha = 1.0;
  for (let _idx_birds = 0; _idx_birds < game.birds.length; _idx_birds++) {
    let b = game.birds[_idx_birds];
    if (b.y > game.cameraY + config.gameHeight + 50 || b.y < game.cameraY - 50) continue;
    if (b.type === 0 || (b.isPerched && b.type === 1)) b.draw(ts);
  }
  for (let _idx_npcs = 0; _idx_npcs < game.npcs.length; _idx_npcs++) {
    let n = game.npcs[_idx_npcs];
    if (n.y > game.cameraY + config.gameHeight + 100 || n.y + (n.h || 32) < game.cameraY - 100) continue;
    n.draw();
  }
  game.player.draw();
  drawHorizontalPipe(ctx);
}
