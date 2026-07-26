import type { Player, NPC } from './entities/player.js';
import type { Platform } from './entities/platform.js';
import type { Particle } from './entities/particles.js';
import type { Item, Coin, FlyingCoin } from './entities/items.js';
import type { Meteor, Bird } from './entities/obstacles.js';
import type { BackgroundCloud } from './entities/background.js';

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  blink: number;
}

export interface GameState {
  state: 'intro' | 'play' | 'result' | 'loading' | 'title' | 'gameover' | 'clear' | 'playing' | 'intro_anim' | 'powerup_anim' | 'powerdown_anim' | 'demo' | 'shop';
  isPaused: boolean;
  demoMode: boolean;
  aiActive: boolean;
  isConsecutive: boolean;
  playTime: number;
  timerStarted: boolean;
  shakeAmount: number;
  introAnimTimer: number;
  particles: Particle[];
  meteors: Meteor[];
  npcs: NPC[];
  birds: Bird[];
  player: Player | null;
  platforms: Platform[];
  items: Item[];
  coins: Coin[];
  flyingCoins: FlyingCoin[];
  clouds: BackgroundCloud[];
  stars: Star[];
  cameraY: number;
  highestCameraY: number;
  highestPlayerY: number;
  score: number;
  scoreCoin: number;
  totalCoins: number;
  inventory: Record<string, boolean>;
  equipped: Record<string, boolean>;
  lastCoinY: number;
  lastGreenMushroomY?: number | null;
  greenMushroomCount?: number;
  baseScoreY: number;
  goalY: number;
  startScore: number;
  eventLog: string[];
  loopCount: number;
  endReason: string | null;
  lastScoreId: string | null;
  lastRank: number | null;
  lastScoreObj: any;
  allowAutoRank: boolean;
  clearTime: number;
  lastUI: string;
  flockDir: number;
  isNewRecord: boolean;
  isBenchmarking?: boolean;
  personalBest: any;
}

export type { Player, NPC, Platform, Particle, Item, Coin, FlyingCoin, Meteor, Bird, BackgroundCloud as Cloud };
