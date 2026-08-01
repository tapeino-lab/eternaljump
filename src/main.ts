import { Player } from './entities/index.js';
import { initSpawner } from './spawner.js';
import { game, demoState } from './state.js';
import { setupInputListeners } from './input.js';
import { setupKeyboardUI } from './keyboard.js';
import { initShop } from './shop.js';
import { startAttractCycle } from './lifecycle.js';
import { $ } from './utils.js';
import { initInAppGuide, showPWAInstallModal, getSyncUrl } from './inapp-guide.js';
import './display.js';

initInAppGuide();

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

const btnPwa = $('btnPwaInstall');
if (btnPwa) {
  btnPwa.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPWAInstallModal();
  });
}

const btnCopySync = $('btnCopySyncUrlPause');
if (btnCopySync) {
  btnCopySync.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getSyncUrl();
    navigator.clipboard.writeText(url).then(() => {
      alert('データ引き継ぎURLをコピーしました！\n別のブラウザでこのURLを開けば同じプレイヤーデータでプレイできます。');
    }).catch(() => {
      prompt('以下のデータ引き継ぎURLをコピーしてください:', url);
    });
  });
}

