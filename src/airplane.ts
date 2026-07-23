import { config } from './config.js';
import { FLR } from './utils.js';

class AirplaneBannerSystem {
  x: number = 0;
  y: number = 62; // タイトルロゴ(y=95)の上の空
  speed: number = 0.55;
  flapFrame: number = 0;
  flapTimer: number = 0;
  respawnTimer: number = 0;
  text: string = '2026 VILNIUS';

  constructor() {
    this.reset();
  }

  reset() {
    // 画面右外からスタート
    this.x = config.gameWidth + 30;
    this.y = 62;
    this.flapFrame = 0;
    this.flapTimer = 0;
    this.respawnTimer = 0;
  }

  update(game: any, isAttractMode: boolean) {
    const isTitleOrIntro = isAttractMode || game.state === 'intro' || (game.state as any) === 'intro_anim';
    if (!isTitleOrIntro) {
      return;
    }

    if (this.respawnTimer > 0) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.x = config.gameWidth + 40;
      }
      return;
    }

    // 右から左へ移動
    this.x -= this.speed;

    // 羽ばたきアニメーション (ゆっくりパタパタ)
    this.flapTimer++;
    if (this.flapTimer >= 8) {
      this.flapTimer = 0;
      this.flapFrame = (this.flapFrame + 1) % 4;
    }

    // 全体（コウノトリ＋ロープ＋横断幕）が左外に出たか判定
    if (this.x < -150) {
      this.respawnTimer = 90; // 約1.5秒後に再登場
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // 画面外の場合は描画スキップ
    if (this.x < -160 || this.x > config.gameWidth + 60 || this.respawnTimer > 0) {
      return;
    }

    ctx.save();

    const storkX = FLR(this.x);
    const storkY = FLR(this.y);

    const bannerX = storkX + 28;
    const bannerY = storkY - 2;
    const bannerW = 116; // 左右に十分な余白を持たせた幅
    const bannerH = 15;

    // 1. ロープ描画 (コウノトリの脚/尾付近 -> 横断幕前部)
    const ropeStartX = storkX + 17;
    const ropeStartY1 = storkY + 4;
    const ropeStartY2 = storkY + 8;

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;

    // 上ロープ
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY1);
    ctx.lineTo(bannerX, bannerY + 3);
    ctx.stroke();

    // 下ロープ
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY2);
    ctx.lineTo(bannerX, bannerY + bannerH - 3);
    ctx.stroke();

    // 2. 横断幕 (Banner) 描画 - 上下揺れなし、枠なし白地＆黒文字
    ctx.save();

    // 背景（純白）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

    // シンプルな黒文字「2026 VILNIUS」
    ctx.fillStyle = '#000000';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, bannerX + bannerW / 2, bannerY + bannerH / 2 + 1);

    ctx.restore();

    // 3. コウノトリ (Stork) ドット絵描画（右から左へ飛行）
    // くちばし (長いオレンジ色)
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(storkX - 5, storkY + 4, 6, 2);

    // 頭 (白)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(storkX + 1, storkY + 2, 4, 4);

    // 目 (黒)
    ctx.fillStyle = '#000000';
    ctx.fillRect(storkX + 2, storkY + 3, 1, 1);

    // 首 & 胴体 (白)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(storkX + 4, storkY + 3, 3, 3);
    ctx.fillRect(storkX + 6, storkY + 3, 9, 5);

    // 尾羽 (黒)
    ctx.fillStyle = '#212121';
    ctx.fillRect(storkX + 14, storkY + 4, 3, 3);

    // 脚 (オレンジ/後ろに伸ばす)
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(storkX + 13, storkY + 7, 7, 2);

    // 翼 (Wing Flap Animation: 0=Up, 1=Level, 2=Down, 3=Level)
    if (this.flapFrame === 0) {
      // 上に大きく羽ばたき
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(storkX + 7, storkY - 5, 5, 8);
      ctx.fillStyle = '#212121'; // 黒い風切羽
      ctx.fillRect(storkX + 8, storkY - 8, 4, 3);
    } else if (this.flapFrame === 2) {
      // 下に羽ばたき
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(storkX + 7, storkY + 6, 5, 5);
      ctx.fillStyle = '#212121'; // 黒い風切羽
      ctx.fillRect(storkX + 8, storkY + 11, 4, 3);
    } else {
      // 水平
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(storkX + 5, storkY + 2, 8, 2);
      ctx.fillStyle = '#212121'; // 黒い風切羽
      ctx.fillRect(storkX + 12, storkY + 2, 4, 2);
    }

    ctx.restore();
  }
}

export const airplaneSystem = new AirplaneBannerSystem();
