import { Player } from './entities/index.js';
import { initSpawner } from './spawner.js';
import { game } from './state.js';
import { setupInputListeners } from './input.js';
import { setupKeyboardUI } from './keyboard.js';
import { initShop } from './shop.js';
import { startAttractCycle } from './lifecycle.js';
import { setupToastPrompts } from './pwa.js';
import { $ } from './utils.js';
import { RankingAPI } from './ranking/index.js';
import './display.js';

(window as any).game = game;
game.player = new Player();
initSpawner(game);

setupInputListeners();

const tVer = $('titleVersion');
if (tVer) {
  tVer.innerText = `v${import.meta.env.VITE_APP_VERSION}`;
}

setupKeyboardUI();
initShop();
setupToastPrompts();

// Early prefetch ranking data in background at application startup
RankingAPI.prefetchScores();
RankingAPI.prefetchTAScores();

startAttractCycle();

// Trigger UI sync
