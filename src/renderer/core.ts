import { ctx } from '../display.js';
import { FLR } from '../utils.js';

export function dR(x, y, w, h, c) {
  if (c !== null) ctx.fillStyle = c;
  ctx.fillRect(FLR(x), FLR(y), FLR(w), FLR(h));
}