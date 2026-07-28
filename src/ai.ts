import { config, SCORE_THRESHOLDS } from './config.js';
import { game } from './state.js';
import { isAttractMode } from './lifecycle.js';
import { getSafetyLineY } from './spawner.js';
import type { Player, Platform, Item } from './types.js';

function isLockOnPlatform(platform: any): boolean {
  if (!platform) return false;
  return (platform.type === 'normal' || platform.isIcy || platform.type === 'h-slide' || platform.type === 'v-slide');
}

let aiCalculationsThisFrame = 0;
let lastAiFrame = 0;

export function runAI(entity: Player) {
  let currentFrame = Math.floor(performance.now() / 16);
  if (currentFrame !== lastAiFrame) {
    lastAiFrame = currentFrame;
    aiCalculationsThisFrame = 0;
  }

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
  if (isJustJumped && currentPlat) {
    if (currentPlat === entity.platformTheyJumpedFrom) {
      entity.samePlatformVertJumps = (entity.samePlatformVertJumps || 0) + 1;
    } else {
      entity.samePlatformVertJumps = 0;
    }
  }
  if (currentPlat) {
    entity.platformTheyJumpedFrom = currentPlat;
  }

  let isPlayer = (entity === game.player);

  // Ground level is y = 224 (feet at y = 240). Super jump spring platform is at y = 416 (hole center x = 112).
  // Check if entity is near ground level or inside the ground hole (entity.y >= 210)
  let isGroundPhase = false;
  if (entity.y >= 210 && game.platforms) {
    for (let i = 0; i < game.platforms.length; i++) {
      if (game.platforms[i].isGround && !game.platforms[i].broken) {
        isGroundPhase = true;
        break;
      }
    }
  }

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

  // First Super Jump: Keep inputDir neutral until exceeding the height of the first safety line (looks natural, avoids looking off-screen immediately)
  if (entity.y > getSafetyLineY()) {
    entity.inGreenMushroomChain = false;
    entity.aiTarget = null;
    entity.aiLockedFromNormalJump = false;
    entity.aiLockedTarget = null;
    entity.inputDir = 0;
    return;
  }

  // Green Mushroom Chain Mode: From touching 1st green mushroom to passing 18th green mushroom, fly straight up without turning left/right
  if (entity.inGreenMushroomChain) {
    let hasRemainingGreenAbove = false;
    if (game.items) {
      for (let i = 0; i < game.items.length; i++) {
        let it = game.items[i];
        if (it.type === 'green' && it.y < entity.y + 20) {
          hasRemainingGreenAbove = true;
          break;
        }
      }
    }
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

    let nextGreen = null;
    if (game.items) {
      for (let i = 0; i < game.items.length; i++) {
        let it = game.items[i];
        if (it.type === 'green' && it.y < entity.y) {
          nextGreen = it;
          break;
        }
      }
    }
    entity.aiTarget = nextGreen || null;
    return;
  }

  let isNearOtherEntity = false;
  let gw = config.gameWidth;
  let hgw = gw / 2;
  
  let checkProximity = (other: Player | null | undefined) => {
    if (!other || other === entity || !other.active) return;
    let dx_other = Math.abs(entity.x - other.x);
    if (dx_other > hgw) dx_other = gw - dx_other;
    let dy_other = Math.abs(entity.y - other.y);
    if (dx_other < 24 && dy_other < 28) {
      isNearOtherEntity = true;
    }
  };
  
  if (entity.isNPC) checkProximity(game.player);
  if (game.npcs) {
    for (let i = 0; i < game.npcs.length; i++) checkProximity(game.npcs[i]);
  }

  if (isNearOtherEntity) {
    entity.nearOtherEntityFrames = (entity.nearOtherEntityFrames || 0) + 1;
  } else {
    entity.nearOtherEntityFrames = 0;
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
      // If we are locked onto this target, we already verified reachability at the start of the jump.
      // We should only invalidate it if we are fully descending and have clearly fallen below its level.
      if (entity.aiLockedFromNormalJump && entity.aiLockedTarget === t) {
        if (entity.vy >= 0 && py > t.y + 32) {
          return true;
        }
      } else {
        // For non-locked targets, use a slightly more generous apex check to prevent rapid flickering
        let g = config.jumpGravity || 0.15;
        let maxAscent = entity.vy < 0 ? (entity.vy * entity.vy) / (2 * g) : 0;
        let apexY = py - maxAscent;
        
        // If we are very close to the platform height anyway, don't invalidate
        if (py - t.y > 16) {
          if (t.y < apexY - 6) return true;
        } else {
          // If descending and feet are below platform height + margin, it's unreachable
          if (entity.vy >= 0 && py > t.y + 24) {
            return true;
          }
        }
      }
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

    // Smart horizontal boost for far-away targets (edge take-off emulation)
    if (bestTarget) {
      let candW = bestTarget.w || 16;
      let tx = bestTarget.x + candW / 2;
      let dx = tx - px;
      if (dx > config.gameWidth / 2) dx -= config.gameWidth;
      else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

      let dist = Math.abs(dx);
      if (dist > 30) {
        let pushDir = dx > 0 ? 1 : -1;
        // Apply immediate horizontal kick to help clear the gap smoothly
        let boostAmount = 0.9 * pushDir;
        entity.vx = (entity.vx || 0) + boostAmount;
        let maxS = config.maxSpeedX * (entity.isSuperJumping ? 1.2 : 1.0);
        if (entity.vx > maxS) entity.vx = maxS;
        else if (entity.vx < -maxS) entity.vx = -maxS;
      }
    }
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
      } else {
        let entityId = entity.isNPC ? (entity.npcIndex || 1) : 0;
        let fCount = entity.frameCount || 0;
        if (entity.vy < 0) {
          // While rising in mid-air, lower rethink frequency and apply time-slicing (staggering across frames)
          if ((entity.aiThinkTimer || 0) > 12 && (fCount + entityId) % 12 === 0) {
            needsRethink = true;
          }
        } else {
          // Lower rethink frequency during fall/wait and apply time-slicing
          if ((entity.aiThinkTimer || 0) > 30 && (fCount + entityId) % 30 === 0) {
            needsRethink = true;
          }
        }
      }
    }

    if (needsRethink) {
      // Throttle heavy AI pathfinding calculations to 2 per frame globally
      if (aiCalculationsThisFrame >= 2) {
        return;
      }
      aiCalculationsThisFrame++;

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
    let candW = entity.aiTarget.w || 16;
    let tx = entity.aiTarget.x + candW / 2;
    if (entity.aiTarget.type === 'h-slide' && entity.aiTarget.direction) {
      tx += entity.aiTarget.direction * 16;
    }
    
    // Smart edge targeting for far away platforms to maximize reachable jump distance
    let dx_center = tx - px;
    if (dx_center > config.gameWidth / 2) dx_center -= config.gameWidth;
    else if (dx_center < -config.gameWidth / 2) dx_center += config.gameWidth;

    if (entity.aiTarget.y !== undefined && Math.abs(dx_center) > 20) {
      if (dx_center > 0) {
        // Target is to the right -> Aim for its left edge
        tx = entity.aiTarget.x + 4;
      } else {
        // Target is to the left -> Aim for its right edge
        tx = entity.aiTarget.x + candW - 4;
      }
    }

    let dx = tx - px;
    if (dx > config.gameWidth / 2) dx -= config.gameWidth;
    else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

    let dist = Math.abs(dx);
    let targetDir = dx > 0 ? 1 : -1;

    let isGrounded = !!(entity.lastPlatform && Math.abs(py - entity.lastPlatform.y) <= 8);
    let isOverPlatform = (px - 6 >= entity.aiTarget.x && px + 6 <= entity.aiTarget.x + candW);

    // Height-aware and flight-aware OverPlatform override:
    // If the target is physically above us or we are in mid-air, do NOT prematurely release the direction key.
    // Hold it firmly to pull into the target smoothly, avoiding mid-air stalling, apex hesitation, and vertical jumping.
    let targetY = entity.aiTarget.y;
    if (targetY !== undefined) {
      let dy_target = py - targetY; // positive when target is above player feet
      if (dy_target > 8) {
        isOverPlatform = (dist < 2.5);
      } else if (!isGrounded) {
        isOverPlatform = (dist < 2.5);
      }
    }

    let isMushroomMode = !!(game.equipped?.['mushroom']) && (game.score <= SCORE_THRESHOLDS.MUSHROOM_MAX) && ((game.greenMushroomCount || 0) < 18);
    // When locked from normal jump, fly directly and continuously toward the target (straight-shot)
    let stopDist = entity.aiLockedFromNormalJump ? 1.5 : (isMushroomMode ? 2 : (isGrounded ? 2 : 5));
    
    // Suppress shaking/trembling:
    // If we are already aligned over the target platform, stop issuing left/right key pushes (neutral inputDir = 0)
    // and let physics/inertia handle the movement smoothly. This completely avoids rapid back-and-forth micro-adjustments.
    if (isOverPlatform) {
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

  // Stuck/Collision breakout movement (irregular/random breakout maneuver)
  let isStuckBreakout = (entity.stagnationTimer >= 120 || isStuck);
  if (isStuckBreakout) {
    if (entity.breakoutTimer && entity.breakoutTimer > 0) {
      entity.breakoutTimer--;
      if (entity.breakoutDir !== undefined) {
        entity.inputDir = entity.breakoutDir;
      }
    } else {
      // 5% chance per frame to trigger a breakout maneuver
      if (Math.random() < 0.05) {
        let chosenDir = Math.random() < 0.5 ? 1 : -1;
        // Find the nearest other active entity to actively move away from them
        let nearestOther: Player | null = null;
        let minOtherDist = Infinity;
        
        let checkNearest = (other: Player | null | undefined) => {
          if (!other || other === entity || !other.active) return;
          let dx_other = Math.abs(entity.x - other.x);
          if (dx_other > hgw) dx_other = gw - dx_other;
          if (dx_other < minOtherDist) {
            minOtherDist = dx_other;
            nearestOther = other;
          }
        };
        
        if (entity.isNPC) checkNearest(game.player);
        if (game.npcs) {
          for (let i = 0; i < game.npcs.length; i++) checkNearest(game.npcs[i]);
        }
        if (nearestOther && minOtherDist < 40) {
          let dx_val = entity.x - nearestOther.x;
          if (dx_val > hgw) dx_val -= gw;
          else if (dx_val < -hgw) dx_val += gw;
          chosenDir = dx_val > 0 ? 1 : -1;
        }
        entity.breakoutTimer = 15 + Math.floor(Math.random() * 15);
        entity.breakoutDir = chosenDir;
        entity.inputDir = chosenDir;
      }
    }
  } else {
    entity.breakoutTimer = 0;
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

    if (entity.aiLockedFromNormalJump && entity.aiLockedTarget === cand) {
      isReachable = true;
    } else if (evalVy < 0) {
      // When rising in mid-air or launched into a jump, determine exact theoretical jump apex height
      let maxAscent = (evalVy * evalVy) / (2 * g);
      let apexY = py - maxAscent;

      // Platform surface must be at or below the jump apex Y (with at least 2px clearance to guarantee landing)
      if (candPy >= apexY + 2) {
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

    // Deterministic, unique platform preference bias to prevent herding and target-switching oscillation.
    // Each entity prefers platforms in a slightly different order based on their unique ID/coordinates.
    let entityId = entity.isNPC ? (entity.npcIndex !== undefined ? entity.npcIndex : 1) : 0;
    let candSeed = Math.abs(Math.sin((cand.x || 0) * 12.9898 + (cand.y || 0) * 78.233 + entityId * 43.123));
    let microBias = (candSeed - 0.5) * 800; // Reduced from 6000 to 800 to prevent dampening climb elevation drive

    // Ice platform lookahead check: ensure there is a next platform/item reachable after jumping off this ice platform
    let hasNextFromIce = true;
    if (cand.isIcy) {
      let jumpVy = getPlatformJumpVy(cand, entity);
      let maxAscent = (jumpVy * jumpVy) / (2 * g);
      let t_flight = (-jumpVy * 2) / g;
      let max_reach_dx = t_flight * maxVx + 10;

      let foundNext = false;
      for (let nextCand of candidates) {
        if (nextCand === cand || nextCand.broken || nextCand.blacklisted || nextCand.isGround) continue;
        
        let nextCandPy = nextCand.y;
        if (nextCandPy >= maxReachY) continue;

        // Next platform must be within vertical reach from cand
        if (nextCandPy >= cand.y + 15) continue;
        if (nextCandPy < cand.y - maxAscent - 15) continue;

        let nextCandW = nextCand.w || 16;
        let nextCandPx = nextCand.x + nextCandW / 2;
        let next_dx = Math.abs(candPx - nextCandPx);
        if (next_dx > hgw) next_dx = gw - next_dx;
        
        let next_eff_dx = Math.max(0, next_dx - (nextCandW / 2) - (candW / 2));
        if (next_eff_dx <= max_reach_dx) {
          foundNext = true;
          break;
        }
      }

      if (!foundNext) {
        for (let nextItem of items) {
          if (nextItem.collected || nextItem.blacklisted) continue;
          
          let nextItemPy = nextItem.y;
          if (nextItemPy >= maxReachY) continue;

          if (nextItemPy >= cand.y + 15) continue;
          if (nextItemPy < cand.y - maxAscent - 15) continue;

          let nextItemW = nextItem.w || 16;
          let nextItemPx = nextItem.x + nextItemW / 2;
          let next_dx = Math.abs(candPx - nextItemPx);
          if (next_dx > hgw) next_dx = gw - next_dx;

          let next_eff_dx = Math.max(0, next_dx - (nextItemW / 2) - (candW / 2));
          if (next_eff_dx <= max_reach_dx) {
            foundNext = true;
            break;
          }
        }
      }

      if (!foundNext) {
        hasNextFromIce = false;
      }
    }

    let score = microBias;
    if (cand.isIcy) {
      score -= 4000; // Prefer stable normal platforms if both are at a similar height
    }

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
      score += eff_dx * 10; 
    } else {
      if (dy > 0) {
        score += dy * 180; // Strongly prioritize climbing upward (increased from 100 to 180)
        if (initialVy < 0) {
          let distFromApex = candPy - apexY; // Distance of platform surface below the jump apex
          let apexBonus = 0;
          if (distFromApex >= 2) {
            // Highly reachable! The closer to the apex (higher up), the better!
            // Give a massive base bonus, with a small penalty for being further below the apex.
            apexBonus = 40000 - distFromApex * 100; // Boosted base bonus to 40000, reduced penalty to 100
          }
          score += Math.max(0, apexBonus);
        }
      } else {
        let absDy = dy < 0 ? -dy : dy;
        score -= absDy * 100; // Penalize platforms below more heavily (increased from 50 to 100) to keep drive upward
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

      // Stuck prevention: If currently stuck/doing vertical jumps, heavily penalize targeting
      // platforms directly above the player to force choosing side platforms.
      if ((entity.samePlatformVertJumps || 0) >= 1) {
        let isDirectlyAbove = (eff_dx < 16 && dy > 0);
        if (isDirectlyAbove) {
          score -= 60000;
        }
      }

      // Target commitment/stickiness bonus: avoid rapid back-and-forth target switching
      if (entity.aiTarget && cand === entity.aiTarget) {
        score += 15000;
      }
    }

    // Improved fallback evaluation: context-aware for ascent vs descent
    let fbScore = microBias;
    if (cand.isIcy) {
      fbScore -= 4000; // Apply general ice platform preference penalty here too
    }

    // Heavily penalize ice platforms with no next step (dead ends)
    if (!hasNextFromIce) {
      score -= 200000;
      fbScore -= 200000;
    }

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

    // Target commitment/stickiness bonus for fallback candidates as well
    if (entity.aiTarget && cand === entity.aiTarget) {
      fbScore += 15000;
    }

    // BREAKOUT target diversification: If stuck, force target switching to break stagnation loops
    let isStuckBreakout = (entity.stagnationTimer >= 120 || isStuck);
    if (isStuckBreakout) {
      // 1. Add a penalty to the current target/locked target to encourage switching to a new target
      if (entity.aiTarget === cand || entity.aiLockedTarget === cand) {
        score -= 40000;
        fbScore -= 40000;
      }

      // 2. Extra penalty for recently visited platforms in history to break loop/stagnation!
      let historyIdx = history.lastIndexOf(cand);
      if (historyIdx !== -1) {
        score -= 50000;
        fbScore -= 50000;
      }
    }

    if (isReachable) {
      if (score > bestScore) {
        bestScore = score;
        bestTarget = cand;
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
