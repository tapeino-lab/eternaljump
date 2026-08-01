import { Player } from './entities/index.js';
import { initSpawner } from './spawner.js';
import { game, demoState } from './state.js';
import { setupInputListeners } from './input.js';
import { setupKeyboardUI } from './keyboard.js';
import { initShop } from './shop.js';
import { startAttractCycle } from './lifecycle.js';
import { $ } from './utils.js';
import './display.js';

game.player = new Player();
initSpawner(game);

setupInputListeners();

const tVer = $('titleVersion');
if (tVer) {
  tVer.innerText = `v${import.meta.env.VITE_APP_VERSION}`;
}

setupKeyboardUI();
initShop();
startAttractCycle();

// Trigger UI sync
