import { config } from './config.js';
import { FLR, RND, PI } from './utils.js';

export interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  secondColor: string;
  type: 'burst' | 'double' | 'willow' | 'ring' | 'peony' | 'wabika' | 'kiku' | 'senrin';
}

export interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  secondColor?: string;
  colorShiftTimer?: number;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  sparkle: boolean;
}

export interface FireworkFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

const COLOR_PALETTES = [
  ['#ff3366', '#ffd700'], // ピンク & ゴールド
  ['#00f0ff', '#ffffff'], // シアン & ホワイト
  ['#ffd700', '#ff6b08'], // ゴールド & オレンジ
  ['#00ff66', '#00f0ff'], // ネオングリーン & シアン
  ['#ff00ff', '#9d4edd'], // マゼンタ & パープル
  ['#ffffff', '#ffd700'], // シルバー & ゴールド
  // 日本の伝統和色パレット
  ['#e64a19', '#ffb300'], // 和朱（わしゅ）& 黄金（こがね）
  ['#00b8d4', '#ccff90'], // 浅葱（あさぎ）& 萌黄（もえぎ）
  ['#aa00ff', '#ff80ab'], // 江戸紫（えどむらさき）& 紅（べに）
  ['#ff6d00', '#ffd54f'], // 金茶（きんちゃ）& 黄丹（おうに）
];

class FireworksSystem {
  rockets: FireworkRocket[] = [];
  sparks: FireworkSpark[] = [];
  flashes: FireworkFlash[] = [];
  spawnTimer: number = 0;

  reset() {
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.spawnTimer = 0;
  }

  /**
   * 花火ロケットを打ち上げる
   */
  launch(x?: number, targetY?: number) {
    // 中央の穴（x=96〜128）とその左右1ブロック（16pxずつ、即ち x=80〜144）を除外
    let startX: number;
    if (x !== undefined) {
      startX = x;
    } else {
      if (RND() < 0.5) {
        startX = 16 + RND() * 64;  // 左エリア: 16 〜 80
      } else {
        startX = 144 + RND() * 64; // 右エリア: 144 〜 208
      }
    }
    const destY = targetY ?? (25 + RND() * 130);
    const palette = COLOR_PALETTES[FLR(RND() * COLOR_PALETTES.length)];
    const types: Array<'burst' | 'double' | 'willow' | 'ring' | 'peony' | 'wabika' | 'kiku' | 'senrin'> = [
      'burst', 'double', 'willow', 'ring', 'peony', 'wabika', 'kiku', 'senrin'
    ];
    const type = types[FLR(RND() * types.length)];

    // 打ち上げ開始位置（地面近く）
    const startY = 240;
    const dist = Math.max(20, startY - destY);
    // 重力 0.14 で到達高度 destY にぴったり合わせる初速 vy
    const vy = -Math.sqrt(2 * 0.14 * dist);

    this.rockets.push({
      x: startX,
      y: startY,
      vx: (RND() - 0.5) * 0.5,
      vy: vy,
      targetY: destY,
      color: palette[0],
      secondColor: palette[1],
      type: type,
    });
  }

