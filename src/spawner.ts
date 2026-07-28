import { config, SCORE_THRESHOLDS } from './config.js';
import { getLevelConfig } from './level.js';
import { getPl, getCn, getIt, trySpawnBirdsOnPlatform, P_PL } from './entities/index.js';
import { RND, FLR, MAX, MIN, SIN, PI } from './utils.js';

let game;

export function initSpawner(gameInstance) {
  game = gameInstance;
}

export function spawnGuideCoins(sX, sY) {
  let clampedX = MAX(35, MIN(config.gameWidth - 35, sX));
  let shift = clampedX - sX;
  sX = clampedX;
  let tp = FLR(RND() * 3), top = sY;
  if (tp === 0) {
    for (let i = 0; i < 10; i++) game.coins.push(getCn(sX, sY - i * 72));
    top = sY - 9 * 72;
  } else if (tp === 1) {
    let d = RND() < 0.5 ? 1 : -1;
    for (let i = 0; i < 10; i++) {
      let cx = MAX(10, MIN(config.gameWidth - 22, sX + SIN(i * 0.15) * 75 * d));
      game.coins.push(getCn(cx, sY - i * 72));
      top = sY - 9 * 72;
    }
  } else {
    for (let i = 0; i < 10; i++) {
      game.coins.push(getCn(sX - 14, sY - i * 72));
      game.coins.push(getCn(sX + 14, sY - i * 72));
      top = sY - 9 * 72;
    }
  }
  game.lastCoinY = top;
  return shift;
}

export function spawnCoins(y) {
  let pR = config.coinSpawnProb;
  if (game.score >= SCORE_THRESHOLDS.METEOR_END && game.score <= SCORE_THRESHOLDS.DARK_PRE) pR = 0.8;
  if (RND() > pR) return;
  
  let tp = FLR(RND() * 3);
  if (game.score >= SCORE_THRESHOLDS.METEOR_END && game.score <= SCORE_THRESHOLDS.DARK_PRE) tp = RND() < 0.5 ? 1 : 2;
  
  let bw = 12, bh = 12;
  if (tp === 0) bh = 108;
  else if (tp === 1) { bw = 36; bh = 36; }
  else { bw = 132; bh = 72; }
  
  for (let a = 0; a < 5; a++) {
    let cx = 10 + RND() * (config.gameWidth - 20 - bw), cy = y - 100 - RND() * 100, ol = false;
    if (cy < 230 && cy > -1500) {
      let avoidW = 28, centerX = config.gameWidth / 2;
      if (cx + bw > centerX - avoidW && cx < centerX + avoidW) ol = true;
    }
    if (!ol) {
      for (let p of game.platforms) {
        if (p.broken) continue;
        let px = p.x, py = p.y, pw = p.w, ph = p.h;
        if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
        else if (p.type === 'v-slide') { py = p.startY - 50; ph = p.h + 100; }
        if (cx - 20 < px + pw && cx + bw + 20 > px && cy - 20 < py + ph && cy + bh + 20 > py) { ol = true; break; }
      }
    }
    if (!ol) {
      for (let i of game.items) {
        if (cx - 20 < i.x + i.w && cx + bw + 20 > i.x && cy - 20 < i.y + i.h && cy + bh + 20 > i.y) { ol = true; break; }
      }
    }
    if (!ol) {
      for (let c of game.coins) {
        if (cx - 20 < c.x + c.w && cx + bw + 20 > c.x && cy - 20 < c.y + c.h && cy + bh + 20 > c.y) { ol = true; break; }
      }
    }
    if (ol) continue;
    
    if (tp === 0) {
      for (let i = 0; i < 5; i++) game.coins.push(getCn(cx, cy + i * 24));
    } else if (tp === 1) {
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) game.coins.push(getCn(cx + i * 24, cy + j * 24));
      }
    } else {
      let d = cx > config.gameWidth / 2 ? -1 : 1;
      for (let i = 0; i < 5; i++) game.coins.push(getCn(MAX(0, MIN(config.gameWidth - 12, cx + i * 30 * d)), cy - SIN((i / 4) * PI) * 60 + 60));
    }
    game.lastCoinY = cy - bh;
    break;
  }
}

export function getSafetyLineY(): number {
  return 416 - (config.superJumpPower * config.superJumpPower) / (2 * config.jumpGravity) + 100;
}

export const MUSHROOM_FORBIDDEN_ZONE_HEIGHT = 260;
export const FIRST_GREEN_MUSHROOM_OFFSET = 128; // 8 blocks (~128px) above safety line

export function isInMushroomForbiddenZone(y: number, sNY: number = getSafetyLineY()): boolean {
  if (!game.equipped?.['mushroom']) return false;
  return y > (sNY - MUSHROOM_FORBIDDEN_ZONE_HEIGHT) && y < sNY;
}

export function adjustYForMushroomForbiddenZone(y: number, sNY: number = getSafetyLineY()): number {
  if (isInMushroomForbiddenZone(y, sNY)) {
    return sNY - MUSHROOM_FORBIDDEN_ZONE_HEIGHT;
  }
  return y;
}

export function getFirstGreenMushroomY(sNY: number = getSafetyLineY()): number {
  return sNY - FIRST_GREEN_MUSHROOM_OFFSET;
}

