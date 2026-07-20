import { config } from './config.js';
import { game } from './state.js';

import { ABS, FLR, MIN } from './utils.js';


export function evaluatePath(path, entity) {
  let score = 0;
  let finalNode = path[path.length - 1];
  let expectedJump = config.jumpPower;
    
  if (finalNode.collected !== undefined) expectedJump = config.superJumpPower * 1.2;
  else if (finalNode.isGlowing) expectedJump = config.superJumpPower * config.glowingMovingJumpMultiplier;
  else if (finalNode.type === 'super') expectedJump = config.superJumpPower;
  else if (finalNode.type === 'h-slide' || finalNode.type === 'v-slide') expectedJump = config.jumpPower * config.movingPlatformJumpMultiplier;
    
  let heightGain = (expectedJump * expectedJump) / (2 * config.jumpGravity);
  let projectedApex = finalNode.y - heightGain;
  score += (entity.y - projectedApex) * 15;
    
  let px = entity.x + entity.w / 2;
  let n0x = path[0].x + (path[0].w || 16) / 2;
  let d0 = ABS(px - n0x);
  if (d0 > config.gameWidth / 2) d0 = config.gameWidth - d0;
  score -= d0 * 1.5;
    
  for (let i = 0; i < path.length; i++) {
    let pn = path[i];
    if (pn.isIcy) score -= 50;
    let stepY = i > 0 ? (path[i - 1].y - pn.y) : (entity.y - pn.y);
    if (stepY < 10) score -= 500;
    if (entity.visitedHistory.includes(pn)) score -= 500000;
    if (pn.collected !== undefined) score += 2000;
      
    if (i > 0) {
      let prNx = path[i - 1].x + (path[i - 1].w || 16) / 2;
      let crNx = pn.x + (pn.w || 16) / 2;
      let pd = ABS(crNx - prNx);
      if (pd > config.gameWidth / 2) pd = config.gameWidth - pd;
      score -= pd * 0.5;
    }
  }
  return score;
}

export function searchPaths(currentNode, allNodes, depth, currentPath, allPaths) {
  currentPath.push(currentNode);
  if (depth === 0) {
    allPaths.push([...currentPath]);
  } else {
    let nextMoves = [];
    for (let n of allNodes) {
      if (n !== currentNode && n.y < currentNode.y && n.y >= currentNode.y - 120) {
        nextMoves.push(n);
      }
    }
    if (nextMoves.length === 0) {
      allPaths.push([...currentPath]);
    } else {
      for (let n of nextMoves) {
        if (!currentPath.includes(n)) searchPaths(n, allNodes, depth - 1, currentPath, allPaths);
      }
    }
  }
  currentPath.pop();
}

