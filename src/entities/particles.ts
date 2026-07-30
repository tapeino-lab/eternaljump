import { RND, FLR, MAX, MIN } from "../utils.js";
import { ctx } from '../display.js';

import { dR } from '../renderer/core.js';

import { game } from '../state.js';
import { ObjectPool } from './pool.js';

const SPARKLE_COLORS = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'];

export const P_PT = new ObjectPool<Particle>(() => new Particle());

export function getPt(x: number, y: number, vx: number, vy: number, c: string, s: number, l: number, g = 0.2, sp = false, f = 1, flk = false) {
  let p = P_PT.get();
  p.init(x, y, vx, vy, c, s, l, g, sp, f, flk);
  return p;
}

export class Particle {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  color: string = '';
  size: number = 0;
  life: number = 0;
  maxLife: number = 0;
  g: number = 0;
  isSp: boolean = false;
  fric: number = 1;
  flk: boolean = false;
  
  init(x: number, y: number, vx: number, vy: number, color: string, size: number, life: number, g = 0.2, isSp = false, fric = 1, flk = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.g = g;
    this.isSp = isSp;
    this.fric = fric;
    this.flk = flk;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.g;
    this.vx *= this.fric;
    this.vy *= this.fric;
    this.life--;
  }
  draw() {
    if (this.isSp === true) {
      let b = this.life % 6 < 3, s = b ? 4 : 2, c = SPARKLE_COLORS[FLR(RND() * 7)];
      ctx.globalAlpha = 0.9;
      dR(this.x - 1, this.y - s, 2, s * 2, c);
      dR(this.x - s, this.y - 1, s * 2, 2, c);
      if (b) dR(this.x, this.y, 2, 2, '#fff');
    } else {
      let a = MAX(0, MIN(1.0, (this.life / this.maxLife) * 2.0));
      if (this.flk && this.life < 30 && this.life % 4 < 2) a = 0;
      ctx.globalAlpha = a;
      dR(this.x, this.y, this.size, this.size, this.color);
    }
    ctx.globalAlpha = 1.0;
  }
}

export function spawnParticles(x: number, y: number, color: string, count: number, speed = 4, effectType = 'burst') {
  if (game.particles.length > 150) count = MIN(count, 1);
  if (game.particles.length > 250) return;
  for (let i = 0; i < count; i++) {
    let vx, vy;
    if (effectType === 'collapse') {
      vx = (RND() - 0.5) * (speed * 0.5);
      vy = RND() * speed;
    } else {
      vx = (RND() - 0.5) * speed;
      vy = (RND() - 1) * speed;
    }
    game.particles.push(getPt(x, y, vx, vy, color, 3 + RND() * 3, 10 + RND() * 15));
  }
}

export function spawnDebris(x: number, y: number, w: number, h: number, color: string, count: number, scale = 1) {
  if (game.particles.length > 200) count = MIN(count, 1);
  if (game.particles.length > 300) return;
  for (let i = 0; i < count; i++) {
    let px = x + RND() * w;
    let py = y + RND() * h;
    let vx = (RND() - 0.5) * 4;
    let vy = -1 - RND() * 2;
    let size = (6 + RND() * 8) * scale;
    let life = 60 + RND() * 40;
    let pt = getPt(px, py, vx, vy, color, size, life, 0, false, 0.94, true);
    game.particles.push(pt);
  }
}

export function spawnFireSparks(x: number, y: number, count: number) {
  if (game.particles.length > 250) count = MIN(count, 3);
  if (game.particles.length > 350) return;
  for (let i = 0; i < count; i++) {
    let vx = (RND() - 0.5) * 12;
    let vy = (RND() - 0.5) * 12;
    let size = 3 + RND() * 3;
    let life = 20 + RND() * 20;
    let color = RND() < 0.5 ? '#f80' : (RND() < 0.5 ? '#fa0' : '#ff0');
    let pt = getPt(x, y, vx, vy, color, size, life, 0.1, false, 0.92);
    game.particles.push(pt);
  }
}

