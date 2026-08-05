/**
 * Safe LocalStorage Wrapper & Crypto Utility
 * Handles browser privacy restrictions (e.g. Incognito/Private Mode, third-party cookies disabled,
 * restricted Web Crypto API in insecure/iframe contexts) gracefully without throwing uncaught
 * SecurityErrors, DOMExceptions or causing unhandled rejections/freezes.
 */

const memoryStore = new Map<string, string>();

function checkLocalStorageSupport(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__safe_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

let isLocalStorageAvailable = checkLocalStorageSupport();

export const safeStorage = {
  getItem(key: string): string | null {
    if (isLocalStorageAvailable) {
      try {
        const value = window.localStorage.getItem(key);
        if (value !== null) return value;
      } catch (e) {
        isLocalStorageAvailable = false;
      }
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        isLocalStorageAvailable = false;
      }
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key);
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        isLocalStorageAvailable = false;
      }
    }
  },

  clear(): void {
    memoryStore.clear();
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.clear();
      } catch (e) {
        isLocalStorageAvailable = false;
      }
    }
  }
};

/**
 * Safe Crypto Random Values / Random String Utility
 * Prevents freezes or crashes when crypto API is blocked in private browsing / iframe contexts
 */
export const safeCrypto = {
  getRandomValues(buffer: Uint8Array): Uint8Array {
    try {
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
        return window.crypto.getRandomValues(buffer);
      }
    } catch (e) {
      // Fallback if crypto.getRandomValues throws SecurityError or is unsupported
    }
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },

  generateRandomId(prefix: string = 'id'): string {
    try {
      const arr = new Uint8Array(8);
      this.getRandomValues(arr);
      const str = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
      return `${prefix}_${str}`;
    } catch (e) {
      return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
    }
  }
};

