import { safeStorage } from './safeStorage.js';
import { LootLockerAPI } from './lootlocker.js';
import { $ } from './utils.js';

// Detect if running inside an in-app browser (LINE, Instagram, Twitter, Camera WebView, etc.)
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  
  const inAppRegex = /Line\/|FB_IAB|FB4A|FBAV|Instagram|Twitter|Snapchat|MicroMessenger|GSA\/|KakaoTalk|WebView|FBAN|Musical_ly/i;
  // iOS Camera / WebView without standard Safari token
  const isIOSInApp = isIOS && !ua.includes('Safari') && ua.includes('AppleWebKit');
  
  return inAppRegex.test(ua) || isIOSInApp;
}

// Detect if installed as standalone PWA
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

// 1. Automatic Player ID sync via URL parameter (?pid=xxx or #pid=xxx)
export function syncPlayerIdFromUrl(): void {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let pidParam = urlParams.get('pid');

    if (!pidParam && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      pidParam = hashParams.get('pid');
    }

    if (pidParam && pidParam.startsWith('p_')) {
      const existingPid = safeStorage.getItem('LL_PID');
      if (existingPid !== pidParam) {
        safeStorage.setItem('LL_PID', pidParam);
        LootLockerAPI.playerIdentifier = pidParam;
        console.log('[PlayerSync] Restored Player ID from URL parameter:', pidParam);
      }
      
      // Clean up URL without page refresh so it stays clean
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (e) {
    console.warn('[PlayerSync] Error syncing PID from URL:', e);
  }
}

// Get direct link with current Player ID embedded
export function getSyncUrl(): string {
  const pid = safeStorage.getItem('LL_PID') || LootLockerAPI.playerIdentifier || '';
  const baseUrl = window.location.origin + window.location.pathname;
  if (pid) {
    return `${baseUrl}?pid=${encodeURIComponent(pid)}`;
  }
  return baseUrl;
}

let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// Show In-App Browser Warning Banner or Modal
export function initInAppGuide(): void {
  syncPlayerIdFromUrl();

  // If in-app browser detected and not dismissed this session
  if (isInAppBrowser()) {
    showInAppModal();
  }
}

// Show modal guiding users to open in Safari/Chrome or copy sync link
export function showInAppModal(): void {
  let modal = document.getElementById('inAppGuideModal');
  if (modal) {
    modal.style.display = 'flex';
    return;
  }

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  modal = document.createElement('div');
  modal.id = 'inAppGuideModal';
  modal.className = 'inapp-modal-overlay';
  modal.innerHTML = `
    <div class="inapp-modal-card">
      <div class="inapp-header">
        <span class="inapp-icon">⚠️</span>
        <h3 class="inapp-title">標準ブラウザでのプレイ推奨</h3>
      </div>
      <p class="inapp-desc">
        アプリ内・カメラのブラウザで開かれています。<br>
        このままだとブラウザを閉じたときにセーブデータ（ハイスコアや解放アイテム）が残らない場合があります。
      </p>

      <div class="inapp-steps">
        <div class="inapp-step-title">📱 標準ブラウザ（Safari/Chrome）で開く方法:</div>
        ${isIOS ? `
          <ol class="inapp-list">
            <li>画面右下の <strong>「Safariで開く」アイコン</strong>（または <b>「…」</b>）をタップ</li>
            <li>「Safariで開く」を選択</li>
          </ol>
        ` : `
          <ol class="inapp-list">
            <li>画面右上の <strong>「⋮」（メニュー）</strong> をタップ</li>
            <li>「Chromeで開く」または「ブラウザで開く」を選択</li>
          </ol>
        `}
      </div>

      <div class="inapp-actions">
        <button id="btnCopySyncUrl" class="inapp-btn inapp-btn-primary">
          📋 データ引き継ぎURLをコピー
        </button>
        <button id="btnCloseInAppModal" class="inapp-btn inapp-btn-secondary">
          このままプレイを続ける
        </button>
      </div>
      <div id="copyToast" class="copy-toast" style="display:none;">URLをコピーしました！Safari/Chromeの検索バーに貼り付けて開いてください</div>
    </div>
  `;

  document.body.appendChild(modal);

  const btnCopy = document.getElementById('btnCopySyncUrl');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const syncUrl = getSyncUrl();
      navigator.clipboard.writeText(syncUrl).then(() => {
        const toast = document.getElementById('copyToast');
        if (toast) {
          toast.style.display = 'block';
          setTimeout(() => {
            if (toast) toast.style.display = 'none';
          }, 3500);
        }
      }).catch(() => {
        prompt('以下のURLをコピーしてSafari/Chromeで開いてください:', syncUrl);
      });
    });
  }

  const btnClose = document.getElementById('btnCloseInAppModal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }
}

// Show PWA Home Screen Installation Guide
export function showPWAInstallModal(): void {
  let modal = document.getElementById('pwaInstallModal');
  if (modal) {
    modal.style.display = 'flex';
    return;
  }

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  modal = document.createElement('div');
  modal.id = 'pwaInstallModal';
  modal.className = 'inapp-modal-overlay';
  modal.innerHTML = `
    <div class="inapp-modal-card">
      <div class="inapp-header">
        <span class="inapp-icon">📱</span>
        <h3 class="inapp-title">ホーム画面に追加</h3>
      </div>
      <p class="inapp-desc">
        ホーム画面に追加すると、アプリとして全画面で快適にプレイでき、セーブデータも確実に保存されます！
      </p>

      ${isIOS ? `
        <div class="inapp-steps">
          <div class="inapp-step-title">iPhone (Safari) での手順:</div>
          <ol class="inapp-list">
            <li>Safari下部（または上部）の <strong>共有ボタン <span style="font-size:16px;">⎋</span> / <span style="font-size:16px;">⤓</span></strong> をタップ</li>
            <li>メニューから <strong>「ホーム画面に追加」</strong> を選択</li>
            <li>右上の「追加」をタップ</li>
          </ol>
        </div>
      ` : `
        <div class="inapp-steps">
          <div class="inapp-step-title">Android (Chrome) での手順:</div>
          <ol class="inapp-list">
            <li>右上の <strong>「⋮」（メニュー）</strong> をタップ</li>
            <li><strong>「ホーム画面に追加」</strong> または <strong>「アプリをインストール」</strong> を選択</li>
          </ol>
        </div>
      `}

      <div class="inapp-actions">
        ${!isIOS && deferredPrompt ? `
          <button id="btnTriggerInstall" class="inapp-btn inapp-btn-primary">
            📲 今すぐホーム画面に追加
          </button>
        ` : ''}
        <button id="btnClosePWAModal" class="inapp-btn inapp-btn-secondary">
          閉じる
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (!isIOS && deferredPrompt) {
    const btnInstall = document.getElementById('btnTriggerInstall');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
          if (modal) modal.style.display = 'none';
        });
      });
    }
  }

  const btnClose = document.getElementById('btnClosePWAModal');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }
}
