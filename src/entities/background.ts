import { RND, FLR } from '../utils.js';

    export const P_CL = [];
    
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
    
    export class BackgroundCloud {
      [key: string]: any;
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = RND() < 0.5 ? 0.6 : 0.8;
        this.scale = this.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
        this.type = FLR(RND() * 3);
      }
    }

