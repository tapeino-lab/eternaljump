/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';
import { safeSessionStorage } from './safeStorage.js';


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

// Handle bottom toast slide prompts
let toastTimer: any = null;
let deferredInstallPrompt: any = null;

// Always capture beforeinstallprompt at top level as early as possible
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  console.log('[PWA] beforeinstallprompt captured!');
  checkAndTriggerPwaToast();
});

export function hideBottomToast() {
  const toast = document.getElementById('bottomToast');
  if (toast) {
    toast.classList.remove('visible');
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

let toastEventsInitialized = false;
function initToastEventBlockers() {
  if (toastEventsInitialized) return;
  const toast = document.getElementById('bottomToast');
  if (!toast) return;

  // Stop propagation in bubbling phase so buttons still receive clicks/touches,
  // but events don't reach document/canvas game handlers.
  const stopProp = (e: Event) => {
    e.stopPropagation();
  };

  ['touchstart', 'touchend', 'touchmove', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click'].forEach(evName => {
    toast.addEventListener(evName, stopProp, { capture: false });
  });

  toastEventsInitialized = true;
}

export function showBottomToast(text: string, actionLabel: string, onAction: () => void) {
  initToastEventBlockers();

  const toast = document.getElementById('bottomToast');
  const toastText = document.getElementById('bottomToastText');
  const btnAction = document.getElementById('bottomToastBtnAction');
  const btnLater = document.getElementById('bottomToastBtnLater');

  if (!toast || !toastText || !btnAction || !btnLater) return;

  toastText.textContent = text;
  btnAction.textContent = actionLabel;

  // Replace nodes to strip old listeners
  const newBtnAction = btnAction.cloneNode(true) as HTMLElement;
  const newBtnLater = btnLater.cloneNode(true) as HTMLElement;
  btnAction.parentNode?.replaceChild(newBtnAction, btnAction);
  btnLater.parentNode?.replaceChild(newBtnLater, btnLater);

  newBtnAction.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAction();
  });

  newBtnLater.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideBottomToast();
  });

  // Slide up
  toast.classList.add('visible');

  // Auto slide down after 10 seconds
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    hideBottomToast();
  }, 10000);
}

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /FB_IAB|FB4A|Instagram|Line|Twitter|MicroMessenger|Snapchat|KAKAOTALK/i.test(ua);
}

function checkAndTriggerPwaToast() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
  if (isStandalone || safeSessionStorage.getItem('dismiss_pwa_toast')) {
    return;
  }

  // Only show install toast if deferredInstallPrompt is available
  if (!deferredInstallPrompt) {
    return;
  }

  setTimeout(() => {
    // Re-check standalone & session item inside timeout
    const isStillNotStandalone = !(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
    if (isStillNotStandalone && !safeSessionStorage.getItem('dismiss_pwa_toast')) {
      showBottomToast(
        'Add to Home Screen',
        'Add',
        async () => {
          safeSessionStorage.setItem('dismiss_pwa_toast', '1');
          if (deferredInstallPrompt) {
            try {
              const promptEvent = deferredInstallPrompt;
              deferredInstallPrompt = null;
              hideBottomToast();
              await promptEvent.prompt();
              const choice = await promptEvent.userChoice;
              console.log('[PWA] User choice:', choice);
            } catch (err) {
              console.error('[PWA] Prompt call error:', err);
            }
          } else {
            hideBottomToast();
            // Fallback user guidance
            setTimeout(() => {
              showBottomToast(
                'Use Browser Menu (⋮) to Add',
                'OK',
                () => hideBottomToast()
              );
            }, 300);
          }
        }
      );
    }
  }, 1000);
}

export function setupToastPrompts() {
  // 1. In-App Browser Prompt
  if (isInAppBrowser()) {
    if (!safeSessionStorage.getItem('dismiss_iab_toast')) {
      setTimeout(() => {
        showBottomToast(
          'Open in Default Browser',
          'Open',
          () => {
            safeSessionStorage.setItem('dismiss_iab_toast', '1');
            hideBottomToast();
            const url = window.location.href;
            const isAndroid = /Android/i.test(navigator.userAgent);
            if (isAndroid) {
              const intentUrl = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
              window.location.href = intentUrl;
              setTimeout(() => {
                window.open(url, '_system') || (window.location.href = url);
              }, 500);
            } else {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url).catch(() => {});
              }
              const newWin = window.open(url, '_blank');
              if (!newWin) {
                window.location.href = url;
              }
            }
          }
        );
      }, 1200);
      return;
    }
  }

  // 2. Install PWA Prompt check (will trigger if beforeinstallprompt already fired)
  checkAndTriggerPwaToast();
}


