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
import { resolvePlayerIdentifier, resolveTotalCoinsAsync, persistTotalCoins } from './identity.js';
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

  // Multi-layer Identity & Coin Storage Restoration on Startup
  const initialBootCoins = game.totalCoins || 0;
  resolvePlayerIdentifier().then(() => {
    resolveTotalCoinsAsync().then((restoredCoins) => {
      if (restoredCoins > initialBootCoins) {
        const diff = restoredCoins - initialBootCoins;
        game.totalCoins = (game.totalCoins || 0) + diff;
        persistTotalCoins(game.totalCoins);
        const shopCounter = document.getElementById('shopCoinCounter');
        if (shopCounter) shopCounter.innerText = game.totalCoins.toString();
      }
      // Sync with LootLocker cloud in background for returning players
      RankingAPI.syncPersonalBest();
    });
  });

  // Early prefetch ranking data in background at application startup
  RankingAPI.prefetchScores();
  RankingAPI.prefetchTAScores();

  startAttractCycle();
}

// Trigger UI sync
