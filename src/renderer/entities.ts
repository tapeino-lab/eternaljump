import { game, demoState } from '../state.js';
import { ctx, IMG } from '../display.js';
import { isAttractMode, runAttractUICycle, setIgnoreNextTap } from '../lifecycle.js';
import { fireworksSystem } from '../fireworks.js';
import { airplaneSystem } from '../airplane.js';
import { config } from '../config.js';
import { RankingAPI } from '../ranking.js';
import { RND, FLR, MIN, MAX, SIN, ABS, PI, $, hasPlayedOnce } from '../utils.js';

import { dR } from './core.js';

const SPARKLE_COLORS = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'];
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
  const camY = game.cameraY;
  const camH = config.gameHeight;
  const top50 = camY - 50;
  const bot50 = camY + camH + 50;
  const top100 = camY - 100;
  const bot100 = camY + camH + 100;

  airplaneSystem.draw(ctx, game, isAttractMode);
  for (let _idx_birds = 0; _idx_birds < game.birds.length; _idx_birds++) {
    let b = game.birds[_idx_birds];
    if (b.y > bot50 || b.y < top50) continue;
    if (!b.isPerched && (b.type === 1 || b.type === 2)) b.draw(ts);
  }
  for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
    let p = game.platforms[_idx_plats];
    if (p.y > bot100 || p.y + (p.h || 32) < top100) continue;
    p.draw();
  }
  for (let _idx_items = 0; _idx_items < game.items.length; _idx_items++) {
    let i = game.items[_idx_items];
    if (i.y > bot50 || i.y + i.h < top50) continue;
    i.draw();
  }
  for (let _idx_coins = 0; _idx_coins < game.coins.length; _idx_coins++) {
    let c = game.coins[_idx_coins];
    if (c.y > bot50 || c.y + c.h < top50) continue;
    c.draw();
  }
  for (let _idx_meteors = 0; _idx_meteors < game.meteors.length; _idx_meteors++) {
    let m = game.meteors[_idx_meteors];
    if (m.y > bot100 || m.y < top100) continue;
    m.draw();
  }
  let lastAlpha = -1, lastColor = '';
  for (let _idx_particles = 0; _idx_particles < game.particles.length; _idx_particles++) {
    let pt = game.particles[_idx_particles];
    if (pt.y > bot50 || pt.y < top50) continue;
    if (pt.isSp) {
      let b = pt.life % 6 < 3, s = b ? 4 : 2, c = SPARKLE_COLORS[(RND() * 7) | 0];
      if (lastAlpha !== 0.9) { ctx.globalAlpha = 0.9; lastAlpha = 0.9; }
      dR(pt.x - 1, pt.y - s, 2, s * 2, c);
      dR(pt.x - s, pt.y - 1, s * 2, 2, c);
      if (b) dR(pt.x, pt.y, 2, 2, '#fff');
    } else {
      let alpha = MAX(0, MIN(1.0, (pt.life / pt.maxLife) * 2.0));
      alpha = Math.round(alpha * 10) / 10;
      if (lastAlpha !== alpha) { ctx.globalAlpha = alpha; lastAlpha = alpha; }
      if (lastColor !== pt.color) { ctx.fillStyle = pt.color; lastColor = pt.color; }
      ctx.fillRect(pt.x | 0, pt.y | 0, pt.size | 0, pt.size | 0);
    }
  }
  if (lastAlpha !== -1) ctx.globalAlpha = 1.0;
  for (let _idx_birds = 0; _idx_birds < game.birds.length; _idx_birds++) {
    let b = game.birds[_idx_birds];
    if (b.y > bot50 || b.y < top50) continue;
    if (b.type === 0 || (b.isPerched && b.type === 1)) b.draw(ts);
  }
  for (let _idx_npcs = 0; _idx_npcs < game.npcs.length; _idx_npcs++) {
    let n = game.npcs[_idx_npcs];
    if (n.y > bot100 || n.y + (n.h || 32) < top100) continue;
    n.draw();
  }
  game.player.draw();
  drawHorizontalPipe(ctx);
  
  // Call the AI Thought Visualization System (Development only)
  if (import.meta.env.DEV) {
    // drawAIThoughts(ctx);
  }
}

