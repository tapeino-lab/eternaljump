import { ctx } from '../display.js';

let lastFillColor: string | null = null;

export function resetFillColor() {
  lastFillColor = null;
}

// Always assign: many draw calls set ctx.fillStyle directly, so a cached "last color" goes stale
// and the next rect would be drawn in the wrong color.
export function setFillColor(c: string) {
  ctx.fillStyle = c;
  lastFillColor = c;
}

export function dR(x: number, y: number, w: number, h: number, c: string | null) {
  if (c !== null) {
    ctx.fillStyle = c;
    lastFillColor = c;
  }
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