export function getHighestPlatform() {
  if (game.platforms.length === 0) return null;
  let lP = game.platforms[0];
  for (let i = 1; i < game.platforms.length; i++) {
    if (game.platforms[i].y < lP.y) {
      lP = game.platforms[i];
    }
  }
  return lP;
}

export function spawnPlatform() {
  let lP = getHighestPlatform();
  if (lP && lP.type === 'goal') return;
  
  let gap = 50 + RND() * (MIN(80, 50 + game.score / 100) - 50);
  if (lP && lP.count > 1) gap += 30;
  if (lP && lP.type === 'super') gap += 80;
  let y = lP.y - gap;
  
  let sNY = getSafetyLineY();
  y = adjustYForMushroomForbiddenZone(y, sNY);
  
  if (y <= game.goalY + 170) {
    game.platforms.push(getPl(game.goalY + 170, 'normal', false, null, null, null, 1, true));
    game.platforms.push(getPl(game.goalY + 85, 'normal', false, null, null, null, 1, true));
    game.platforms.push(getPl(game.goalY, 'goal', false, 0, config.gameWidth, 32));
    return;
  }
  
  let spS = (game.baseScoreY - y) * config.scoreMultiplier;
  let lc = getLevelConfig(spS, RND, MAX, FLR);
  let t = lc.t;
  let np = getPl(y, t, false, null, null, null, lc.c, lc.icy);
  game.platforms.push(np);
  
  let genSub = lc.genSub;
  if (genSub) {
    let np2 = getPl(y, lc.subT, false, null, null, null, lc.subC, lc.subIcy);
    if (np2.isOverlapping) {
      P_PL.push(np2);
    } else {
      game.platforms.push(np2);
      trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
    }
  }
  
  let hasM = false, mx = 0, my = 0;
  const isMushroomEquipped = !(!game.equipped?.['mushroom']);
  let greenCount = game.greenMushroomCount || 0;
  if (isMushroomEquipped && greenCount < 18) {
    let firstGreenY = getFirstGreenMushroomY(sNY);
    // Step-wise intervals: 3 mushrooms per set, reducing interval by ~200px each step for smooth and gradual acceleration
    let targetInterval = 1580; // 1st Set (0-2): standard tight timing
    if (greenCount >= 3 && greenCount < 6) {
      targetInterval = 1380;   // 2nd Set (3-5)
    } else if (greenCount >= 6 && greenCount < 9) {
      targetInterval = 1180;   // 3rd Set (6-8)
    } else if (greenCount >= 9 && greenCount < 12) {
      targetInterval = 980;    // 4th Set (9-11)
    } else if (greenCount >= 12 && greenCount < 15) {
      targetInterval = 780;    // 5th Set (12-14)
    } else if (greenCount >= 15 && greenCount < 17) {
      targetInterval = 580;    // 6th Set
    } else if (greenCount >= 17) {
      targetInterval = 345;    // Final mushroom (index 17) at 75000m (+345px = +1380 score from 73620)
    }
    let itemX = config.gameWidth / 2 - 8;
    if (game.lastGreenMushroomY === null || game.lastGreenMushroomY === undefined) {
      if (y <= firstGreenY) {
        let it = getIt(firstGreenY - 2, 'green', itemX);
        game.items.push(it);
        game.lastGreenMushroomY = firstGreenY;
        game.greenMushroomCount = 1;
        hasM = true;
        mx = it.x;
        my = it.y;
      }
    } else if (y <= game.lastGreenMushroomY - targetInterval) {
      let greenY = game.lastGreenMushroomY - targetInterval;
      let it = getIt(greenY, 'green', itemX);
      game.items.push(it);
      game.lastGreenMushroomY = greenY;
      game.greenMushroomCount = greenCount + 1;
      hasM = true;
      mx = it.x;
      my = it.y;
    }
  } else {
    // If mushroom is equipped, do not spawn red mushrooms below 75000m. Above 75000m spawn normally.
    const allowRedMushroom = !isMushroomEquipped || spS > SCORE_THRESHOLDS.MUSHROOM_MAX;
    if (allowRedMushroom && config.itemsEnabled && game.score >= config.mushroomMinScore && spS < SCORE_THRESHOLDS.METEOR_END && RND() < config.mushroomSpawnProb) {
      let it = getIt(y - 50 - RND() * 150, 'red');
      game.items.push(it);
      hasM = true;
      mx = it.x;
      my = it.y;
    }
  }
  
  let sc = false, cD = (game.score >= SCORE_THRESHOLDS.METEOR_END && game.score <= SCORE_THRESHOLDS.DARK_PRE) ? 0.3 : config.coinMinDistance;
  if (y - 300 < game.lastCoinY - config.gameHeight * cD) {
    if (t === 'super' && RND() < 0.5) {
      let shift = spawnGuideCoins(np.x + np.w / 2 - 6, y - 60);
      np.x += shift;
      np.startX = np.x;
      sc = true;
    } else if (hasM && RND() < 0.5) {
      let shift = spawnGuideCoins(mx + 2, my - 60);
      if (game.items.length > 0) {
        game.items[game.items.length - 1].x += shift;
      }
      sc = true;
    }
    if (!sc) spawnCoins(y);
  }
  trySpawnBirdsOnPlatform(np, spS);
}
