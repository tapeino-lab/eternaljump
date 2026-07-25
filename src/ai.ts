import { config } from './config.js';
import { game } from './state.js';
import { ABS } from './utils.js';

export function runAI(entity: any) {
  let px = entity.x + entity.w / 2;
  let basePy = entity.y + (entity.h || 16);

  // 1. イントロ状態の単純な立ち回り
  let isIntroState = (entity.isNPC && entity.isIntro) || (entity === game.player && game.state === 'intro');
  if (isIntroState) {
    if (px < 100) entity.inputDir = 1;
    else if (px > 124) entity.inputDir = -1;
    else entity.inputDir = 0;
    return;
  }

  // 2. 隕石回避（パワーアップ中または高速移動時）
  if (entity.isPoweredUp || entity.vy < -10) {
    for (let m of game.meteors) {
      if (!m.hit && m.y < basePy + 40 && m.y > basePy - 100) {
        let mX = m.x + m.w / 2;
        let dx = mX - px;
        if (dx > config.gameWidth / 2) dx -= config.gameWidth;
        else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

        if (ABS(dx) < 24) {
          entity.inputDir = dx > 0 ? -1 : 1;
          return;
        }
      }
    }
  }

  // 3. ターゲットの決定（定期更新またはターゲット喪失時）
  let currentTarget = entity.aiPath && entity.aiPath.length > 0 ? entity.aiPath[0] : null;

  // 既存ターゲットが無効化されたかチェック
  let isValid = currentTarget &&
    !currentTarget.broken &&
    !currentTarget.blacklisted &&
    (currentTarget.collected === undefined || !currentTarget.collected) &&
    currentTarget.y < basePy + config.gameHeight;

  if (!isValid) {
    currentTarget = null;
    entity.aiPath = [];
  }

  // ターゲットの再選択（ターゲットがない場合、または着地・頂点通過時）
  if (!currentTarget || entity.vy >= 0) {
    let bestNode = null;
    let bestScore = -Infinity;

    let jumpPower = Math.abs(config.jumpPower);
    if (entity.isPoweredUp) jumpPower *= config.powerJumpMultiplier;
    let maxJumpH = (jumpPower * jumpPower) / (2 * (config.jumpGravity || 0.15));

    // 候補ノード（足場 ＋ コイン/アイテム）
    let candidates: any[] = [];
    game.platforms.forEach((p: any) => {
      if (!p.broken && !p.isGround && !p.blacklisted) {
        candidates.push(p);
      }
    });
    game.items.forEach((i: any) => {
      if (!i.collected && !i.blacklisted) {
        candidates.push(i);
      }
    });

    for (let node of candidates) {
      let nodeX = node.x + (node.w || 16) / 2;
      let dx = ABS(px - nodeX);
      if (dx > config.gameWidth / 2) dx = config.gameWidth - dx;

      let dy = basePy - node.y; // 正なら node はキャラクターより上にある

      // 1. 下降中 (vy >= 0) は自分より上 (dy > 4) にあるノードには絶対に届かないので除外
      if (entity.vy >= 0 && dy > 4) continue;

      // 2. 到達可能な範囲の絞り込み（上昇力と下限高さのみ制限。横幅は画面全体を対象とする）
      if (dy > maxJumpH + 20 || dy < -280) continue;

      let score = 0;

      if (dy > 0) {
        // 上にあるターゲット（上昇中・跳び上がり）
        score += dy * 3.5;
        if (node.type === 'super' || node.isGlowing) score += 500;
        if (node.collected !== undefined) score += 200;
      } else {
        // 下にあるターゲット（落下受け止め）
        let absDy = Math.abs(dy); // 落下距離
        score += 400 - absDy * 1.5;

        if (node.type === 'super' || node.isGlowing) score += 600; // ジャンプ台・スーパー台
        if (node.collected !== undefined) score += 150;
      }

      // 横距離のペナルティは軽微にし、横にある足場を積極的にターゲット化
      score -= dx * 0.4;

      // 【ループ徹底排除】直近踏んだ足場履歴（直近4個）に応じたペナルティ
      let history = entity.visitedHistory || entity.recentPlatforms || [];
      if (history.length > 0) {
        // 配列の最後（末尾）が最新の足場
        let lastIdx = history.length - 1;
        let pIdx = history.lastIndexOf(node);
        if (pIdx !== -1) {
          let recency = lastIdx - pIdx; // 0なら最も直前に踏んだ足場
          let penalties = [4000, 2500, 1500, 800];
          score -= penalties[recency] || 500;
        }
      } else if (entity.lastPlatform === node) {
        score -= 3000;
      }

      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }

    if (bestNode) {
      currentTarget = bestNode;
      entity.aiPath = [bestNode];
    }
  }

  // 4. ターゲットに向けた移動制御
  if (currentTarget) {
    let tx = currentTarget.x + (currentTarget.w ? currentTarget.w / 2 : 8);

    // 移動床の場合の予測制御
    if (currentTarget.type === 'h-slide' && currentTarget.direction) {
      tx += currentTarget.direction * 15;
    }

    let dx = tx - px;
    if (dx > config.gameWidth / 2) dx -= config.gameWidth;
    else if (dx < -config.gameWidth / 2) dx += config.gameWidth;

    if (dx > 2) {
      entity.inputDir = 1;
    } else if (dx < -2) {
      entity.inputDir = -1;
    } else {
      entity.inputDir = 0;
    }
  } else {
    // ターゲットが見つからない場合のフォールバック（向いている方向へ移動）
    entity.inputDir = entity.facingRight ? 1 : -1;
  }
}
