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
import { resolvePlayerIdentifier, resolveTotalCoinsAsync, persistTotalCoins, markBootCoinsRestored } from './identity.js';
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
  // Take the max, never add a diff: game.totalCoins is loaded from storage by startAttractCycle()
  // after this point, so a boot-time diff double-counted the stored balance on every launch.
  // Coins earned during play are persisted immediately, so restoredCoins already includes them.
  resolvePlayerIdentifier().then(() => {
    resolveTotalCoinsAsync().then((restoredCoins) => {
      if (restoredCoins > (game.totalCoins || 0)) {
        game.totalCoins = restoredCoins;
        persistTotalCoins(game.totalCoins);
        const shopCounter = document.getElementById('shopCoinCounter');
        if (shopCounter) shopCounter.innerText = game.totalCoins.toString();
      }
      markBootCoinsRestored();
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
