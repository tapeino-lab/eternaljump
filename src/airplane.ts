import type { GameState } from "./types.js";
import { config } from './config.js';
import { FLR, SIN } from './utils.js';

class AirplaneBannerSystem {
  x: number = 0;
  y: number = 70; // Sky area above title logo (y=95)
  speed: number = 0.55;
  flapFrame: number = 0;
  flapTimer: number = 0;
  waveTimer: number = 0;
  text: string = '2026 VILNIUS';

  // Offscreen canvas for banner rendering
  private offCanvas: HTMLCanvasElement | null = null;
  private offCtx: CanvasRenderingContext2D | null = null;
  private updateTimer: number = 0;
  private fontLoaded: boolean = false;

  constructor() {
    this.reset();
    if (typeof document !== 'undefined' && document.fonts) {
      if (document.fonts.ready) {
        document.fonts.ready.then(() => {
          this.fontLoaded = true;
          this.updateOffscreenBanner();
        });
      }
      if (document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', () => {
          this.fontLoaded = true;
          this.updateOffscreenBanner();
        });
      }
      // Proactively trigger loading of Press Start 2P
      if (document.fonts.load) {
        document.fonts.load('8px "Press Start 2P"').then(() => {
          this.fontLoaded = true;
          this.updateOffscreenBanner();
        }).catch(() => {});
      }
    }
  }

  reset() {
    // Start offscreen to the right
    this.x = config.gameWidth + 30;
    this.y = 70;
    this.flapFrame = 0;
    this.flapTimer = 0;
    this.waveTimer = 0;
    this.updateTimer = 0;
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
      this.offCtx.imageSmoothingEnabled = false;

      // Check if font is loaded
      if (typeof document !== 'undefined' && document.fonts && document.fonts.check) {
        if (document.fonts.check('8px "Press Start 2P"')) {
          this.fontLoaded = true;
        }
      }

      // White background
      this.offCtx.fillStyle = '#ffffff';
      this.offCtx.fillRect(0, 0, w, h);

      this.offCtx.font = '8px "Press Start 2P", monospace';
      this.offCtx.textAlign = 'left';
      this.offCtx.textBaseline = 'middle';

      const part1 = '2026';
      const space = ' ';
      const part2 = 'VILNIUS';
      const fullText = part1 + space + part2;

      const totalW = Math.round(this.offCtx.measureText(fullText).width);
      const startX = Math.round((w - totalW) / 2);
      const part1W = Math.round(this.offCtx.measureText(part1 + space).width);
      const textY = Math.round(h / 2) + 1;

      // 2026: #0E6FA4 (Bold text by 1px offset without blurring)
      this.offCtx.fillStyle = '#0E6FA4';
      this.offCtx.fillText(part1, startX, textY);
      this.offCtx.fillText(part1, startX + 1, textY);

      // VILNIUS: #80B740 (Bold text by 1px offset without blurring)
      this.offCtx.fillStyle = '#80B740';
      this.offCtx.fillText(part2, startX + part1W, textY);
      this.offCtx.fillText(part2, startX + part1W + 1, textY);
    }
  }

  update(game: GameState, isAttractMode: boolean) {
    if (game && game.isPaused) {
      return;
    }

    // Stop updating if player climbed too high and camera won't return to stork Y
    if (game && !isAttractMode) {
      const recScreens = config.recoveryScreens ?? 1;
      const maxReturnCamY = (game.highestCameraY ?? 0) + config.gameHeight * recScreens;
      if (maxReturnCamY < -180) {
        return;
      }
    }

    // Move right to left
    this.x -= this.speed;

    // Wing flap animation
    this.flapTimer++;
    if (this.flapTimer >= 8) {
      this.flapTimer = 0;
      this.flapFrame = (this.flapFrame + 1) % 4;
    }

    // Wave timer for banner motion
    this.waveTimer += 0.08;

    // Respawn at right when moved completely offscreen left
    if (this.x < -150) {
      this.x = config.gameWidth + 30;
    }
  }

  draw(ctx: CanvasRenderingContext2D, game?: GameState, isAttractMode?: boolean) {
    // Skip drawing if camera won't return to stork Y
    if (game && !isAttractMode) {
      const recScreens = config.recoveryScreens ?? 1;
      const maxReturnCamY = (game.highestCameraY ?? 0) + config.gameHeight * recScreens;
      if (maxReturnCamY < -180) {
        return;
      }
    }

    // Skip drawing if completely offscreen
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

    // Ensure offscreen banner is created and re-rendered if font loaded
    if (!this.offCanvas) {
      this.updateOffscreenBanner();
    } else if (!this.fontLoaded && typeof document !== 'undefined' && document.fonts && document.fonts.check && document.fonts.check('8px "Press Start 2P"')) {
      this.updateOffscreenBanner();
    }

    // 1. Banner wave slice calculations
    const sliceWidth = 6;
    const slices = Math.ceil(bannerW / sliceWidth);
    const waveY0 = FLR(SIN(this.waveTimer) * 1.5);

    // Draw ropes
    const ropeStartX = storkX + 17;
    const ropeStartY1 = storkY + 4;
    const ropeStartY2 = storkY + 8;

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;

    // Top rope
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY1);
    ctx.lineTo(bannerX, bannerY + waveY0 + 3);
    ctx.stroke();

    // Bottom rope
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY2);
    ctx.lineTo(bannerX, bannerY + waveY0 + bannerH - 3);
    ctx.stroke();

    // 2. Banner waving animation
    if (this.offCanvas) {
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < slices; i++) {
        const sx = i * sliceWidth;
        const sw = Math.min(sliceWidth, bannerW - sx);
        const waveY = FLR(SIN(this.waveTimer - i * 0.35) * 1.5);

        const dx = bannerX + sx;
        const dy = bannerY + waveY;

        ctx.drawImage(this.offCanvas, sx, 0, sw, bannerH, dx, dy, sw, bannerH);
      }
    }

    // 3. Stork pixel art rendering (flying right-to-left)
    // Beak
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(storkX - 5, storkY + 4, 6, 2);

    // Head
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(storkX + 1, storkY + 2, 4, 4);

    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(storkX + 2, storkY + 3, 1, 1);

    // Neck & body
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(storkX + 4, storkY + 3, 3, 3);
    ctx.fillRect(storkX + 6, storkY + 3, 9, 5);

    // Tail feathers
    ctx.fillStyle = '#212121';
    ctx.fillRect(storkX + 14, storkY + 4, 3, 3);

    // Legs
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(storkX + 13, storkY + 7, 7, 2);

    // Wings (Flap animation)
    if (this.flapFrame === 0) {
      // Flap up
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(storkX + 7, storkY - 5, 5, 8);
      ctx.fillStyle = '#212121';
      ctx.fillRect(storkX + 8, storkY - 8, 4, 3);
    } else if (this.flapFrame === 2) {
      // Flap down
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(storkX + 7, storkY + 6, 5, 5);
      ctx.fillStyle = '#212121';
      ctx.fillRect(storkX + 8, storkY + 11, 4, 3);
    } else {
      // Flap level
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(storkX + 5, storkY + 2, 8, 2);
      ctx.fillStyle = '#212121';
      ctx.fillRect(storkX + 12, storkY + 2, 4, 2);
    }

    ctx.restore();
  }
}

export const airplaneSystem = new AirplaneBannerSystem();
