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
  window.location.pathname.startsWith('/admin') ||
  window.location.search.includes('admin') ||
  window.location.hash.includes('admin')
) {
  document.body.innerHTML = `
    <div style="background:#0f172a;color:#38bdf8;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">管理者ダッシュボードを読み込み中...</div>
      <div style="font-size:12px;color:#94a3b8;">Loading Admin Dashboard...</div>
    </div>
  `;
  fetch('/admin?direct=' + Date.now(), { cache: 'no-store' })
    .then(r => r.text())
    .then(html => {
      document.open();
      document.write(html);
      document.close();
    })
    .catch(() => {
      window.location.href = '/admin.html?t=' + Date.now();
    });
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
