import { RND, FLR } from '../utils.js';
import { ObjectPool } from './pool.js';

export const P_CL = new ObjectPool<BackgroundCloud>(() => new BackgroundCloud(0, 0));

export function getCl(x: number, y: number) {
  let c = P_CL.get();
  c.x = x;
  c.y = y;
  c.speed = RND() < 0.5 ? 0.6 : 0.8;
  c.scale = c.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
  c.type = FLR(RND() * 3);
  return c;
}

    
    export class BackgroundCloud {
      x: number;
      y: number;
      speed: number;
      scale: number;
      type: number;
      
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.speed = RND() < 0.5 ? 0.6 : 0.8;
        this.scale = this.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
        this.type = FLR(RND() * 3);
      }
    }

