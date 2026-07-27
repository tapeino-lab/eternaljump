import { config, SCORE_THRESHOLDS } from './config.js';
import { game } from './state.js';
import { isAttractMode } from './lifecycle.js';
import type { Player, Platform, Item } from './types.js';

function isLockOnPlatform(platform: any): boolean {
  if (!platform) return false;
  if (platform.isGlowing) return false;
  if (platform.type === 'super') return false;
  if (platform.type === 'h-slide' || platform.type === 'v-slide') return false;
  return (platform.type === 'normal' || platform.isIcy);
}

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
  let currentPlat = entity.lastPlatform;
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

  let isPlayer = (entity === game.player);

  // Ground level is y = 224 (feet at y = 240). Super jump spring platform is at y = 416 (hole center x = 112).
  // Check if entity is near ground level or inside the ground hole (entity.y >= 210)
  let isGroundPhase = (entity.y >= 210) && game.platforms.some(p => p.isGround && !p.broken);

  if (isGroundPhase) {
    entity.inGreenMushroomChain = false;
    entity.aiTarget = null;
    entity.aiLockedFromNormalJump = false;
    entity.aiLockedTarget = null;

    let holeCenter = 112; // Center of ground hole (96..128)
    let dx = holeCenter - px; // px is entity.x + 8 (center X)
    let vx = entity.vx || 0;

    if (entity.y >= 230) {
      // Inside hole or ascending from super jump until clearing y < 210
      // Hold strictly neutral (0) to eliminate right drift/tremble
      entity.inputDir = 0;
    } else {
      // On ground level approaching hole (y < 230): walk at normal speed towards hole center
      if (Math.abs(dx) <= 6) {
        // Aligned above the hole (96..128) - drop straight down
        entity.inputDir = 0;
      } else {
        entity.inputDir = dx > 0 ? 1 : -1;
      }
    }

    return;
  }

  // Green Mushroom Chain Mode: From touching 1st green mushroom to passing 18th green mushroom, fly straight up without turning left/right
  if (entity.inGreenMushroomChain) {
    let hasRemainingGreenAbove = game.items.some(i => i.type === 'green' && i.y < entity.y + 20);
    let totalGreenSpawned = game.greenMushroomCount || 0;
    
    if ((totalGreenSpawned >= 18 && !hasRemainingGreenAbove && entity.vy > -2) || !game.equipped?.['mushroom']) {
      entity.inGreenMushroomChain = false;
    }
  }

  if (entity.inGreenMushroomChain) {
    entity.aiLockedFromNormalJump = false;
    entity.aiLockedTarget = null;

    let targetX = config.gameWidth / 2;
    let dx = targetX - px;
    if (dx > config.gameWidth / 2) dx -= config.gameWidth;
    else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

    if (Math.abs(dx) > 1.5) {
      entity.inputDir = dx > 0 ? 1 : -1;
    } else {
      entity.inputDir = 0;
    }

    let nextGreen = game.items.find(i => i.type === 'green' && i.y < entity.y);
    entity.aiTarget = nextGreen || null;
    return;
  }

  // Calculate the strict bottom deadline (death/falling limit)
  let maxReachY = isPlayer ? (game.cameraY + config.gameHeight) : (py + config.gameHeight);

  let isTargetInvalid = (t: any): boolean => {
    if (!t) return true;
    if (t.broken || t.blacklisted || (t.collected !== undefined && t.collected)) return true;
    // Below the bottom death line for this entity
    if (t.y >= maxReachY) return true;

    // Check if target is above player but impossible to reach with current upward velocity
    let isGrounded = !!(entity.lastPlatform && Math.abs(py - entity.lastPlatform.y) <= 8);
    if (!isGrounded && t.y < py - 2) {
      let g = config.jumpGravity || 0.15;
      let maxAscent = entity.vy < 0 ? (entity.vy * entity.vy) / (2 * g) : 0;
      let apexY = py - maxAscent;
      if (t.y < apexY - 2) return true;
    }

    return false;
  };

  // When touching a new platform or landing, reset normal jump lock
  if (isJustJumped) {
    entity.aiLockedFromNormalJump = false;
    entity.aiLockedTarget = null;
  }

  // Super Jump / High Launch detection: immediately break lock and clear old targets below player or collected
  let isSuperLaunch = entity.vy < -6 || (currentPlat && (currentPlat.type === 'super' || currentPlat.isGlowing));
  if (isSuperLaunch) {
    entity.aiLockedFromNormalJump = false;
    entity.aiLockedTarget = null;
  }

  // Clear stale target if it's already invalid, collected, broken, blacklisted, or below/passed by the player
  if (entity.aiTarget && isTargetInvalid(entity.aiTarget)) {
    entity.aiTarget = null;
  }

  let isStuck = (entity.samePlatformVertJumps || 0) >= 2;

  // Platform Jump Trigger: Determine optimal target at the EXACT moment of jumping from a normal or ice platform and lock onto it
  if (isJustJumped && currentPlat && isLockOnPlatform(currentPlat)) {
    let history = entity.visitedHistory || entity.recentPlatforms || [];
    let timesVisited = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] === currentPlat) timesVisited++;
    }
    if (timesVisited >= 2) isStuck = true;

    entity.aiThinkTimer = 0;
    let initialVy = getPlatformJumpVy(currentPlat, entity);
    let bestTarget = findBestTarget(entity, px, py, initialVy, isStuck);
    entity.aiTarget = bestTarget;
    entity.aiLockedTarget = bestTarget;
    entity.aiLockedFromNormalJump = true;
  } else if (entity.aiLockedFromNormalJump && entity.aiLockedTarget) {
    // During jump flight from a normal/ice platform, maintain lock onto the chosen target unless destroyed/collected/passed/surpassed
    let t = entity.aiLockedTarget;
    let isInvalid = isTargetInvalid(t) || isSuperLaunch;
    if (isInvalid) {
      // Unlock if target was destroyed, collected, or passed mid-air, or if player ascended above it
      entity.aiLockedFromNormalJump = false;
      entity.aiLockedTarget = null;
      let initialVy = entity.vy;
      entity.aiTarget = findBestTarget(entity, px, py, initialVy, isStuck);
    } else {
      entity.aiTarget = entity.aiLockedTarget;
    }
  } else {
    // Regular thinking evaluation for non-normal platform jumps or mid-air adjustments
    let needsRethink = false;
    if (!entity.aiTarget) {
      needsRethink = true;
    } else if (isJustJumped) {
      needsRethink = true; 
    } else {
      let t = entity.aiTarget;
      if (isTargetInvalid(t)) {
        needsRethink = true;
      } else if (entity.vy < 0) {
        // While rising in mid-air, rethink every 4 frames to continuously update target towards jump apex
        if ((entity.aiThinkTimer || 0) > 4) needsRethink = true;
      } else if (entity.aiThinkTimer > 15) {
        needsRethink = true;
      }
    }

    if (needsRethink) {
      let history = entity.visitedHistory || entity.recentPlatforms || [];
      let timesVisited = 0;
      for (let i = 0; i < history.length; i++) {
        if (history[i] === entity.lastPlatform) timesVisited++;
      }
      if (timesVisited >= 2) isStuck = true;

      entity.aiThinkTimer = 0;
      let isGrounded = !!(entity.lastPlatform && Math.abs(py - entity.lastPlatform.y) <= 8);
      let initialVy = (isJustJumped || isGrounded) ? getPlatformJumpVy(entity.lastPlatform, entity) : entity.vy;
      entity.aiTarget = findBestTarget(entity, px, py, initialVy, isStuck);
    } else {
      entity.aiThinkTimer = (entity.aiThinkTimer || 0) + 1;
    }
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

    let candW = entity.aiTarget.w || 16;
    let isOverPlatform = (px - 6 >= entity.aiTarget.x && px + 6 <= entity.aiTarget.x + candW);

    let isMushroomMode = !!(game.equipped?.['mushroom']) && (game.score <= SCORE_THRESHOLDS.MUSHROOM_MAX) && ((game.greenMushroomCount || 0) < 18);
    // When locked from normal jump, fly directly and continuously toward the target (straight-shot)
    let stopDist = entity.aiLockedFromNormalJump ? 1.5 : (isMushroomMode ? 2 : (entity.lastPlatform ? 2 : 6));
    
    // Suppress shaking/trembling at the jump apex:
    // If the entity is near the apex (very slow ascent or already falling), and we are already aligned over the platform,
    // stop issuing left/right key pushes (neutral inputDir = 0) and let physics/inertia handle the landing smoothly.
    const isNearApex = entity.vy > -1.5;

    if (isOverPlatform && isNearApex) {
      entity.inputDir = 0;
    } else if (dist > stopDist) {
      entity.inputDir = targetDir;
    } else {
      entity.inputDir = 0;
    }
  } else {
    // If stuck with no target, force lateral escape movement
    if (isStuck) {
      entity.inputDir = (px < config.gameWidth / 2) ? 1 : -1;
    } else if (entity.inputDir === undefined) {
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
  let maxVx = config.maxSpeedX || 1.6;
  if (entity && (entity.isSuperJumping || initialVy < -8)) {
    maxVx *= 1.2;
  }

  let gw = config.gameWidth;
  let hgw = gw / 2;
  
  let isMushroomMode = !!(game.equipped?.['mushroom']) && (game.score <= SCORE_THRESHOLDS.MUSHROOM_MAX) && ((game.greenMushroomCount || 0) < 18);

  let processCand = (cand: any) => { 
    if (cand.broken || cand.blacklisted || cand.isGround) return;
    if (cand.collected) return;
    if (cand === entity.lastPlatform) return; 

    let candPy = cand.y;
    let isPlayer = (entity === game.player);
    let maxReachY = isPlayer ? (game.cameraY + config.gameHeight) : (py + config.gameHeight);

    // 1. Completely ignore objects below the death limit (bottom boundary)
    if (candPy >= maxReachY) return;

    let candW = cand.w || 16;
    let candPx = cand.x + candW / 2;

    let dx = Math.abs(px - candPx);
    if (dx > hgw) dx = gw - dx;

    // Effective horizontal distance taking player width (16px) and candidate width into account
    let playerW = 16;
    let eff_dx = Math.max(0, dx - (candW / 2) - (playerW / 2));

    let dy = py - candPy; // positive when platform is ABOVE player

    // If falling in mid-air (initialVy >= 0) and not currently resting on a platform,
    // candidates above the player (candPy < py) are physically impossible to reach.
    let isGroundedOnPlatform = !!(entity.lastPlatform && Math.abs(py - entity.lastPlatform.y) <= 8);
    if (initialVy >= 0 && !isGroundedOnPlatform && candPy < py - 2) {
      return;
    }

    let isReachable = false;
    let dy_world = candPy - py; // exact vertical distance from player feet to candidate surface

    let evalVy = isGroundedOnPlatform ? getPlatformJumpVy(entity.lastPlatform, entity) : initialVy;

    if (evalVy < 0) {
      // When rising in mid-air or launched into a jump, determine exact theoretical jump apex height
      let maxAscent = (evalVy * evalVy) / (2 * g);
      let apexY = py - maxAscent;

      // Platform surface must be at or below the jump apex Y (with a 4px landing tolerance)
      if (candPy >= apexY - 4) {
        let discriminant = evalVy * evalVy + 2 * g * dy_world;
        if (discriminant >= 0) {
          let t_fall = (-evalVy + Math.sqrt(discriminant)) / g;
          if (t_fall >= 0) {
            // Estimate future candidate position at landing frame t_fall if it's a moving platform
            let candPx_future = candPx;
            if (cand.type === 'h-slide' && cand.direction) {
              let moveSpeed = cand.hSlideSpeed || config.hSlideSpeed || 0.8;
              candPx_future += cand.direction * moveSpeed * t_fall;
            }
            let dx_future = Math.abs(px - candPx_future);
            if (dx_future > hgw) dx_future = gw - dx_future;
            let eff_dx_future = Math.max(0, dx_future - (candW / 2) - (playerW / 2));

            // Maximum horizontal distance covered in t_fall frames
            let max_possible_dx = t_fall * maxVx + 6;
            if (eff_dx_future <= max_possible_dx) {
              isReachable = true;
            }
          }
        }
      }
    } else {
      // Descending in mid-air: candidates above player are impossible to reach
      if (candPy >= py - 2) {
        let discriminant = evalVy * evalVy + 2 * g * dy_world;
        if (discriminant >= 0) {
          let t_fall = (-evalVy + Math.sqrt(discriminant)) / g;
          if (t_fall >= 0) {
            let candPx_future = candPx;
            if (cand.type === 'h-slide' && cand.direction) {
              let moveSpeed = cand.hSlideSpeed || config.hSlideSpeed || 0.8;
              candPx_future += cand.direction * moveSpeed * t_fall;
            }
            let dx_future = Math.abs(px - candPx_future);
            if (dx_future > hgw) dx_future = gw - dx_future;
            let eff_dx_future = Math.max(0, dx_future - (candW / 2) - (playerW / 2));

            let max_possible_dx = t_fall * maxVx + 6;
            if (eff_dx_future <= max_possible_dx) {
              isReachable = true;
            }
          }
        }
      }
    }

    let score = 0;
    let maxAscent = initialVy < 0 ? (initialVy * initialVy) / (2 * g) : 0;
    let apexY = py - maxAscent;

    if (isMushroomMode) {
      if (cand.type === 'green') {
        score += 2000000;
        if (dy > 0) score += dy * 200;
        else score -= Math.abs(dy) * 50;
        score -= dx * 2;
      } else {
        if (dy > 0) {
          score += dy * 100;
          if (initialVy < 0) {
            // Give extra priority to platforms near the apex of the super jump
            let distFromApex = Math.abs(candPy - apexY);
            score += Math.max(0, 30000 - distFromApex * 25);
          }
        } else {
          score -= Math.abs(dy) * 50;
        }
        score -= eff_dx * 2;
        let distCenter = Math.abs(candPx - hgw);
        score -= distCenter * 10;

        if (cand.type === 'super' || cand.isGlowing || cand.type === 'red') {
          score += 3500;
        }

        let historyIdx = history.lastIndexOf(cand);
        if (historyIdx !== -1) {
          let recency = history.length - historyIdx;
          score -= (20000 / recency);
        }
      }
    } else if (isStuck) {
      if (dy > 0) score += dy * 50; 
      score += eff_dx * 5; 
    } else {
      if (dy > 0) {
        score += dy * 100; // Prioritize climbing upward to reachable high platforms
        if (initialVy < 0) {
          let distFromApex = Math.abs(candPy - apexY);
          score += Math.max(0, 30000 - distFromApex * 25);
        }
      } else {
        let absDy = dy < 0 ? -dy : dy;
        score -= absDy * 50; // Penalty for platform below
        // When descending, heavily encourage landing on platforms directly or closely beneath the player
        if (initialVy >= 0 || entity.vy > 0) {
          if (eff_dx === 0) {
            score += 20000; // Large landing guarantee bonus for platforms directly under player
          } else if (eff_dx < 20) {
            score += 10000 - eff_dx * 200;
          }
        }
      }
      score -= eff_dx * 1.5; // Minimal lateral penalty so reachable far platforms are pursued

      let bonus = 0;
      if (cand.type === 'super' || cand.isGlowing || cand.type === 'red') bonus += 3500;
      if (cand.type === 'green' && dy > 0) bonus += 500000;
      else if (cand.collected !== undefined) bonus += 1000; 
      
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

    if (isReachable) {
      if (score > bestScore) {
        bestScore = score;
        bestTarget = cand;
      }
    }

    // Improved fallback evaluation: context-aware for ascent vs descent
    let fbScore = 0;
    let isDescending = (initialVy >= 0 || entity.vy > 0);

    if (isDescending) {
      // While descending/falling, platforms above are physically unreachable. NEVER target them in fallback.
      if (dy > 0) {
        fbScore = -Infinity;
      } else {
        // Prefer platforms that are closer below and horizontally aligned
        let absDy = -dy; // positive distance below
        fbScore = -absDy * 100 - eff_dx * 20;
        if (eff_dx === 0) fbScore += 5000;
      }
    } else {
      // While ascending, prioritize climbing upward
      if (dy > 0) {
        fbScore += dy * 100; // Prefer platforms above
      } else {
        fbScore -= Math.abs(dy) * 100; // Penalize lower platforms
      }
      fbScore -= eff_dx * 8; // Prefer horizontally closer platforms
    }

    if (cand.type === 'super' || cand.isGlowing || cand.type === 'red') fbScore += 3000;
    if (cand.type === 'green' && dy > 0) fbScore += 500000; // Only boost green mushrooms if above player

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
