import { ctx } from '../display.js';

let lastFillColor: string | null = null;

export function resetFillColor() {
  lastFillColor = null;
}

export function setFillColor(c: string) {
  if (lastFillColor !== c) {
    ctx.fillStyle = c;
    lastFillColor = c;
  }
}

export function dR(x: number, y: number, w: number, h: number, c: string | null) {
  if (c !== null && lastFillColor !== c) {
    ctx.fillStyle = c;
    lastFillColor = c;
  }
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
