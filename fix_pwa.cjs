const fs = require('fs');
let pwaJs = `
import { registerSW } from 'virtual:pwa-register';
import { game, demoState } from './game.js';

let updatePending = false;
let reloadSW = null;

if ('serviceWorker' in navigator) {
  reloadSW = registerSW({
    onNeedRefresh() {
      console.log('SW: New version available, pending update...');
      updatePending = true;
      checkUpdateAndReload();
    },
    onRegistered(swRegistration) {
      if (swRegistration) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            swRegistration.update().catch(() => {});
          }
        });
      }
    }
  });
}

export function checkUpdateAndReload() {
  if (updatePending && reloadSW && (game.state === 'intro' || game.state === 'gameover' || game.state === 'clear' || demoState.active)) {
    console.log('Update found, applying and reloading...');
    updatePending = false;
    reloadSW(true);
  }
}
`;
fs.writeFileSync('src/pwa.js', pwaJs);
console.log('pwa.js fixed');
