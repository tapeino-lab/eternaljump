import { config, SCORE_THRESHOLDS } from './config.js';
import { game } from './state.js';
import { isAttractMode } from './lifecycle.js';
import { getSafetyLineY } from './spawner.js';
import type { Player, Platform, Item, AILevel } from './types.js';

export function getEntityAILevel(entity: Player): AILevel {
  if (entity === game.player) {
    if (game.equipped?.['autocruise2']) return 'smart';
    if (game.equipped?.['autocruise']) return 'basic';
    if (game.demoMode) return 'smart';
  }
  if (entity && entity.aiLevel) return entity.aiLevel;
  return 'smart';
}

function isLockOnPlatform(platform: any): boolean {
  if (!platform) return false;
  return (platform.type === 'normal' || platform.isIcy || platform.type === 'h-slide' || platform.type === 'v-slide');
}

export function getTargetTouchY(cand: any): number {
  if (!cand) return 0;
  let isItemOrMushroom = (cand.collected !== undefined || cand.type === 'red' || cand.type === 'green');
  return isItemOrMushroom ? (cand.y + (cand.h || 8) / 2) : cand.y;
}

export function getTargetBottomY(cand: any): number {
  if (!cand) return 0;
  let isItemOrMushroom = (cand.collected !== undefined || cand.type === 'red' || cand.type === 'green');
  let candH = cand.h || 8;
  return isItemOrMushroom ? (cand.y + candH) : (cand.y + candH);
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
  
  // Detect if the entity just initiated a jump this frame (velocity went from >= 0 to < 0)
  let prevVyVal = (entity as any).prevVy;
  let isJustJumped = (entity.vy < 0 && (prevVyVal === undefined || prevVyVal >= 0));
  // Detect if the entity reached the jump apex and transitioned to falling this frame (prevVy < 0 && vy >= 0)
  let isApex = (prevVyVal !== undefined && prevVyVal < 0 && entity.vy >= 0);
  (entity as any).prevVy = entity.vy;
  
  let prevPlat = entity.prevLastPlatform;
  let currentPlat = entity.lastPlatform;
  let isPlatChanged = (currentPlat && currentPlat !== prevPlat);
  entity.prevLastPlatform = currentPlat;

  // Track consecutive vertical jumps on the same platform to detect stuck state
  if ((isJustJumped || isPlatChanged) && currentPlat) {
    if (currentPlat === entity.platformTheyJumpedFrom) {
      entity.samePlatformVertJumps = (entity.samePlatformVertJumps || 0) + 1;
    } else {
      entity.samePlatformVertJumps = 0;
    }
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

    // Target is invalid if descending and player's feet have passed below the platform landing line
    if (entity.vy > 0) {
      let touchBottom = getTargetBottomY(t);
      if (py > touchBottom + 6) return true;
    }

    return false;
  };

  // When touching a new platform or landing, reset normal jump lock and stale target
  if (isJustJumped || isPlatChanged) {
    entity.aiLockedFromNormalJump = false;
    entity.aiLockedTarget = null;
    entity.aiLookAheadTarget = null;
    entity.aiTarget = null;
    (entity as any).aiBoostAppliedThisJump = false;
  }

  // Super Jump / High Launch detection: immediately clear old targets below player or collected
  let isSuperLaunch = entity.vy < -6 || (currentPlat && (currentPlat.type === 'super' || currentPlat.isGlowing));

  // Clear stale target if it's already invalid, collected, broken, blacklisted, or below/passed by the player
  if (entity.aiTarget && isTargetInvalid(entity.aiTarget)) {
    entity.aiTarget = null;
    entity.aiLookAheadTarget = null;
  }

  let isStuck = (entity.samePlatformVertJumps || 0) >= 2;

  // Platform Jump Trigger: Determine optimal target at the EXACT moment of jumping from any platform and lock onto it
  if (isJustJumped || isPlatChanged) {
    let history = entity.visitedHistory || entity.recentPlatforms || [];
    let timesVisited = 0;
    if (currentPlat) {
      for (let i = 0; i < history.length; i++) {
        if (history[i] === currentPlat) timesVisited++;
      }
    }
    if (timesVisited >= 2) isStuck = true;

    entity.aiThinkTimer = 0;
    let initialVy = currentPlat ? getPlatformJumpVy(currentPlat, entity) : (entity.vy < 0 ? entity.vy : -4.2);
    aiCalculationsThisFrame++;
    let bestTarget = findBestTarget(entity, px, py, initialVy, isStuck);
    entity.aiTarget = bestTarget;
    entity.aiLockedTarget = bestTarget;
    entity.aiLockedFromNormalJump = !!bestTarget;

    if (bestTarget) {
      let candW = bestTarget.w || 16;
      let tx = bestTarget.x + candW / 2;
      let dx = tx - px;
      if (dx > config.gameWidth / 2) dx -= config.gameWidth;
      else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

      let dist = Math.abs(dx);
      let pushDir = dx > 0 ? 1 : -1;
      entity.inputDir = (dist > 2.5) ? pushDir : 0;

      // Immediate horizontal propulsion to prevent vertical bouncing on landings
      if (dist > 2.5 || Math.abs(entity.vx) < 0.4) {
        let boostAmount = 0.85 * pushDir;
        let aiLvl = getEntityAILevel(entity);
        // If current velocity opposes the target direction, give extra kick to turn around instantly
        if ((entity.vx > 0 && pushDir < 0) || (entity.vx < 0 && pushDir > 0)) {
          entity.vx = pushDir * (aiLvl === 'smart' ? 1.5 : 1.0);
        } else if (Math.abs(entity.vx) < 0.6) {
          entity.vx = (entity.vx || 0) + boostAmount * (aiLvl === 'smart' ? 1.5 : 1.0);
        }
        let speedMult = (entity.isSuperJumping ? 1.2 : 1.0) * (aiLvl === 'smart' ? 1.15 : 1.0);
        let maxS = config.maxSpeedX * speedMult;
        if (entity.vx > maxS) entity.vx = maxS;
        else if (entity.vx < -maxS) entity.vx = -maxS;
      }
    } else {
      // Fallback: no clear target above, maintain previous heading / direction to keep moving laterally
      let prevDir = (entity.vx > 0.1) ? 1 : ((entity.vx < -0.1) ? -1 : (entity.facingRight ? 1 : (px < config.gameWidth / 2 ? 1 : -1)));
      entity.inputDir = prevDir;
      entity.vx = (entity.vx || 0) + prevDir * 0.6;
    }
  } else if (isApex) {
    // Jump Apex Trigger (prevVy < 0 && vy >= 0):
    // When reaching the peak of the jump and transitioning into falling,
    // preserve the currently locked target unless it has become genuinely invalid/destroyed/passed.
    let currentLocked = entity.aiLockedTarget;
    if (currentLocked && !isTargetInvalid(currentLocked)) {
      entity.aiTarget = currentLocked;
    } else {
      if (aiCalculationsThisFrame < 1) {
        aiCalculationsThisFrame++;
        let potentialTarget = findBestTarget(entity, px, py, entity.vy, isStuck);
        if (potentialTarget) {
          entity.aiTarget = potentialTarget;
          entity.aiLockedTarget = potentialTarget;
          entity.aiLockedFromNormalJump = true;
        } else {
          entity.aiLockedFromNormalJump = false;
          entity.aiLockedTarget = null;
          entity.aiTarget = null;
        }
      }
    }
  } else if (entity.aiLockedFromNormalJump && entity.aiLockedTarget) {
    // During jump flight (normal jump or super jump), maintain lock onto chosen target unless destroyed/collected/passed
    let t = entity.aiLockedTarget;
    let isInvalid = isTargetInvalid(t);

    if (isInvalid) {
      entity.aiLockedFromNormalJump = false;
      entity.aiLockedTarget = null;
      if (isPlayer || aiCalculationsThisFrame < 1) {
        if (!isPlayer) aiCalculationsThisFrame++;
        let initialVy = entity.vy;
        entity.aiTarget = findBestTarget(entity, px, py, initialVy, isStuck);
      }
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
          // While rising in mid-air, lower rethink frequency and stagger across entities
          if ((entity.aiThinkTimer || 0) > 18 && (fCount + entityId * 5) % 18 === 0) {
            needsRethink = true;
          }
        } else {
          // Lower rethink frequency during fall/wait and stagger across entities
          if ((entity.aiThinkTimer || 0) > 36 && (fCount + entityId * 7) % 36 === 0) {
            needsRethink = true;
          }
        }
      }
    }

    if (needsRethink) {
      // Throttle heavy AI pathfinding calculations for non-critical NPC cases:
      // Player emergency rethink (!entity.aiTarget or isTargetInvalid) must NEVER be blocked!
      let isEmergency = !entity.aiTarget || isTargetInvalid(entity.aiTarget);
      if (!isPlayer && !isEmergency && aiCalculationsThisFrame >= 1) {
        needsRethink = false; // Defer non-critical pathfinding for NPCs to next frame
      } else {
        if (!isPlayer) aiCalculationsThisFrame++;

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
      }
    } 
    if (!needsRethink) {
      entity.aiThinkTimer = (entity.aiThinkTimer || 0) + 1;
    }
  }


  if (entity.aiTarget) {
    let candW = entity.aiTarget.w || 16;
    let tx = entity.aiTarget.x + candW / 2;
    if (entity.aiTarget.type === 'h-slide' && entity.aiTarget.direction) {
      let g = config.fallGravity || 0.15;
      let targetY = getTargetTouchY(entity.aiTarget);
      let dy_world = targetY - py + 8; // +8 for platform thickness
      let evalVy = entity.vy;
      let discriminant = evalVy * evalVy + 2 * g * dy_world;
      if (discriminant >= 0) {
        let t_fall = (-evalVy + Math.sqrt(discriminant)) / g;
        if (t_fall > 0 && t_fall < 300) {
          let simX = entity.aiTarget.x;
          let simDir = entity.aiTarget.direction;
          let speed = config.hSlideSpeed || 0.8;
          let mr = config.gameWidth / 3;
          let startX = entity.aiTarget.startX || 0;
          let steps = Math.floor(t_fall);
          for (let i = 0; i < steps; i++) {
            simX += speed * simDir;
            if (simX <= startX - mr / 2 || simX + candW >= startX + mr / 2 || simX <= 0 || simX + candW >= config.gameWidth) {
              simDir *= -1;
            }
          }
          tx = simX + candW / 2;
        }
      }
    }
    
    // Center targeting
    let dx_center = tx - px;
    if (dx_center > config.gameWidth / 2) dx_center -= config.gameWidth;
    else if (dx_center < -config.gameWidth / 2) dx_center += config.gameWidth;

    let dx = dx_center;
    let dist = Math.abs(dx);

    let isItem = (entity.aiTarget.collected !== undefined || entity.aiTarget.type === 'red' || entity.aiTarget.type === 'green');
    let isTargetIcy = !!entity.aiTarget.isIcy;
    let isTargetFragile = (entity.aiTarget.type === 'crumble' || entity.aiTarget.type === 'brown');

    // Phase-specific steering:
    // 1. Ascent Phase (vy < 0): Actively drive towards target center to maintain clean parabolic trajectory
    //    and prevent unintended vertical jumps due to premature deadband braking.
    // 2. Descent Phase (vy >= 0): Use platform span deadband & Schmitt hysteresis for stable, jitter-free touchdown.
    let isAscending = (entity.vy < 0);
    let halfPlatSpan = isItem ? 3 : Math.max(3, candW / 2 - 3);

    let desiredDir = 0;
    let prevInput = entity.inputDir || 0;
    let rawDir = dx > 0 ? 1 : -1;

    if (isAscending) {
      // During ascent: drive towards target center unless already precisely aligned within 2.5px
      if (dist <= 2.5) {
        desiredDir = 0;
      } else {
        desiredDir = rawDir;
      }
    } else {
      // During descent: smoothly ride inertia onto the platform surface if within landing span
      if (dist <= halfPlatSpan) {
        // If drifting away from platform center at noticeable speed, gently counter-steer to stay centered
        let isDriftingAway = (entity.vx > 0.4 && dx < 0) || (entity.vx < -0.4 && dx > 0);
        if (isDriftingAway && dist > halfPlatSpan * 0.4) {
          desiredDir = dx > 0 ? 1 : -1;
        } else {
          desiredDir = 0;
        }
      } else {
        if (prevInput !== 0 && rawDir !== prevInput && dist < 4.5) {
          desiredDir = 0;
        } else {
          desiredDir = rawDir;
        }
      }
    }

    // Anti-Vertical Boost during rising phase (applied once per jump when clearly heading sideways)
    if (entity.vy < -0.8 && dist > 6 && Math.abs(entity.vx || 0) < 0.45 && !(entity as any).aiBoostAppliedThisJump) {
      (entity as any).aiBoostAppliedThisJump = true;
      let boostAmount = 0.5 * rawDir;
      entity.vx = (entity.vx || 0) + boostAmount;
      let maxS = config.maxSpeedX * (entity.isSuperJumping ? 1.2 : 1.0);
      if (entity.vx > maxS) entity.vx = maxS;
      else if (entity.vx < -maxS) entity.vx = -maxS;
    }

    // Look-Ahead Landing & Pre-Input Steering:
    // When falling toward a confirmed landing, check next hop target (cached once per descent)
    // Only pre-steer when securely within inner half of platform and in immediate final frames of touchdown
    let isDescendingToPlat = (entity.vy > 0 && !isItem && py <= entity.aiTarget.y + 4 && py >= entity.aiTarget.y - 6);
    let isSecurelyCentered = dist <= Math.max(2, halfPlatSpan * 0.5);

    if (isDescendingToPlat && isSecurelyCentered) {
      if (!entity.aiLookAheadTarget || isTargetInvalid(entity.aiLookAheadTarget)) {
        if (isPlayer || aiCalculationsThisFrame < 1) {
          if (!isPlayer) aiCalculationsThisFrame++;
          let nextHopVy = getPlatformJumpVy(entity.aiTarget, entity);
          entity.aiLookAheadTarget = findBestTarget(entity, tx, entity.aiTarget.y, nextHopVy, false);
        }
      }
      let nextTarget = entity.aiLookAheadTarget;
      if (nextTarget && nextTarget !== entity.aiTarget) {
        let nextW = nextTarget.w || 16;
        let nextTx = nextTarget.x + nextW / 2;
        let nextDx = nextTx - px;
        if (nextDx > config.gameWidth / 2) nextDx -= config.gameWidth;
        else if (nextDx < -config.gameWidth / 2) nextDx += config.gameWidth;
        
        let nextDir = nextDx > 0 ? 1 : -1;
        // Hold onto safe landing: only pre-steer if it won't pull the entity off the current platform
        if (dist + Math.abs(entity.vx || 0) < halfPlatSpan - 2) {
          entity.inputDir = nextDir;
          if (isTargetIcy && Math.abs(entity.vx || 0) < 0.6) {
            entity.vx = (entity.vx || 0) + nextDir * 0.4;
          }
        } else {
          entity.inputDir = desiredDir;
        }
      } else {
        if (isTargetIcy || isTargetFragile) {
          let keepDir = (entity.vx > 0.1) ? 1 : ((entity.vx < -0.1) ? -1 : (entity.facingRight ? 1 : rawDir));
          entity.inputDir = keepDir;
        } else {
          entity.inputDir = desiredDir;
        }
      }
    } else {
      entity.inputDir = desiredDir;
    }
  } else {
    // If stuck or having no target, maintain lateral movement in current travel direction
    if (isStuck) {
      entity.inputDir = (px < config.gameWidth / 2) ? 1 : -1;
    } else {
      let prevDir = (entity.vx > 0.1) ? 1 : ((entity.vx < -0.1) ? -1 : (entity.facingRight ? 1 : (px < config.gameWidth / 2 ? 1 : -1)));
      entity.inputDir = prevDir;
    }
  }

  // Stuck/Collision breakout movement (irregular/random breakout maneuver)
  let isGroundedBreakoutCheck = !!(entity.lastPlatform && Math.abs(py - entity.lastPlatform.y) <= 8);
  let isStuckBreakout = (entity.stagnationTimer >= 120 || isStuck) && (entity.vy <= 0 || isGroundedBreakoutCheck);
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
  
  let searchRadiusUp = 380;
  let searchRadiusDown = 220;
  
  let candidates = [];
  for (let i = 0; i < game.platforms.length; i++) {
    let p = game.platforms[i];
    if (p.y >= py - searchRadiusUp && p.y <= py + searchRadiusDown && !p.broken && !p.blacklisted && !p.isGround) {
      candidates.push(p);
    }
  }
  
  let items = [];
  if (game.items) {
    for (let i = 0; i < game.items.length; i++) {
      let it = game.items[i];
      if (it.y >= py - searchRadiusUp && it.y <= py + searchRadiusDown && !it.collected && !it.blacklisted) {
        items.push(it);
      }
    }
  }

  let meteors = [];
  if (game.meteors) {
    for (let i = 0; i < game.meteors.length; i++) {
      let m = game.meteors[i];
      if (m.y >= py - searchRadiusUp && m.y <= py + searchRadiusDown) {
        (m as any).type = 'meteor';
        meteors.push(m);
      }
    }
  }

  let bestFallbackTarget = null;
  let bestFallbackScore = -Infinity;

  let aiLevel = getEntityAILevel(entity);
  let isBasic = (aiLevel === 'basic');

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
    // Don't exclude lastPlatform unconditionally - only penalize it in normal scoring so it serves as a safety fallback
    let isLastPlat = (cand === entity.lastPlatform);

    let candPy = cand.y;
    let isPlayer = (entity === game.player);
    let maxReachY = isPlayer ? (game.cameraY + config.gameHeight) : (py + config.gameHeight);

    // 1. Completely ignore objects below the death limit (bottom boundary)
    if (candPy >= maxReachY) return;

    // Fast bounding box rejection to avoid heavy math on platforms too far away
    if (candPy > py + 220 || candPy < py - 380) return;

    let candW = cand.w || 16;
    let candPx = cand.x + candW / 2;

    let dx = Math.abs(px - candPx);
    if (dx > hgw) dx = gw - dx;

    // Effective horizontal distance taking player width (16px normal, 32px powered up) and candidate width into account
    let playerW = entity.w || (entity.isPoweredUp ? 32 : 16);
    let eff_dx = Math.max(0, dx - (candW / 2) - (playerW / 2));

    // Player touchline/landing boundary: items can be touched across their full height (candPy..candPy+candH)
    // Platforms are landed on top (candPy), items/coins can be collected by touching anywhere
    let targetTouchY = getTargetTouchY(cand);
    let dy = py - targetTouchY; // positive when target contact line is ABOVE player feet

    // If falling in mid-air (initialVy >= 0) and not currently resting on a platform,
    // candidates whose lowest touchable line is above the player are physically impossible to reach.
    let isGroundedOnPlatform = !!(entity.lastPlatform && Math.abs(py - entity.lastPlatform.y) <= 8);
    let topReachLimit = getTargetBottomY(cand);
    let isCandItem = (cand.collected !== undefined || cand.type === 'red' || cand.type === 'green');
    let touchThreshold = isCandItem ? (py - (entity.h || 16) - 4) : (py - 6);
    if (initialVy >= 0 && !isGroundedOnPlatform && topReachLimit < touchThreshold) {
      return;
    }

    let isReachable = false;
    let dy_world = targetTouchY - py; // vertical distance from player feet to candidate contact line (negative when above)

    let evalVy = isGroundedOnPlatform ? getPlatformJumpVy(entity.lastPlatform, entity) : initialVy;

    if (entity.aiLockedFromNormalJump && entity.aiLockedTarget === cand) {
      isReachable = true;
    } else if (evalVy < 0) {
      // When rising in mid-air or launched into a jump, determine exact theoretical jump apex height
      // Also consider full jump capability if already ascending in mid-jump
      let baseJumpPower = getPlatformJumpVy(entity.lastPlatform || null, entity);
      let effectiveVy = Math.min(evalVy, baseJumpPower);
      let maxAscent = (effectiveVy * effectiveVy) / (2 * g);
      let apexY = py - maxAscent;

      // Target touch surface must be at or below the jump apex Y (with generous margin for landing contact or touching items)
      let requiredTouchY = isCandItem ? (apexY - (entity.h || 16) - 4) : (apexY - 12);
      if (targetTouchY >= requiredTouchY) {
        // Platforms have 8px vertical thickness and can be landed on while descending through the top surface
        let landingDyWorld = dy_world + 8;
        let discriminant = evalVy * evalVy + 2 * g * landingDyWorld;
        if (discriminant < 0 && targetTouchY >= requiredTouchY) {
          discriminant = 0;
        }
        if (discriminant >= 0) {
          // Landing time (t_fall): time until descending onto the platform surface
          let t_fall = (-evalVy + Math.sqrt(discriminant)) / g;
          if (t_fall >= 0) {
            // Near the jump apex, the player has additional hangtime and descent window to adjust horizontally
            let effectiveFlightTime = t_fall + 12; // Extra landing window frames across apex & platform thickness

            // Skip future estimation for target evaluation to save processing load as requested by user
            let candPx_future = candPx;
            let dx_future = Math.abs(px - candPx_future);
            if (dx_future > hgw) dx_future = gw - dx_future;
            let eff_dx_future = Math.max(0, dx_future - (candW / 2) - (playerW / 2));

            // Maximum horizontal distance covered in flight time + lateral acceleration/air drift margin
            let currVx = Math.abs(entity.vx || 0);
            let candDirection = (candPx >= px) ? 1 : -1;
            let isMovingTowardCand = (entity.vx > 0.1 && candDirection > 0) || (entity.vx < -0.1 && candDirection < 0);
            let speedFactor = Math.max(maxVx, currVx);
            let max_possible_dx = effectiveFlightTime * speedFactor + 24 + (isMovingTowardCand ? 12 : 0);
            if (eff_dx_future <= max_possible_dx) {
              isReachable = true;
            }
          }
        }
      }
    } else {
      // Descending in mid-air: candidates whose top is below player or within landing contact tolerance
      if (candPy >= py - 12) {
        let landingDyWorld = dy_world + 8;
        let discriminant = evalVy * evalVy + 2 * g * landingDyWorld;
        if (discriminant >= 0) {
          let t_fall = (-evalVy + Math.sqrt(discriminant)) / g;
          if (t_fall >= 0) {
            let candPx_future = candPx;
            let dx_future = Math.abs(px - candPx_future);
            if (dx_future > hgw) dx_future = gw - dx_future;
            let eff_dx_future = Math.max(0, dx_future - (candW / 2) - (playerW / 2));

            let candDir = (candPx >= px) ? 1 : -1;
            let isMovingToward = (entity.vx > 0.1 && candDir > 0) || (entity.vx < -0.1 && candDir < 0);
            let isMovingAway = (entity.vx > 0.1 && candDir < 0) || (entity.vx < -0.1 && candDir > 0);
            let currVxAbs = Math.abs(entity.vx || 0);
            let max_possible_dx = 0;
            if (isMovingToward) {
              max_possible_dx = Math.min(maxVx, currVxAbs + 0.15 * t_fall) * t_fall + 8;
            } else if (isMovingAway) {
              let stopFrames = currVxAbs / 0.15;
              if (t_fall > stopFrames) {
                let remainingFrames = t_fall - stopFrames;
                max_possible_dx = Math.min(maxVx, 0.15 * remainingFrames) * remainingFrames + 4;
              } else {
                max_possible_dx = 0;
              }
            } else {
              max_possible_dx = Math.min(maxVx, 0.15 * t_fall) * t_fall + 6;
            }
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
          score += 80000;
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
    } else if (isBasic) {
      // === BASIC AI (旧AI: 安全登攀、落下リスクや氷台では上方最優先、コインへの無謀な落下ダイブを防止) ===
      let isNearIce = !!(entity.lastPlatform?.isIcy) || candidates.some(p => p.isIcy && Math.abs(p.y - py) < 220);

      if (dy > 0) {
        let upMultiplier = isNearIce ? 320 : 220;
        score += dy * upMultiplier;
        if (initialVy < 0) {
          let distFromApex = candPy - apexY;
          let apexBonus = 0;
          if (distFromApex >= -10) {
            let baseBonus = isNearIce ? 45000 : 32000;
            let decay = isNearIce ? 90 : 80;
            apexBonus = baseBonus - Math.max(0, distFromApex) * decay;
          }
          score += Math.max(0, apexBonus);
        }
      } else {
        let absDy = dy < 0 ? -dy : dy;
        if (initialVy >= 0 || entity.vy > 0) {
          score -= absDy * 150;
          score -= eff_dx * 50;
        } else if (absDy <= 16) {
          // Can hop across nearby lateral platforms at similar height if not in icy danger zone
          if (isNearIce) {
            score -= absDy * 100; // In icy zones, firmly prioritize moving UP
          } else {
            score += 16000 - absDy * 40;
          }
        } else {
          // Penalize lower platforms strongly to prevent dropping down recklessly
          let downPenalty = isNearIce ? 280 : 180;
          score -= absDy * downPenalty;
        }
      }
      if (initialVy < 0 && entity.vy < 0) {
        score -= eff_dx * 8;
      }

      let candDirection = (candPx >= px) ? 1 : -1;
      let isMovingSameWay = (entity.vx > 0.15 && candDirection > 0) || (entity.vx < -0.15 && candDirection < 0);
      let isFacingSameWay = (entity.facingRight && candDirection > 0) || (!entity.facingRight && candDirection < 0);
      if (isMovingSameWay) {
        score += 5000;
      } else if (isFacingSameWay && Math.abs(entity.vx || 0) <= 0.15) {
        score += 2500;
      }

      let bonus = 0;
      if (cand.type === 'super' || cand.isGlowing || cand.type === 'red') bonus += 50000;
      if (cand.type === 'green' && dy > 0) bonus += 1000000;
      else if (cand.collected !== undefined) {
        // Coins: Never dive down, ignore completely in icy zones or when falling
        if (isNearIce || dy < -4 || (entity.vy > 0 && !isGroundedOnPlatform)) {
          bonus = -100000;
        } else {
          bonus += 3000;
        }
      }
      
      score += bonus;

      let historyIdx = history.lastIndexOf(cand);
      if (historyIdx !== -1) {
        let recency = history.length - historyIdx;
        score -= (20000 / recency);
      }

      if ((entity.samePlatformVertJumps || 0) >= 1) {
        let isDirectlyAbove = (eff_dx < 16 && dy > 0);
        if (isDirectlyAbove) {
          score -= 60000;
        }
      }

      if (isLastPlat) {
        score -= 35000;
      }
    } else {
      // === SMART AI (賢いバージョン: 物理頂点最適化・最速登攀・的確な足場選定) ===
      if (dy > 0) {
        score += dy * 600; // Idea 3: Strongly prioritize climbing upward directly to highest reachable platforms
        if (initialVy < 0) {
          let distFromApex = candPy - apexY; // Distance of platform surface below the jump apex
          let apexBonus = 0;
          if (distFromApex >= -12) {
            // Highly reachable! The closer to the apex (higher up), the better!
            // Give a massive base bonus with linear scale based on closeness to jump apex.
            apexBonus = 60000 - Math.max(0, distFromApex) * 120;
          }
          score += Math.max(0, apexBonus);
        }
      } else {
        let absDy = dy < 0 ? -dy : dy;
        // When descending, evaluate which reachable platform provides the highest landing point.
        if (initialVy >= 0 || entity.vy > 0) {
          score -= absDy * 250; // Strongly prioritize the highest reachable platform
          score -= eff_dx * 80; // Strongly penalize horizontal distance so AI lands on platforms right beneath it
        } else if (absDy <= 16) {
          // Same-height platforms (|dy| <= 16) are fully reachable via normal jump arcs!
          // Give them a solid positive baseline so player can comfortably jump laterally across platforms
          score += 15000 - absDy * 50;
        } else {
          score -= absDy * 300; // Heavily penalize much lower platforms while ascending
        }
      }
      if (initialVy < 0 && entity.vy < 0) {
        score -= eff_dx * 30;
      }

      // Directional commitment bonus: If moving in a certain direction, favor platforms on that same side
      // to eliminate mid-air target oscillation between symmetrical left/right platforms.
      let candDirection = (candPx >= px) ? 1 : -1;
      let isMovingSameWay = (entity.vx > 0.15 && candDirection > 0) || (entity.vx < -0.15 && candDirection < 0);
      let isFacingSameWay = (entity.facingRight && candDirection > 0) || (!entity.facingRight && candDirection < 0);
      if (isMovingSameWay) {
        score += 6000;
      } else if (isFacingSameWay && Math.abs(entity.vx || 0) <= 0.15) {
        score += 3000;
      }

      let bonus = 0;
      if (cand.type === 'red' && entity.isPoweredUp && dy > 0) {
        bonus = 12000000; // 1. 赤キノコ(巨大化上昇中) -> 最優先(特大スーパージャンプ)
      } else if (cand.type === 'green' && dy > 0) {
        bonus = 10000000; // 2. 緑キノコ (不動の2位)
      } else if (cand.type === 'red') {
        bonus = 8000000; // 3. 赤キノコ (通常巨大化)
      } else if (cand.type === 'super') {
        bonus = 6000000; // 4. 緑のスーパージャンプ台
      } else if (cand.isGlowing) {
        bonus = 4000000; // 5. 赤のスーパージャンプ台
      } else if (cand.type === 'h-slide' || cand.type === 'v-slide') {
        bonus = 5000; // 5. 緑のジャンプ台 (動くジャンプ台)
      } else if (cand.type === 'meteor') {
        bonus = -50000; // 低優先度 (隕石)
      } else if (cand.collected !== undefined) {
        bonus = 1000;
      }
      
      let isDescendingMidAir = (initialVy >= 0 || entity.vy > 0);
      if (isDescendingMidAir && dy < 0) {
        // While falling in mid-air, cap special bonuses so the AI never bypasses a safe platform directly below it
        bonus = Math.min(bonus, 8000);
      } else if (dy < -10) {
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

      // --- MULTI-STEP LOOKAHEAD (AI2 Route Construction) ---
      // Evaluates the potential of the NEXT jump after landing on this candidate
      // CRITICAL: When descending/falling in mid-air, disable lookahead route bonus to focus 100% on immediate safe landing!
      if (!isDescendingMidAir && isReachable && !isStuck && (!cand.type || cand.type === 'normal' || cand.isIcy || cand.type === 'cloud' || cand.type === 'h-slide' || cand.type === 'v-slide')) {
        let candJumpVy = getPlatformJumpVy(cand, entity);
        let candMaxAscent = (candJumpVy * candJumpVy) / (2 * g);
        let candApexY = candPy - candMaxAscent;
        
        let bestNextScore = 0;
        let t_flight = (-candJumpVy * 2) / g;
        let max_reach_dx = t_flight * maxVx + 24;
        
        for (let i = 0; i < candidates.length; i++) {
          let nextCand = candidates[i];
          if (nextCand === cand || nextCand.broken || nextCand.blacklisted || nextCand.isGround) continue;
          let nextPy = nextCand.y;
          if (nextPy >= maxReachY || nextPy >= candPy + 15 || nextPy < candApexY - 15) continue;
          
          let nextCandW = nextCand.w || 16;
          let nextCandPx = nextCand.x + nextCandW / 2;
          let next_dx = Math.abs(candPx - nextCandPx);
          if (next_dx > hgw) next_dx = gw - next_dx;
          let next_eff_dx = Math.max(0, next_dx - (nextCandW / 2) - (playerW / 2));
          
          if (next_eff_dx <= max_reach_dx) {
            let next_dy = candPy - getTargetTouchY(nextCand);
            let nextScore = 0;
            if (next_dy > 0) {
              nextScore += next_dy * 600;
              let distFromApex = nextPy - candApexY;
              if (distFromApex >= -12) {
                nextScore += 60000 - Math.max(0, distFromApex) * 120;
              }
            }
            
            if (nextCand.type === 'red' && entity.isPoweredUp && next_dy > 0) nextScore += 12000000;
            else if (nextCand.type === 'green' && next_dy > 0) nextScore += 10000000;
            else if (nextCand.type === 'red') nextScore += 8000000;
            else if (nextCand.type === 'super') nextScore += 6000000;
            else if (nextCand.isGlowing) nextScore += 4000000;
            else if (nextCand.type === 'h-slide' || nextCand.type === 'v-slide') nextScore += 5000;
            
            if (nextScore > bestNextScore) {
              bestNextScore = nextScore;
            }
          }
        }
        
        for (let i = 0; i < items.length; i++) {
          let nextItem = items[i];
          if (nextItem === cand || nextItem.blacklisted || nextItem.collected) continue;
          let nextPy = nextItem.y;
          if (nextPy >= maxReachY || nextPy >= candPy + 15 || nextPy < candApexY - 15) continue;
          
          let nextItemW = nextItem.w || 16;
          let nextItemPx = nextItem.x + nextItemW / 2;
          let next_dx = Math.abs(candPx - nextItemPx);
          if (next_dx > hgw) next_dx = gw - next_dx;
          let next_eff_dx = Math.max(0, next_dx - (nextItemW / 2) - (playerW / 2));
          
          if (next_eff_dx <= max_reach_dx) {
            let next_dy = candPy - getTargetTouchY(nextItem);
            let nextScore = 0;
            if (next_dy > 0) {
              nextScore += next_dy * 600;
              let distFromApex = nextPy - candApexY;
              if (distFromApex >= -12) {
                nextScore += 60000 - Math.max(0, distFromApex) * 120;
              }
            }
            
            if (nextItem.type === 'red' && entity.isPoweredUp && next_dy > 0) nextScore += 12000000;
            else if (nextItem.type === 'green' && next_dy > 0) nextScore += 10000000;
            else if (nextItem.type === 'red') nextScore += 8000000;
            if (nextScore > bestNextScore) {
              bestNextScore = nextScore;
            }
          }
        }
        
        if (bestNextScore > 0) {
          score += bestNextScore * 0.45; // 45% of the next target's score propagates backwards!
        }
      }

      if (isLastPlat) {
        score -= 40000; // Prefer newly reachable platforms, but keep lastPlatform available if it's the only option
      }
    }

    // Improved fallback evaluation: context-aware for ascent vs descent
    let fbScore = microBias;
    if (cand.isIcy) {
      fbScore -= isBasic ? 1500 : 4000;
    }
    if (isLastPlat) {
      fbScore -= isBasic ? 15000 : 20000;
    }

    // Penalize ice platforms with no next step (dead ends)
    if (!hasNextFromIce) {
      let icePenalty = isBasic ? 40000 : 200000;
      score -= icePenalty;
      fbScore -= icePenalty;
    }

    let isDescending = (initialVy >= 0 || entity.vy > 0);

    if (isDescending) {
      // While descending/falling, platforms significantly above are physically unreachable.
      if (dy > 6) {
        fbScore = -Infinity;
      } else {
        // Prefer platforms that are highest among those reachable below and horizontally close
        let absDy = -dy; // positive distance below
        fbScore -= absDy * 40;
        fbScore -= eff_dx * 25;
      }
    } else {
      // While ascending, evaluate physical jump apex height
      let maxAscent = (evalVy * evalVy) / (2 * g);
      if (dy > maxAscent + 20) {
        // Platform is far above the maximum jump apex: physically unreachable in this jump!
        fbScore = -Infinity;
      } else if (dy > 0) {
        fbScore += dy * (isBasic ? 60 : 100); // Prefer platforms above within reachable apex
        fbScore -= eff_dx * (isBasic ? 12 : 8); // Prefer horizontally closer platforms
      } else {
        // Equal height or slightly below: viable lateral escape route
        fbScore -= Math.abs(dy) * 15;
        fbScore -= eff_dx * 12;
      }
    }

    if (cand.type === 'red' && entity.isPoweredUp && dy > 0 && dy <= (evalVy * evalVy) / (2 * g) + 20) {
      fbScore += 12000000;
    } else if (cand.type === 'green' && dy > 0 && dy <= (evalVy * evalVy) / (2 * g) + 20) {
      fbScore += 10000000;
    } else if (cand.type === 'red') {
      fbScore += 8000000;
    } else if (cand.type === 'super') {
      fbScore += 6000000;
    } else if (cand.isGlowing) {
      fbScore += 4000000;
    } else if (cand.type === 'h-slide' || cand.type === 'v-slide') {
      fbScore += 5000;
    } else if (cand.type === 'meteor') {
      fbScore -= 50000;
    }
    
    if (cand.collected !== undefined) {
      // Coins must NEVER be chosen as fallback landing targets because you cannot land on a coin!
      fbScore = -Infinity;
    }

    let historyIdx = history.lastIndexOf(cand);
    if (historyIdx !== -1) {
      let recency = history.length - historyIdx;
      fbScore -= (30000 / recency);
    }

    // BREAKOUT target diversification: If stuck, force target switching to break stagnation loops
    let isStuckBreakout = (entity.stagnationTimer >= 120 || isStuck) && (entity.vy <= 0 || isGroundedOnPlatform);
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
  for (let i = 0; i < meteors.length; i++) {
    processCand(meteors[i]);
  }
  // For Basic AI, only evaluate nearby safe coins if not near ice platforms and coin is not below the player
  if (isBasic) {
    let isNearIce = !!(entity.lastPlatform?.isIcy) || candidates.some(p => p.isIcy && Math.abs(p.y - py) < 220);
    if (!isNearIce && game.coins) {
      for (let i = 0; i < game.coins.length; i++) {
        let c = game.coins[i];
        if (!c.collected && (py - c.y >= -4) && Math.abs(c.y - py) < 120) {
          processCand(c);
        }
      }
    }
  }

  return bestTarget || bestFallbackTarget;
}
