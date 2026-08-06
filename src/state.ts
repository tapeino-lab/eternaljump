import type { GameState } from './types.js';

export function createInitialGameState(): GameState {
  let scoreKey = Math.floor(Math.random() * 0xFFFFFFFF);
  let scoreObf = 0 ^ scoreKey;

  let scoreCoinKey = Math.floor(Math.random() * 0xFFFFFFFF);
  let scoreCoinObf = 0 ^ scoreCoinKey;

  let totalCoinsKey = Math.floor(Math.random() * 0xFFFFFFFF);
  let totalCoinsObf = 0 ^ totalCoinsKey;

  const obj = {
    state: 'intro',
    isPaused: false,
    demoMode: false,
    aiActive: false,
    isConsecutive: false,
    playTime: 0,
    timerStarted: false,
    shakeAmount: 0,
    introAnimTimer: 0,
    particles: [],
    meteors: [],
    npcs: [],
    birds: [],
    player: null,
    platforms: [],
    items: [],
    coins: [],
    flyingCoins: [],
    clouds: [],
    stars: [],
    cameraY: 0,
    highestCameraY: 0,
    highestPlayerY: 0,
    inventory: {},
    equipped: {},
    lastCoinY: 0,
    lastGreenMushroomY: null,
    greenMushroomCount: 0,
    baseScoreY: 0,
    goalY: 0,
    startScore: 0,
    eventLog: [],
    loopCount: 0,
    endReason: null,
    lastScoreId: null,
    lastRank: null,
    lastScoreObj: null,
    allowAutoRank: false,
    clearTime: 0,
    debugUsed: false,
    lastUI: '',
    flockDir: 1,
    isNewRecord: false,
  isNewTARecord: false,
    personalBest: null,
    showAIThoughts: false,
    meteorOverheat: 0
  } as unknown as GameState;

  Object.defineProperties(obj, {
    score: {
      get: () => scoreObf ^ scoreKey,
      set: (val: number) => {
        scoreKey = Math.floor(Math.random() * 0xFFFFFFFF);
        scoreObf = (val | 0) ^ scoreKey;
      },
      enumerable: true,
      configurable: true
    },
    scoreCoin: {
      get: () => scoreCoinObf ^ scoreCoinKey,
      set: (val: number) => {
        scoreCoinKey = Math.floor(Math.random() * 0xFFFFFFFF);
        scoreCoinObf = (val | 0) ^ scoreCoinKey;
      },
      enumerable: true,
      configurable: true
    },
    totalCoins: {
      get: () => totalCoinsObf ^ totalCoinsKey,
      set: (val: number) => {
        totalCoinsKey = Math.floor(Math.random() * 0xFFFFFFFF);
        totalCoinsObf = (val | 0) ^ totalCoinsKey;
      },
      enumerable: true,
      configurable: true
    }
  });

  return obj;
}

export const game: GameState = createInitialGameState();

/**
 * Resets the GameState properties to initial default values in a unified way.
 */
export function resetGameStateData(game: GameState, isConsecutive: boolean = false, flockDir: number = 1, personalBest: any = null) {
  const initial = createInitialGameState();

  // Preserve showAIThoughts value across reset
  const oldShowAIThoughts = game.showAIThoughts !== undefined ? game.showAIThoughts : false;

  game.isConsecutive = isConsecutive;
  game.state = initial.state;
  game.isPaused = initial.isPaused;
  game.playTime = initial.playTime;
  game.timerStarted = isConsecutive;
  game.shakeAmount = initial.shakeAmount;
  game.introAnimTimer = initial.introAnimTimer;
  game.flockDir = flockDir;

  game.particles.length = 0;
  game.meteors.length = 0;
  game.npcs.length = 0;
  game.birds.length = 0;
  game.platforms.length = 0;
  game.items.length = 0;
  game.coins.length = 0;
  game.flyingCoins.length = 0;
  game.clouds.length = 0;
  game.stars.length = 0;

  game.cameraY = initial.cameraY;
  game.highestCameraY = initial.highestCameraY;
  game.highestPlayerY = initial.highestPlayerY;
  game.score = initial.score;
  game.scoreCoin = initial.scoreCoin;

  game.lastCoinY = initial.lastCoinY;
  game.lastGreenMushroomY = initial.lastGreenMushroomY;
  game.greenMushroomCount = initial.greenMushroomCount;
  game.baseScoreY = initial.baseScoreY;
  game.goalY = initial.goalY;
  game.eventLog = [];
  game.loopCount = initial.loopCount;
  game.endReason = initial.endReason;
  game.lastScoreId = initial.lastScoreId;
  game.lastRank = initial.lastRank;
  game.lastScoreObj = initial.lastScoreObj;
  game.isNewRecord = initial.isNewRecord;
  game.isNewTARecord = false;
  game.personalBest = personalBest;
  game.clearTime = initial.clearTime;
  game.debugUsed = initial.debugUsed;
  game.lastUI = initial.lastUI;
  game.showAIThoughts = oldShowAIThoughts;
  game.meteorOverheat = 0;
}

export function isEquipped(game: GameState, id: string): boolean {
  return !!(game.equipped && game.equipped[id]);
}

export const demoState = {

  active: false,
  phase: 'none' as 'none' | 'ranking' | 'scroll' | 'wait',
  rankingMode: 'ta' as 'ta' | 'height',
  startTime: 0,
  dist1: 0,
  dist2: 0,
  totalDist: 0,
  containerH: 0,
  fixedTop3Y: 0,
  t3H: 0,
  otH: 0,
  scrollDuration: 110000,
  calculated: false,
  gap: 8,
  headerH: 0,
  startScrollY: 0,
  fixedHeaderY: 0,
  wH: 0
};
