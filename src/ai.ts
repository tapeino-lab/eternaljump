import { config } from './config.js';
import { game } from './state.js';
import type { Player, Platform, Item } from './types.js';

export function runAI(entity: Player) {
  if (!entity || entity.hitTimer > 0) return;

  let px = entity.x + (entity.w || 16) / 2;
  let py = entity.y + (entity.h || 16); 

  if ((entity.isNPC && entity.isIntro) || (entity === game.player && game.state === 'intro')) {
    if (px < 100) entity.inputDir = 1;
    else if (px > 124) entity.inputDir = -1;
    else entity.inputDir = 0;
    return;
  }
  
  if (entity.isPoweredUp || entity.vy < -10) {
    let avoidMeteor = false;
    for (let i = 0; i < (game.meteors ? game.meteors.length : 0); i++) {
      let m = game.meteors[i];
      if (!m.hit && m.y < py + 40 && m.y > py - 100) {
        let mX = m.x + m.w / 2;
        let dx = mX - px;
        if (dx > config.gameWidth / 2) dx -= config.gameWidth;
        else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
        let absDx = dx < 0 ? -dx : dx;
        if (absDx < 24) {
          entity.inputDir = dx > 0 ? -1 : 1;
          avoidMeteor = true;
          break;
        }
      }
    }
    if (avoidMeteor) return;
  }

  let isJustJumped = entity.lastPlatform !== entity.prevLastPlatform;
  entity.prevLastPlatform = entity.lastPlatform;

  let needsRethink = false;
  if (!entity.aiTarget) {
    needsRethink = true;
  } else if (isJustJumped) {
    needsRethink = true; 
  } else {
    let t = entity.aiTarget;
    if (t.broken || t.blacklisted || (t.collected !== undefined && t.collected)) {
      needsRethink = true;
    } else if (t.y < py - 10) {
      needsRethink = true;
    } else if (entity.aiThinkTimer > 45) {
      needsRethink = true;
    }
  }

  let isStuck = false;
  if (needsRethink) {
    let history = entity.visitedHistory || entity.recentPlatforms || [];
    let timesVisited = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] === entity.lastPlatform) timesVisited++;
    }
    isStuck = timesVisited >= 2;

    entity.aiThinkTimer = 0;
    let initialVy = isJustJumped ? getPlatformJumpVy(entity.lastPlatform, entity) : entity.vy;
    entity.aiTarget = findBestTarget(entity, px, py, initialVy, isStuck);
  } else {
    entity.aiThinkTimer = (entity.aiThinkTimer || 0) + 1;
  }

  if (entity.aiTarget) {
    let tx = entity.aiTarget.x + (entity.aiTarget.w || 16) / 2;
    if (entity.aiTarget.type === 'h-slide' && entity.aiTarget.direction) {
      tx += entity.aiTarget.direction * 16;
    }
    
    let dx = tx - px;
    if (dx > config.gameWidth / 2) dx -= config.gameWidth;
    else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

    let dist = dx < 0 ? -dx : dx;
    let targetDir = dx > 0 ? 1 : -1;

    if (dist > 12) {
      entity.inputDir = targetDir;
    } else {
      entity.inputDir = 0;
    }
  } else {
    if (!entity.inputDir) entity.inputDir = entity.facingRight ? 1 : -1;
  }
}

function getPlatformJumpVy(platform: Platform, entity: Player): number {
  let p = config.jumpPower;
  if (p < 0) p = -p;
  if (platform && platform.isGlowing) {
    p = (config.superJumpPower < 0 ? -config.superJumpPower : config.superJumpPower) * (config.glowingMovingJumpMultiplier || 1.5);
  } else if (platform && platform.type === 'super') {
    p = config.superJumpPower < 0 ? -config.superJumpPower : config.superJumpPower;
  } else if (platform && (platform.type === 'h-slide' || platform.type === 'v-slide')) {
    p = p * (config.movingPlatformJumpMultiplier || 1.5);
  }
  if (entity && entity.isPoweredUp) {
    p *= (config.powerJumpMultiplier || 1.1);
  }
  return -p;
}

function findBestTarget(entity: Player, px: number, py: number, initialVy: number, isStuck: boolean): Platform | Item | null {
  let bestTarget = null;
  let bestScore = -Infinity;
  let history = entity.visitedHistory || entity.recentPlatforms || [];
  
  let candidates = game.platforms;
  let items = game.items || [];
  
  let bestFallbackTarget = null;
  let bestFallbackScore = -Infinity;

  let g = config.jumpGravity || 0.15;
  let vx = config.maxSpeedX || 1.6;
  let gw = config.gameWidth;
  let hgw = gw / 2;
  
  let processCand = (cand: any) => { 
    if (cand.broken || cand.blacklisted || cand.isGround) return;
    if (cand.collected) return;
    if (cand === entity.lastPlatform) return; 

    let candPx = cand.x + (cand.w || 16) / 2;
    let candPy = cand.y;

    let dx = px - candPx;
    if (dx < 0) dx = -dx;
    if (dx > hgw) dx = gw - dx;

    let dy = py - candPy; 
    if (initialVy > 2 && dy > -10) return;

    let score = 0;
    
    if (isStuck) {
      score += dx * 10; 
      if (dy > 0) score += dy * 5; 
    } else {
      if (dy > 0) {
        score += dy * 20; 
      } else {
        let absDy = dy < 0 ? -dy : dy;
        score -= absDy * 10; // 下にある台のペナルティ強化
      }
      score -= dx * 2; 

      let bonus = 0;
      if (cand.type === 'super' || cand.isGlowing) bonus += 2000;
      if (cand.collected !== undefined) bonus += 5000; 
      
      // 下にある台に対してはボーナスを大幅に減らす（刻んで上に行くことを優先）
      if (dy < -10) {
        bonus = Math.floor(bonus / 4);
      }
      score += bonus;

      let historyIdx = history.lastIndexOf(cand);
      if (historyIdx !== -1) {
        let recency = history.length - historyIdx;
        score -= (20000 / recency);
      }
    }

    let dy_world = candPy - py;
    let discriminant = initialVy * initialVy + 2 * g * dy_world;
    if (discriminant >= 0) {
      let t_fall = (-initialVy + Math.sqrt(discriminant)) / g;
      if (t_fall >= 0) {
        let margin = isStuck ? -32 : -16;
        let max_dx = t_fall * vx - margin;
        if (max_dx < 0) max_dx = 0;
        
        if (dx <= max_dx) {
          if (score > bestScore) {
            bestScore = score;
            bestTarget = cand;
          }
        }
      }
    }

    let fbScore = score;
    if (initialVy > 0) { 
       if (dy > 0) {
           fbScore -= 50000; 
       } else {
           if (isStuck) {
             fbScore += dx * 5; 
           } else {
             fbScore = -dx * 10; 
             if (dy > -40) fbScore -= 2000;
             if (dx < 40) fbScore += 1000;
           }
       }
    }

    if (fbScore > bestFallbackScore) {
      bestFallbackScore = fbScore;
      bestFallbackTarget = cand;
    }
  };

  for (let i = 0; i < candidates.length; i++) {
    processCand(candidates[i]);
  }
  for (let i = 0; i < items.length; i++) {
    processCand(items[i]);
  }

  return bestTarget || bestFallbackTarget;
}
