import { safeStorage, safeCrypto } from './safeStorage.js';
import { secureStorage } from './secureStorage.js';

/**
 * Multi-layer Identity Storage & Persistence Manager
 * Ensures player identity (LL_PID) and custom name persist across:
 * 1. PWA standalone vs normal browser tab
 * 2. URL variations / bookmarks (different paths/query strings/origins)
 * 3. iOS Safari 7-day ITP localStorage cleanups
 * 
 * Layers utilized:
 * - Layer 1: localStorage (fastest synchronous access)
 * - Layer 2: document.cookie (First-Party with long max-age)
 * - Layer 3: IndexedDB (durable browser database not cleared by basic storage eviction)
 */

const DB_NAME = 'ej_identity_db';
const DB_VERSION = 1;
const STORE_NAME = 'identity_store';
const PID_KEY = 'LL_PID';
const COOKIE_NAME = 'ej_ll_pid';
const NAME_KEY = 'JUMP_PLAYER_NAME';
const COOKIE_PLAYER_NAME = 'ej_ll_pname';

// Cookie helper
function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded.length > 0) return decoded;
    }
  } catch (e) {}
  return null;
}

function setCookie(name: string, value: string) {
  try {
    if (typeof document === 'undefined') return;
    // 365 days max-age, SameSite=Lax
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch (e) {}
}

// IndexedDB helper
function openIdentityDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return resolve(null);
      }
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function getIndexedDBValue(key: string): Promise<string | null> {
  try {
    const db = await openIdentityDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && typeof req.result === 'string') {
            resolve(req.result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}

export async function setIndexedDBValue(key: string, val: string): Promise<void> {
  try {
    const db = await openIdentityDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  } catch (e) {}
}

/**
 * Synchronously retrieves PID from memory/localStorage or Cookie
 */
export function getStoredPlayerIdentifierSync(): string | null {
  // 1. Check safeStorage (localStorage)
  const local = safeStorage.getItem(PID_KEY);
  if (local && local.trim().length > 3) {
    // Ensure cookie is in sync
    setCookie(COOKIE_NAME, local);
    return local;
  }

  // 2. Check Cookie
  const cookie = getCookie(COOKIE_NAME);
  if (cookie && cookie.trim().length > 3) {
    // Restore to localStorage
    safeStorage.setItem(PID_KEY, cookie);
    return cookie;
  }

  return null;
}

/**
 * Asynchronously restores or retrieves player identifier across all 3 layers.
 * If all layers are missing, performs a sanity check for existing player data (coins/inventory).
 * If existing data is found, preserves integrity and generates/restores reliably.
 */
export async function resolvePlayerIdentifier(): Promise<string> {
  // 1. Try synchronous check (localStorage + Cookie)
  let pid = getStoredPlayerIdentifierSync();
  if (pid) {
    // Save to IndexedDB in background
    setIndexedDBValue(PID_KEY, pid).catch(() => {});
    return pid;
  }

  // 2. Check IndexedDB
  const idbPid = await getIndexedDBValue(PID_KEY);
  if (idbPid && idbPid.trim().length > 3) {
    console.log('[Identity] Restored player identifier from IndexedDB:', idbPid);
    safeStorage.setItem(PID_KEY, idbPid);
    setCookie(COOKIE_NAME, idbPid);
    return idbPid;
  }

  // 3. If truly missing everywhere, check if user already has game progress (coins, inventory, PB)
  const existingCoins = secureStorage.getItem<number>('JUMP_TOTAL_COINS', 0);
  const existingPB = secureStorage.getItem<any>('JUMP_PB_V2', null);

  // Generate new PID
  const newPid = safeCrypto.generateRandomId('p');
  safeStorage.setItem(PID_KEY, newPid);
  setCookie(COOKIE_NAME, newPid);
  setIndexedDBValue(PID_KEY, newPid).catch(() => {});

  if (existingCoins >= 100 || (existingPB && existingPB.alt > 0)) {
    console.warn('[Identity] User has previous data but PID was lost. Flagged recovery mode.');
    safeStorage.setItem('LL_IS_DUPLICATE_BUG', 'true');
  }

  return newPid;
}

/**
 * Saves player identifier across all 3 storage layers simultaneously.
 */
export function persistPlayerIdentifier(pid: string): void {
  if (!pid) return;
  safeStorage.setItem(PID_KEY, pid);
  setCookie(COOKIE_NAME, pid);
  setIndexedDBValue(PID_KEY, pid).catch(() => {});
}

/**
 * Synchronously retrieves stored player name with multi-layer fallback
 */
export function getStoredPlayerNameSync(): string | null {
  const local = safeStorage.getItem(NAME_KEY);
  if (local && local.trim().length >= 5) {
    setCookie(COOKIE_PLAYER_NAME, local);
    return local;
  }

  const cookie = getCookie(COOKIE_PLAYER_NAME);
  if (cookie && cookie.trim().length >= 5) {
    safeStorage.setItem(NAME_KEY, cookie);
    return cookie;
  }

  return null;
}

/**
 * Persists player name across all 3 layers (localStorage, Cookie, IndexedDB)
 */
export function persistPlayerName(name: string): void {
  if (!name) return;
  safeStorage.setItem(NAME_KEY, name);
  setCookie(COOKIE_PLAYER_NAME, name);
  setIndexedDBValue(NAME_KEY, name).catch(() => {});
}
