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

// Check if user is navigating to Admin Dashboard
if (
  window.location.pathname.includes('admin') ||
  window.location.search.includes('admin') ||
  window.location.hash.includes('admin')
) {
  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) || './';
  window.location.replace(basePath + 'admin.html' + window.location.search);
} else {
  initGameApp();
}

function initGameApp() {
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
}

// Trigger UI sync
