import { config } from './config.js';
import { FLR, SIN } from './utils.js';

class AirplaneBannerSystem {
  x: number = 0;
  y: number = 62; // タイトルロゴ(y=95)の上の空
  speed: number = 0.55;
  flapFrame: number = 0;
  flapTimer: number = 0;
  waveTimer: number = 0;
  text: string = '2026 VILNIUS';

  // 横断幕描画用オフスクリーンキャンバス
  private offCanvas: HTMLCanvasElement | null = null;
  private offCtx: CanvasRenderingContext2D | null = null;
  private fontLoaded: boolean = false;

  constructor() {
    this.reset();
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        this.fontLoaded = true;
        this.updateOffscreenBanner();
      });
    }
  }

  reset() {
    // 画面右外からスタート
    this.x = config.gameWidth + 30;
    this.y = 62;
    this.flapFrame = 0;
    this.flapTimer = 0;
    this.waveTimer = 0;
  }

  private updateOffscreenBanner() {
    const w = 120;
    const h = 15;
    if (!this.offCanvas) {
      this.offCanvas = document.createElement('canvas');
      this.offCanvas.width = w;
      this.offCanvas.height = h;
      this.offCtx = this.offCanvas.getContext('2d');
    }
    if (this.offCtx) {
      // 純白背景
      this.offCtx.fillStyle = '#ffffff';
      this.offCtx.fillRect(0, 0, w, h);

      // 黒文字
      this.offCtx.fillStyle = '#000000';
      this.offCtx.font = '8px "Press Start 2P", monospace';
      this.offCtx.textAlign = 'center';
      this.offCtx.textBaseline = 'middle';
      this.offCtx.fillText(this.text, w / 2, h / 2 + 1);
    }
  }

  update(game: any, isAttractMode: boolean) {
    if (game && game.isPaused) {
      return;
    }

    // プレイ中で、かつプレイヤーが高く登りすぎてカメラがコウノトリの位置(y=62)に戻らなくなった場合は更新・表示を終了
    if (game && !isAttractMode) {
      const recScreens = config.recoveryScreens ?? 1;
      const maxReturnCamY = (game.highestCameraY ?? 0) + config.gameHeight * recScreens;
      if (maxReturnCamY < -180) {
        return;
      }
    }

    // 右から左へ移動
    this.x -= this.speed;

    // 羽ばたきアニメーション (ゆっくりパタパタ)
    this.flapTimer++;
    if (this.flapTimer >= 8) {
      this.flapTimer = 0;
      this.flapFrame = (this.flapFrame + 1) % 4;
    }

    // 横断幕の上下ウェーブ用タイマー
    this.waveTimer += 0.08;

    // 全体（コウノトリ＋ロープ＋横断幕）が左外に出たらすぐに右から再登場
    if (this.x < -150) {
      this.x = config.gameWidth + 30;
    }
  }

  draw(ctx: CanvasRenderingContext2D, game?: any, isAttractMode?: boolean) {
    // プレイ中で、かつカメラがコウノトリの位置に戻らなくなった場合は描画スキップ
    if (game && !isAttractMode) {
      const recScreens = config.recoveryScreens ?? 1;
      const maxReturnCamY = (game.highestCameraY ?? 0) + config.gameHeight * recScreens;
      if (maxReturnCamY < -180) {
        return;
      }
    }

    // 画面外の場合は描画スキップ
    if (this.x < -160 || this.x > config.gameWidth + 60) {
      return;
    }

    ctx.save();

    const storkX = FLR(this.x);
    const storkY = FLR(this.y);

    const bannerX = storkX + 28;
    const bannerY = storkY - 2;
    const bannerW = 120;
    const bannerH = 15;

    // オフスクリーンキャンバスの初期化（初回のみ、またはフォント読み込み完了時）
    if (!this.offCanvas) {
      this.updateOffscreenBanner();
    }
    if (!this.fontLoaded && typeof document !== 'undefined' && document.fonts) {
      if (document.fonts.check('8px "Press Start 2P"')) {
        this.fontLoaded = true;
        this.updateOffscreenBanner();
      }
    }

    // 1. 横断幕の細分割はためき (6px刻みのなめらかな波打ち)
    const sliceWidth = 6;
    const slices = Math.ceil(bannerW / sliceWidth);
    const waveY0 = FLR(SIN(this.waveTimer) * 1.5); // 先端ブロックの波オフセット

    // ロープ描画 (コウノトリの脚/尾付近 -> 横断幕先頭ブロック)
    const ropeStartX = storkX + 17;
    const ropeStartY1 = storkY + 4;
    const ropeStartY2 = storkY + 8;

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;

    // 上ロープ
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY1);
    ctx.lineTo(bannerX, bannerY + waveY0 + 3);
    ctx.stroke();

    // 下ロープ
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY2);
    ctx.lineTo(bannerX, bannerY + waveY0 + bannerH - 3);
    ctx.stroke();

    // 2. 横断幕 (Banner) の波打ち描画
    if (this.offCanvas) {
      for (let i = 0; i < slices; i++) {
        const sx = i * sliceWidth;
        const sw = Math.min(sliceWidth, bannerW - sx);
        const waveY = FLR(SIN(this.waveTimer - i * 0.35) * 1.5);

        const dx = bannerX + sx;
        const dy = bannerY + waveY;

        ctx.drawImage(this.offCanvas, sx, 0, sw, bannerH, dx, dy, sw, bannerH);
      }
    }

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
