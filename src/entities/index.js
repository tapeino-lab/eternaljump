
import { config } from '../config.js';
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI } from "../utils.js";
import { game } from '../state.js';
import { ctx, IMG, logAIEvent, groundCache, groundCached, isDev } from '../game.js';
import { dR } from '../renderer.js';
import { runAI } from '../ai.js';

import { Particle } from './Particle.js';
import { Bird } from './Bird.js';
import { Meteor } from './Meteor.js';
import { Player } from './Player.js';
import { NPC } from './NPC.js';
import { Platform } from './Platform.js';
import { Item } from './Item.js';
import { Coin } from './Coin.js';
import { BackgroundCloud } from './BackgroundCloud.js';

export const P_PT = [], P_PL = [], P_CN = [], P_BD = [], P_MT = [], P_IT = [], P_CL = [];

export function getPt(x, y, vx, vy, c, s, l, g = 0.2, sp = false) {
  let p = P_PT.length ? P_PT.pop() : new Particle();
  p.init(x, y, vx, vy, c, s, l, g, sp);
  return p;
}
export function getPl(y, t = 'normal', ig = false, cx = null, cw = null, ch = null, c = 1, icy = false) {
  let p = P_PL.length ? P_PL.pop() : new Platform();
  p.init(y, t, ig, cx, cw, ch, c, icy);
  return p;
}
export function getCn(x, y) {
  let c = P_CN.length ? P_CN.pop() : new Coin();
  c.init(x, y);
  return c;
}
export function getBd(t, x, y, ip, p = null, ib = false) {
  let b = P_BD.length ? P_BD.pop() : new Bird();
  b.init(t, x, y, ip, p, ib);
  return b;
}
export function getMt(x, y, vx, vy) {
  let m = P_MT.length ? P_MT.pop() : new Meteor();
  m.init(x, y, vx, vy);
  return m;
}
export function getIt(y) {
  let i = P_IT.length ? P_IT.pop() : new Item();
  i.init(y);
  return i;
}
export function getCl(x, y) {
  if (P_CL.length > 0) {
    let c = P_CL.pop();
    c.x = x;
    c.y = y;
    c.speed = RND() < 0.5 ? 0.6 : 0.8;
    c.scale = c.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
    c.type = FLR(RND() * 3);
    return c;
  }
  return new BackgroundCloud(x, y);
}


export function spawnParticles(x, y, color, count, speed = 4, effectType = 'burst') {
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

export function spawnDebris(x, y, w, h, color, count) {
  for (let i = 0; i < count; i++) {
    let px = x + RND() * w;
    let py = y + RND() * h;
    let vx = (RND() - 0.5) * 3;
    let vy = RND() * 1.5;
    let size = 6 + RND() * 10;
    let life = 60 + RND() * 30;
    let pt = getPt(px, py, vx, vy, color, size, life);
    pt.g = 0.15 + RND() * 0.1;
    game.particles.push(pt);
  }
}

export function trySpawnBirdsOnPlatform(np, sc) {
  if (np.type === 'normal' && sc > game.startScore + 1000 && sc < 52000) {
    let prob = 0, maxB = 0;
    if (sc < 15000) { prob = 0.3; maxB = 2; }
    else if (sc < 40000) { prob = 0.15; maxB = 1; }
    else if (sc < 52000) { prob = 0.5; maxB = 5; }
    if (RND() < prob) {
      let bT = RND() < 0.8 ? 0 : 1;
      let platX = np.x, platW = np.w, bSp = bT === 0 ? 4 : 5;
      let mN = MAX(1, FLR((platW - 4) / bSp) + 1);
      let num = MIN(bT === 1 ? (RND() < 0.5 ? 1 : 2) : 2 + FLR(RND() * maxB), mN);
      let gW = (num - 1) * bSp + 4;
      let bx = RND() * MAX(0, platW - gW);
      for (let j = 0; j < num; j++) {
        game.birds.push(getBd(bT, platX + bx + j * bSp, np.y, true, np));
      }
    }
  }
}

export { Particle, Bird, Meteor, Player, NPC, Platform, Item, Coin, BackgroundCloud };