  /**
   * 更新処理
   * @param game ゲーム状態オブジェクト
   * @param isAttractMode アトラクトモードかどうか
   */
  update(game: any, isAttractMode: boolean) {
    if (game && game.isPaused) {
      return;
    }

    let allowSpawn = isAttractMode;
    if (!isAttractMode && game) {
      const recScreens = config.recoveryScreens ?? 1;
      const maxReturnCamY = (game.highestCameraY ?? 0) + config.gameHeight * recScreens;
      // カメラが地上・花火高度に戻れる範囲(maxReturnCamY >= -200)であれば打ち上げを継続
      if (maxReturnCamY >= -200) {
        allowSpawn = true;
      }
    }

    // スポーン処理
    if (allowSpawn) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        // 1〜2発同時に打ち上げる
        const count = RND() < 0.35 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.launch();
        }
        // 次の打ち上げまでのインターバル (18〜38フレーム ＝ 約0.3〜0.6秒)
        this.spawnTimer = 18 + FLR(RND() * 20);
      }
    }

    // 1. ロケットの更新
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.14; // 上昇に伴う減速重力

      // 尻尾の火花 (Trail)
      if (RND() < 0.8) {
        this.sparks.push({
          x: r.x + (RND() - 0.5) * 1.5,
          y: r.y + 3,
          vx: (RND() - 0.5) * 0.3,
          vy: RND() * 1.2 + 0.3,
          color: r.type === 'wabika' ? '#ff9800' : '#ffea88',
          size: 1.2 + RND() * 1.2,
          alpha: 0.9,
          decay: 0.06 + RND() * 0.04,
          gravity: 0.04,
          sparkle: false,
        });
      }

      // 目標高度到達、または減速で爆発
      if (r.y <= r.targetY || r.vy >= -0.2) {
        this.explode(r);
        this.rockets.splice(i, 1);
      }
    }

    // 2. 爆発フラッシュの更新
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.radius += (f.maxRadius - f.radius) * 0.35;
      f.alpha -= 0.12;
      if (f.alpha <= 0) {
        this.flashes.splice(i, 1);
      }
    }

    // 3. 火花粒子の更新
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      s.vy += s.gravity;
      s.alpha -= s.decay;

      // 変化菊などの色変え処理
      if (s.colorShiftTimer !== undefined && s.colorShiftTimer > 0) {
        s.colorShiftTimer--;
        if (s.colorShiftTimer === 0 && s.secondColor) {
          s.color = s.secondColor;
        }
      }

      if (s.alpha <= 0 || s.y > config.gameHeight + 250 || s.y < -350) {
        this.sparks.splice(i, 1);
      }
    }

    // 古いスマホ・低スペック端末向け粒子数制限（最大220個に抑制）
    if (this.sparks.length > 220) {
      this.sparks.splice(0, this.sparks.length - 220);
    }
  }

  /**
   * ロケット爆発（開花）
   */
  explode(r: FireworkRocket) {
    // 爆発の瞬間の中央フラッシュ
    this.flashes.push({
      x: r.x,
      y: r.y,
      radius: 3,
      maxRadius: r.type === 'senrin' ? 14 : 26,
      color: r.type === 'wabika' ? '#ffaa00' : '#ffffff',
      alpha: 0.95,
    });

    if (r.type === 'senrin') {
      // 千輪（せんりん）：中央から広がる多数の小花火塊
      const petalCount = 7;
      for (let p = 0; p < petalCount; p++) {
        const pAngle = (p / petalCount) * PI * 2 + (RND() - 0.5) * 0.2;
        const pDist = 8 + RND() * 12;
        const cx = r.x + Math.cos(pAngle) * pDist;
        const cy = r.y + Math.sin(pAngle) * pDist;
        const pColor = COLOR_PALETTES[FLR(RND() * COLOR_PALETTES.length)][0];

        // 各小花火の爆発フラッシュ
        this.flashes.push({
          x: cx,
          y: cy,
          radius: 2,
          maxRadius: 10,
          color: pColor,
          alpha: 0.9,
        });

        const subCount = 10;
        for (let i = 0; i < subCount; i++) {
          const angle = (i / subCount) * PI * 2;
          const speed = 0.8 + RND() * 0.8;
          this.sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: pColor,
            size: 1.8,
            alpha: 1.0,
            decay: 0.035 + RND() * 0.02,
            gravity: 0.02,
            sparkle: true,
          });
        }
      }
      return;
    }

    const sparkCount = (r.type === 'double' || r.type === 'kiku') ? 42 : (r.type === 'willow' ? 36 : (r.type === 'wabika' ? 28 : 30));

    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * PI * 2 + (RND() - 0.5) * 0.12;
      let speed = 1.6 + RND() * 1.6;
      let color = r.color;
      let secondColor: string | undefined = undefined;
      let colorShiftTimer: number | undefined = undefined;
      let decay = 0.018 + RND() * 0.015;
      let gravity = 0.03 + RND() * 0.02;
      let sparkle = RND() < 0.45;
      let size = 2.0 + RND() * 1.2;

      if (r.type === 'wabika') {
        // 和火（わび）：あたたかい橙金色の尾を引き重力で垂れる
        color = RND() < 0.7 ? '#ff6d00' : '#ffb300';
        speed = 0.9 + RND() * 1.2;
        decay = 0.012 + RND() * 0.01;
        gravity = 0.06;
        size = 2.2;
        sparkle = RND() < 0.3;
      } else if (r.type === 'kiku') {
        // 変色菊：きれいな正円状に伸び、途中で二色目に変化する
        speed = 1.8;
        color = r.color;
        secondColor = r.secondColor;
        colorShiftTimer = 12 + FLR(RND() * 8); // 12〜20フレーム後に変色
        decay = 0.016;
        size = 2.0;
        sparkle = true;
      } else if (r.type === 'double') {
        if (i % 2 === 0) {
          speed *= 0.55;
          color = r.secondColor;
        }
      } else if (r.type === 'willow') {
        decay = 0.009 + RND() * 0.006; // しだれ（長持ち）
        gravity = 0.05 + RND() * 0.03; // 重力で流れる
        color = RND() < 0.6 ? '#ffd700' : '#ffffff';
        size = 1.8;
      } else if (r.type === 'ring') {
        speed = 2.1;
        decay = 0.022;
        color = (i % 2 === 0) ? r.color : r.secondColor;
      } else if (r.type === 'peony') {
        sparkle = true;
        speed = 1.2 + RND() * 1.8;
      }

      this.sparks.push({
        x: r.x,
        y: r.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        secondColor: secondColor,
        colorShiftTimer: colorShiftTimer,
        size: size,
        alpha: 1.0,
        decay: decay,
        gravity: gravity,
        sparkle: sparkle,
      });
    }
  }

  /**
   * 描画処理
   */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. 爆発フラッシュ描画 (レトロな四角いフラッシュ)
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      const screenY = FLR(f.y);
      const size = FLR(f.radius * 1.8);
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.fillStyle = f.color;
      ctx.fillRect(FLR(f.x - size / 2), FLR(screenY - size / 2), size, size);
    }

    // 2. ロケット描画 (レトロなドット弾)
    for (let i = 0; i < this.rockets.length; i++) {
      const r = this.rockets[i];
      const screenY = FLR(r.y);

      // 外側の枠
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = r.color;
      ctx.fillRect(FLR(r.x - 2), FLR(screenY - 2), 4, 4);

      // 内側の白い芯
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(FLR(r.x - 1), FLR(screenY - 1), 2, 2);
    }

    // 3. 火花粒子描画 (レトロドット)
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const screenY = FLR(s.y);
      if (screenY < -50 || screenY > config.gameHeight + 200) continue;

      let alpha = s.alpha;
      let color = s.color;

      // きらきら点滅 (Sparkle)
      if (s.sparkle && RND() < 0.35) {
        color = '#ffffff';
        alpha = Math.min(1.0, alpha + 0.4);
      }

      const px = FLR(s.x);
      const py = screenY;
      const sz = Math.max(1, FLR(s.size * 1.2));

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, sz, sz);
    }

    ctx.restore();
  }
}

export const fireworksSystem = new FireworksSystem();
