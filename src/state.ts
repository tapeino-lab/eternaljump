import type { GameState } from './types.js';

export function createInitialGameState(): GameState {
  return {
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
    score: 0,
    scoreCoin: 0,
    totalCoins: 0,
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
    lastUI: '',
    flockDir: 1,
    isNewRecord: false,
    personalBest: null,
    showAIThoughts: false
  };
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
  game.personalBest = personalBest;
  game.clearTime = initial.clearTime;
  game.lastUI = initial.lastUI;
  game.showAIThoughts = oldShowAIThoughts;
}

export function isEquipped(game: GameState, id: string): boolean {
  return !!(game.equipped && game.equipped[id]);
}

export const demoState = {

  active: false,
  phase: 'none' as 'none' | 'ranking' | 'scroll' | 'wait',
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