export function runAI(entity, logAIEvent) {
  let px = entity.x + entity.w / 2;
  let py = entity.y;
  let isIntroState = (entity.isNPC && entity.isIntro) || (entity === game.player && game.state === 'intro');
    
  if (isIntroState) {
    if (px < 104) entity.inputDir = 1;
    else if (px > 120) entity.inputDir = -1;
    else entity.inputDir = 0;
    return;
  }
    
  if (entity.vy > 1.5 && !entity.isSuperJumping) {
    let bT = null, bS = Infinity;
    for (let p of game.platforms) {
      if (!p.broken && !p.blacklisted && p.y > py && p.y < py + config.gameHeight) {
        let pxC = p.x + (p.w || 16) / 2, dX = ABS(pxC - px);
        if (dX > config.gameWidth / 2) { dX = config.gameWidth - dX; }
        if (dX <= 80 + (p.y - py) * 0.35) {
          let s = dX + (p.y - py) * 0.4;
          if (s < bS) { bS = s; bT = p; }
        }
      }
    }
    if (bT) {
      let tx = bT.x + (bT.w ? bT.w / 2 : 8);
      if (bT.type === 'h-slide') tx += bT.direction * 20;
      let dx = tx - px;
      if (dx > config.gameWidth / 2) dx -= config.gameWidth;
      else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
      entity.inputDir = dx > 4 ? 1 : (dx < -4 ? -1 : 0);
      entity.aiPath = [bT];
      return;
    }
  }
    
  let dodging = false;
  if (entity.isPoweredUp || entity.vy < -10) {
    for (let m of game.meteors) {
      if (!m.hit && m.y < py + 40 && m.y > py - 100) {
        let dx = (m.x + m.w / 2) - px;
        if (dx > config.gameWidth / 2) dx -= config.gameWidth;
        else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
        if (ABS(dx) < 24) {
          entity.inputDir = dx > 0 ? -1 : 1;
          dodging = true;
          break;
        }
      }
    }
  }
  if (dodging) return;
    
  if (py < entity.highestReachedY - 5) {
    entity.highestReachedY = py;
    entity.stagnationTimer = 0;
  } else {
    entity.stagnationTimer += (entity.isNPC ? 3 : 1);
  }
    
  if (entity.stagnationTimer > 180) {
    if (!entity.adventureMode) {
      entity.adventureMode = true;
      entity.aiPath = [];
      if (entity === game.player) {
        let dump = "px:" + FLR(px) + ",py:" + FLR(py) + " | ";
        game.platforms.forEach(function(p) {
          if (!p.broken && p.y < py + 150 && p.y > py - 250) dump += "P(" + FLR(p.x - px) + "," + FLR(p.y - py) + "," + p.type.charAt(0) + (p.isIcy ? "i" : "") + ") ";
        });
        game.items.forEach(function(i) {
          if (!i.collected && i.y < py + 150 && i.y > py - 250) dump += "I(" + FLR(i.x - px) + "," + FLR(i.y - py) + ") ";
        });
        logAIEvent('STUCK_DUMP', dump);
        logAIEvent('ADV_START', 'vy:' + entity.vy.toFixed(1));
      }
    }
    let tP = null, mD = Infinity;
    for (let p of game.platforms) {
      if (!p.broken && !p.blacklisted && !entity.visitedHistory.includes(p) && p.y > py && p.y < py + config.gameHeight - 10 && p !== entity.lastPlatform) {
        let pC = p.x + (p.w || 16) / 2, dX = ABS(pC - px);
        if (dX > config.gameWidth / 2) dX = config.gameWidth - dX;
        let sc = dX + (p.y - py) * 2;
        if (sc < mD) { mD = sc; tP = p; }
      }
    }
    if (tP) {
      let tx = tP.x + (tP.w ? tP.w / 2 : 8);
      if (tP.type === 'h-slide') tx += tP.direction * 20;
      let dx = tx - px;
      if (dx > config.gameWidth / 2) dx -= config.gameWidth;
      else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
      entity.inputDir = dx > 4 ? 1 : (dx < -4 ? -1 : 0);
    } else {
      entity.inputDir = (px < 40) ? 1 : (px > config.gameWidth - 40) ? -1 : (entity.facingRight ? 1 : -1);
    }
    return;
  }
    
  let needsRecalc = false;
  if (entity.aiPath.length === 0) {
    needsRecalc = true;
  } else {
    let target = entity.aiPath[0];
    if (target.broken || target.y > py + config.gameHeight + 100 || target.blacklisted) needsRecalc = true;
    if (entity.vy > 0 && py > target.y + 20) needsRecalc = true;
    if (entity.vy < 0 && py < target.y - 100) needsRecalc = true;
  }
    
  let hasSuperTarget = entity.aiPath.length > 0 && (entity.aiPath[0].type === 'super' || entity.aiPath[0].isGlowing || entity.aiPath[0].collected !== undefined);
    
  if (entity.vy < 0) {
    entity.apexRecalculated = false;
  } else if (entity.vy >= 0 && !entity.apexRecalculated) {
    if (!hasSuperTarget) needsRecalc = true;
    entity.apexRecalculated = true;
  }
    
  if (needsRecalc) {
    let validNodes = [];
    game.platforms.forEach(function(p) {
      if (!p.broken && !p.isGround && !p.blacklisted && p.y < py + config.gameHeight && p.y > py - 600) validNodes.push(p);
    });
    game.items.forEach(function(i) {
      if (!i.collected && !i.blacklisted && i.y < py + config.gameHeight && i.y > py - 600) validNodes.push(i);
    });
      
    let firstMoves = [];
    let peakY = py;
    if (entity.vy < 0) peakY = py - (entity.vy * entity.vy) / (2 * config.jumpGravity);
      
    for (let n of validNodes) {
      let isSup = (n.type === 'super' || n.isGlowing || n.collected !== undefined);
      let minReqY = isSup ? peakY - 30 : peakY + 14;
      if (n.y >= minReqY && n.y <= py + 300) firstMoves.push(n);
    }
      
    let allPaths = [];
    let searchDepth = (validNodes.length < 8 || entity.stagnationTimer > 80) ? 4 : 2;
      
    for (let fm of firstMoves) {
      searchPaths(fm, validNodes, searchDepth, [], allPaths);
    }
      
    let bestPath = null;
    let bestScore = -Infinity;
    for (let path of allPaths) {
      let score = evaluatePath(path, entity);
      if (score > bestScore) {
        bestScore = score;
        bestPath = path;
      }
    }
    entity.aiPath = bestPath || [];
  }
    
  if (entity.aiPath.length > 0) {
    let target = entity.aiPath[0];
    let tx = target.x + (target.w ? target.w / 2 : 8);
    if (target.type === 'h-slide') tx += target.direction * (ABS(target.y - py) / 2.5);
      
    let isSupTgt = (target.type === 'super' || target.isGlowing || target.collected !== undefined);
      
    if (target.y > py + 20 && entity.lastPlatform && !entity.isSuperJumping && py < entity.lastPlatform.y + 20 && py > entity.lastPlatform.y - 80 && !isSupTgt) {
      let lp = entity.lastPlatform;
      let dL = ABS(px - lp.x), dR = ABS(px - (lp.x + lp.w));
      tx = (dL < dR) ? lp.x - 12 : lp.x + lp.w + 12;
    } else if (entity.lastPlatform && target.y > entity.lastPlatform.y + 10 && entity.stagnationTimer > 30 && py < entity.lastPlatform.y + 16 && py > entity.lastPlatform.y - 60 && entity.lastPlatform.type !== 'super' && entity.vy >= 9) {
      let lpC = entity.lastPlatform.x + (entity.lastPlatform.w / 2);
      let dist = px - lpC;
      if (dist > config.gameWidth / 2) dist -= config.gameWidth;
      else if (dist < -config.gameWidth / 2) dist += config.gameWidth;
      tx += (dist >= 0 ? 1 : -1) * MIN((entity.stagnationTimer - 30) * 2, 80);
    }
      
    let dx = tx - px;
    if (dx > config.gameWidth / 2) dx -= config.gameWidth;
    else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
      
    let avoiding = false;
    if (entity.vy > 0 && target.y > py + 20 && target.collected === undefined) {
      let hObs = null, oY = Infinity;
      for (let p of game.platforms) {
        if (!p.broken && p !== target && p.y > py + 10 && p.y < target.y - 10) {
          let pC = p.x + (p.w || 16) / 2;
          let dXP = px - pC;
          if (dXP > config.gameWidth / 2) dXP -= config.gameWidth;
          else if (dXP < -config.gameWidth / 2) dXP += config.gameWidth;
          let halfW = (p.w || 16) / 2 + 10;
          if (ABS(dXP) < halfW) {
            if (p.y < oY) {
              oY = p.y;
              hObs = p;
            }
          }
        }
      }
      if (hObs) {
        let pC = hObs.x + (hObs.w || 16) / 2;
        let dXP = px - pC;
        if (dXP > config.gameWidth / 2) dXP -= config.gameWidth;
        else if (dXP < -config.gameWidth / 2) dXP += config.gameWidth;
        entity.inputDir = dXP >= 0 ? 1 : -1;
        avoiding = true;
      }
    }
      
    if (!avoiding) {
      if (dx > 4) entity.inputDir = 1;
      else if (dx < -4) entity.inputDir = -1;
      else entity.inputDir = 0;
    }
  } else {
    let tDir = 0, fTgt = false;
    if (entity.vy > 0) {
      let tgt = null, bD = Infinity;
      for (let p of game.platforms) {
        if (!p.broken && !p.isGround && !p.blacklisted && p.y > py && p.y < py + config.gameHeight - 20) {
          let pxC = p.x + (p.w || 16) / 2, dX = ABS(pxC - px);
          if (dX > config.gameWidth / 2) dX = config.gameWidth - dX;
          let s = (p.y - py) + dX * 3;
          if (s < bD) { bD = s; tgt = p; }
        }
      }
      if (tgt) {
        fTgt = true;
        let tx = tgt.x + (tgt.w || 16) / 2, dX = tx - px;
        if (dX > config.gameWidth / 2) dX -= config.gameWidth;
        else if (dX < -config.gameWidth / 2) dX += config.gameWidth;
        tDir = dX > 4 ? 1 : (dX < -4 ? -1 : 0);
      }
    }
    if (!fTgt && tDir === 0) tDir = entity.facingRight ? 1 : -1;
    entity.inputDir = tDir;
  }
}
