
import { registerSW } from 'virtual:pwa-register';

let updatePending = false;
let reloadSW = null;

if ('serviceWorker' in navigator) {
  reloadSW = registerSW({
    onNeedRefresh() {
      console.log('SW: New version available, pending update...');
      updatePending = true;
      document.dispatchEvent(new Event('pwa-update-available'));
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
  if (updatePending && reloadSW) {
    console.log('Update found, applying and reloading...');
    updatePending = false;
    reloadSW(true);
  }
}

// Prevent the "Install PWA" prompt from appearing
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});
