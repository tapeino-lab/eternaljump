import { ctx } from '../display.js';
import { FLR } from '../utils.js';

export function dR(x: number, y: number, w: number, h: number, c: string | null) {
  if (c !== null) ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}