import { game, demoState } from './state.js';
import { updatePhysicsMain } from './update.js';
import { render } from './renderer/index.js';

import { config } from './config.js';
import { inputHandler } from './input.js';
import { IMG, pBtn } from './display.js';
import { setIgnoreNextTap, initGame, isAttractMode, updatePauseButton, updateAutoCruiseBtnVisibility } from './lifecycle.js';
import { FLR, $ } from './utils.js';
import { spawnPlatform } from './spawner.js';
import { fireworksSystem } from './fireworks.js';
import { airplaneSystem } from './airplane.js';
import { runAI } from './ai.js';
import { spawnParticles } from './entities/index.js';
import { onEnterShop } from './shop.js';

let cachedTitleVersion: HTMLElement | null = null;
let cachedShopScreen: HTMLElement | null = null;

export let lastTime = performance.now();
export let acc = 0;
export let loopRunning = false;
export const frameDuration = 1000 / config.targetFPS;

export function setLoopRunning(val: boolean) { loopRunning = val; }
export function resetLoopStats() { lastTime = performance.now(); acc = 0; }
export function startLoop() { resetLoopStats(); loopRunning = true; requestAnimationFrame(loop); }

let lastLoopCheckState = {
  isAttractMode: null as boolean | null,
  demoActive: null as boolean | null,
  isPaused: null as boolean | null,
  gameState: null as string | null,
  aiActive: null as boolean | null
};

export function loop(ts: number) {
  let dT = ts - lastTime;
  lastTime = ts;
  if (dT > 250) dT = 250;

  if (!game.isPaused) {
    if (game.state === 'playing' || game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || game.state === 'intro') {
      if (!isAttractMode || demoState.active) game.playTime += dT;
    }
    acc += dT;
    let upd = 0;
    while (acc >= frameDuration && upd < 3) {
      updatePhysicsMain(
        game, isAttractMode, demoState, config, inputHandler, IMG,
        setIgnoreNextTap, pBtn, initGame, spawnPlatform, fireworksSystem,
        airplaneSystem, runAI, FLR, spawnParticles
      );
      acc -= frameDuration;
      upd++;
    }
    if (acc > frameDuration * 3) {
      acc = 0;
    }
  }

  // DOM Status check only when key state properties change or on state transitions
  const stateChanged = (
    lastLoopCheckState.isAttractMode !== isAttractMode ||
    lastLoopCheckState.demoActive !== demoState.active ||
    lastLoopCheckState.isPaused !== game.isPaused ||
    lastLoopCheckState.gameState !== game.state ||
    lastLoopCheckState.aiActive !== game.aiActive
  );

  if (stateChanged) {
    lastLoopCheckState.isAttractMode = isAttractMode;
    lastLoopCheckState.demoActive = demoState.active;
    lastLoopCheckState.isPaused = game.isPaused;
    lastLoopCheckState.gameState = game.state;
    lastLoopCheckState.aiActive = game.aiActive;

    if (!cachedTitleVersion) cachedTitleVersion = $('titleVersion');
    const tVer = cachedTitleVersion;
    if (tVer) {
      let nDisp = (isAttractMode && !demoState.active && !game.isPaused) ? 'block' : 'none';
      if (tVer.style.display !== nDisp) tVer.style.display = nDisp;
    }

    if (!cachedShopScreen) cachedShopScreen = $('shopScreen');
    const shopScreen = cachedShopScreen;
    if (shopScreen) {
      let sDisp = (game.state === 'shop') ? 'flex' : 'none';
      if (shopScreen.style.display !== sDisp) {
        shopScreen.style.display = sDisp;
        if (game.state === 'shop') {
          onEnterShop();
        }
      }
    }

    updatePauseButton();
    updateAutoCruiseBtnVisibility();
  }

  render(ts);
  if (loopRunning) requestAnimationFrame(loop);
}
