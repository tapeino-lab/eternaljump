/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';


let updatePending = false;
let reloadSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let currentSwRegistration: ServiceWorkerRegistration | null = null;

export async function checkVersionJsonDirectly(): Promise<boolean> {
  try {
    const basePath = import.meta.env.BASE_URL || './';
    const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/';
    const versionUrl = `${normalizedBase}version.json?t=${Date.now()}`;
    const res = await fetch(versionUrl, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.version && data.version !== import.meta.env.VITE_APP_VERSION) {
      console.log(`[VersionCheck] New version detected via version.json: ${data.version} (current: ${import.meta.env.VITE_APP_VERSION})`);
      updatePending = true;
      document.dispatchEvent(new Event('pwa-update-available'));
      if (currentSwRegistration) {
        currentSwRegistration.update().catch(() => {});
      }
      return true;
    }
  } catch (err) {
    console.warn('[VersionCheck] Direct version check failed:', err);
  }
  return false;
}

if ('serviceWorker' in navigator) {
  reloadSW = registerSW({
    onNeedRefresh() {
      console.log('SW: New version available, pending update...');
      updatePending = true;
      document.dispatchEvent(new Event('pwa-update-available'));
    },
    onRegistered(swRegistration) {
      if (swRegistration) {
        currentSwRegistration = swRegistration;
        const triggerUpdate = () => {
          if (document.visibilityState === 'visible') {
            swRegistration.update().catch(() => {});
            checkVersionJsonDirectly();
          }
        };
        document.addEventListener('visibilitychange', triggerUpdate);
        window.addEventListener('focus', triggerUpdate);
      }
    }
  });
}

// Initial check on load
checkVersionJsonDirectly();

export async function checkUpdateAndReload() {
  if (!updatePending) {
    await checkVersionJsonDirectly();
  }
  if (updatePending) {
    console.log('Update found, applying and reloading...');
    updatePending = false;
    if (reloadSW) {
      reloadSW(true);
    } else {
      window.location.reload();
    }
  }
}

// Prevent the "Install PWA" prompt from appearing
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});