function drawAIThoughts(ctx: CanvasRenderingContext2D) {
  if (!import.meta.env.DEV) return;
  if (!game.showAIThoughts) return;

  const entitiesToVisual: any[] = [];
  
  // 1. Main player if AI or Demo/Attract Mode is running
  if (game.player && (game.aiActive || game.demoMode || isAttractMode)) {
    entitiesToVisual.push({
      entity: game.player,
      name: 'PLAYER AI',
      color: '#00ffff' // Neon cyan
    });
  }

  // 2. NPCs
  for (let idx = 0; idx < game.npcs.length; idx++) {
    const npc = game.npcs[idx];
    if (npc && npc.active) {
      entitiesToVisual.push({
        entity: npc,
        name: `NPC ${npc.npcIndex || idx + 1}`,
        color: '#a0f020' // Neon green/yellow
      });
    }
  }

  if (entitiesToVisual.length === 0) return;

  const g = config.jumpGravity || 0.15;
  const maxVx = config.maxSpeedX || 1.6;
  const frictionX = config.frictionX || 0.85;

  for (let idx = 0; idx < entitiesToVisual.length; idx++) {
    const { entity, name, color } = entitiesToVisual[idx];
    
    const px = entity.x + (entity.w || 16) / 2;
    const py = entity.y + (entity.h || 16);

    // Draw Target Line & Target Bounding Box
    if (entity.aiTarget) {
      const target = entity.aiTarget;
      const tx = target.x + (target.w || 16) / 2;
      const ty = target.y + (target.h || 8) / 2;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(FLR(px), FLR(py - (entity.h || 16) / 2));
      ctx.lineTo(FLR(tx), FLR(ty));
      ctx.stroke();

      // Bounding box
      ctx.setLineDash([1, 1]);
      ctx.strokeRect(FLR(target.x) - 1, FLR(target.y) - 1, (target.w || 16) + 2, (target.h || 8) + 2);
      ctx.restore();
    }

    // Draw Predicted Trajectory Arc (Jump Arc)
    let tempX = px;
    let tempY = py;
    let tempVx = entity.vx || 0;
    let tempVy = entity.vy || 0;

    ctx.save();
    ctx.fillStyle = color;
    for (let frame = 0; frame < 30; frame++) {
      tempX += tempVx;
      tempY += tempVy;
      tempVy += g;

      if (entity.aiTarget) {
        let tx = entity.aiTarget.x + (entity.aiTarget.w || 16) / 2;
        let tdx = tx - tempX;
        // screen wrap-around
        if (tdx > config.gameWidth / 2) tdx -= config.gameWidth;
        else if (tdx < -config.gameWidth / 2) tdx += config.gameWidth;

        let tdir = tdx > 0 ? 1 : -1;
        if (Math.abs(tdx) > 2) {
          tempVx += tdir * (config.accelX || 0.22);
        } else {
          tempVx *= frictionX;
        }
      }
      
      if (tempVx > maxVx) tempVx = maxVx;
      else if (tempVx < -maxVx) tempVx = -maxVx;

      let drawX = tempX;
      if (drawX < 0) drawX += config.gameWidth;
      else if (drawX > config.gameWidth) drawX -= config.gameWidth;

      ctx.globalAlpha = Math.max(0.1, 1.0 - (frame / 30));
      ctx.fillRect(FLR(drawX) - 1, FLR(tempY) - 1, 2, 2);
    }
    ctx.restore();

    // Draw Input arrows
    if (entity.inputDir !== 0) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '5px "Press Start 2P", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(entity.inputDir > 0 ? '→' : '←', FLR(px + (entity.inputDir > 0 ? 10 : -10)), FLR(entity.y + 8));
      ctx.restore();
    }

    // Draw State Labels above head
    let labelY = entity.y - 6;
    if (entity.balloonTimer > 0) labelY -= 16;

    let stateStr = 'CLIMBING';
    let labelColor = '#ffffff';

    if (entity.inGreenMushroomChain) {
      stateStr = 'CHAIN🚀';
      labelColor = '#00ff00';
    } else if (entity.aiLockedFromNormalJump) {
      stateStr = 'LOCKED🔒';
      labelColor = '#ffcc00';
    } else if ((entity.samePlatformVertJumps || 0) >= 2) {
      stateStr = 'STUCK⚠️';
      labelColor = '#ff3333';
    } else if (entity.vy > 0) {
      stateStr = 'FALLING';
      labelColor = '#00ffff';
    } else if (entity.vy < 0) {
      stateStr = 'JUMPING';
      labelColor = '#ff66ff';
    }

    ctx.save();
    ctx.font = '4px "Press Start 2P", monospace, sans-serif';
    ctx.textAlign = 'center';
    
    // Background block
    let textW = stateStr.length * 4 + 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(FLR(px - textW / 2), FLR(labelY - 5), textW, 6);
    
    ctx.fillStyle = labelColor;
    ctx.fillText(stateStr, FLR(px), FLR(labelY));
    
    // Entity Name sub-tag
    ctx.fillStyle = '#aaa';
    ctx.fillText(name, FLR(px), FLR(labelY - 6));
    ctx.restore();
  }
}
