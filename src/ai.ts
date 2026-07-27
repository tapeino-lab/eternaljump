import { config, SCORE_THRESHOLDS } from './config.js';
import { game } from './state.js';
import { isAttractMode } from './lifecycle.js';
import type { Player, Platform, Item } from './types.js';

export function runAI(entity: Player) {
  if (!entity || entity.hitTimer > 0) return;

  let px = entity.x + (entity.w || 16) / 2;
  let py = entity.y + (entity.h || 16); 

  if ((entity.isNPC && entity.isIntro) || (entity === game.player && game.state === 'intro' && (game.demoMode || isAttractMode))) {
    if (px < 100) entity.inputDir = 1;
    else if (px > 124) entity.inputDir = -1;
    else entity.inputDir = 0;
    return;
  }
  
  let isJustJumped = entity.lastPlatform !== entity.prevLastPlatform;
  entity.prevLastPlatform = entity.lastPlatform;

  // Track consecutive vertical jumps on the same platform to detect stuck state
  if (entity.lastPlatform && entity.lastPlatform === entity.prevLastPlatform) {
    if (entity.inputDir === 0) {
      entity.samePlatformVertJumps = (entity.samePlatformVertJumps || 0) + 1;
    } else {
      entity.samePlatformVertJumps = 0;
    }
  } else {
    entity.samePlatformVertJumps = 0;
  }

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
    } else if (entity.aiThinkTimer > 30) {
      needsRethink = true;
    }
  }

  let isStuck = (entity.samePlatformVertJumps || 0) >= 2;
  if (needsRethink) {
    let history = entity.visitedHistory || entity.recentPlatforms || [];
    let timesVisited = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] === entity.lastPlatform) timesVisited++;
    }
    if (timesVisited >= 2) isStuck = true;

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

    let dist = Math.abs(dx);
    let targetDir = dx > 0 ? 1 : -1;

    let isMushroomMode = !!(game.equipped?.['mushroom']) && (game.score <= SCORE_THRESHOLDS.MID_HIGH);
    // Keep moving towards target even on platform edges to maximize reach (edge jumping)
    let stopDist = isMushroomMode ? 2 : (entity.lastPlatform ? 2 : 6);
    if (dist > stopDist) {
      entity.inputDir = targetDir;
    } else {
      entity.inputDir = 0;
    }
  } else {
    // If stuck with no target, force lateral escape movement
    if (isStuck) {
      entity.inputDir = (px < config.gameWidth / 2) ? 1 : -1;
    } else if (!entity.inputDir) {
      entity.inputDir = entity.facingRight ? 1 : -1;
    }
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
  let curPlatW = entity.lastPlatform ? (entity.lastPlatform.w || 32) : 16;
  
  let isMushroomMode = !!(game.equipped?.['mushroom']) && (game.score <= 80000);

  let processCand = (cand: any) => { 
    if (cand.broken || cand.blacklisted || cand.isGround) return;
    if (cand.collected) return;
    if (cand === entity.lastPlatform) return; 

    let candPx = cand.x + (cand.w || 16) / 2;
    let candPy = cand.y;
    let candW = cand.w || 16;

    let dx = px - candPx;
    if (dx < 0) dx = -dx;
    if (dx > hgw) dx = gw - dx;

    // Effective horizontal distance taking edge jumping and platform widths into account
    let eff_dx = Math.max(0, dx - (candW / 2) - (curPlatW / 2));

    let dy = py - candPy; // positive when platform is ABOVE player
    if (initialVy > 2 && dy > -10) return;

    let score = 0;
    
    if (isMushroomMode) {
      if (cand.type === 'green') {
        score += 2000000;
        if (dy > 0) score += dy * 100;
        score -= dx * 5;
      } else if (cand.type === 'red') {
        score -= 200000;
      } else {
        if (dy > 0) {
          score += dy * 40;
        } else {
          score -= Math.abs(dy) * 30;
        }
        score -= dx * 5;
        let distCenter = Math.abs(candPx - hgw);
        score -= distCenter * 15;

        let historyIdx = history.lastIndexOf(cand);
        if (historyIdx !== -1) {
          let recency = history.length - historyIdx;
          score -= (20000 / recency);
        }
      }
    } else if (isStuck) {
      if (dy > 0) score += dy * 20; 
      score += eff_dx * 5; 
    } else {
      if (dy > 0) {
        score += dy * 30; // Prioritize climbing upward
      } else {
        let absDy = dy < 0 ? -dy : dy;
        score -= absDy * 15; // Penalty for platform below
      }
      score -= eff_dx * 3; 

      let bonus = 0;
      if (cand.type === 'super' || cand.isGlowing) bonus += 2500;
      if (cand.type === 'green') bonus += 500000;
      else if (cand.collected !== undefined) bonus += 5000; 
      
      if (dy < -10) {
        bonus = Math.floor(bonus / 4);
      }
      score += bonus;

      let historyIdx = history.lastIndexOf(cand);
      if (historyIdx !== -1) {
        let recency = history.length - historyIdx;
        score -= (25000 / recency);
      }
    }

    let dy_world = candPy - py; // negative when candPy is above py
    let discriminant = initialVy * initialVy + 2 * g * dy_world;
    if (discriminant >= 0) {
      let t_fall = (-initialVy + Math.sqrt(discriminant)) / g;
      if (t_fall >= 0) {
        // Generous reach allowance considering air control, inertia, and edge launching
        let max_dx = t_fall * (vx * 1.35) + 36;
        
        if (eff_dx <= max_dx) {
          if (score > bestScore) {
            bestScore = score;
            bestTarget = cand;
          }
        }
      }
    }

    // Improved fallback evaluation: prioritize climbing to nearest upper/lateral platforms
    let fbScore = 0;
    if (dy > 0) {
      fbScore += dy * 100; // Prefer platforms above
    } else {
      fbScore -= Math.abs(dy) * 50; // Penalize lower platforms
    }
    fbScore -= eff_dx * 8; // Prefer horizontally closer platforms
    if (cand.type === 'super' || cand.isGlowing) fbScore += 3000;
    if (cand.type === 'green') fbScore += 500000;

    let historyIdx = history.lastIndexOf(cand);
    if (historyIdx !== -1) {
      let recency = history.length - historyIdx;
      fbScore -= (30000 / recency);
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
