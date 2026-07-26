import { safeStorage } from './safeStorage.js';

/**
 * Secure Storage Utility
 * Provides XOR obfuscation + FNV-1a checksum verification for sensitive local storage values
 * (e.g., total coins, personal best scores) to prevent casual Developer Tools editing.
 */

const APP_SALT = 'EJ_SECURE_STORAGE_SALT_2026_v1';
const XOR_KEY = 'EJ_KEY_94';

/**
 * FNV-1a 32-bit hash algorithm for checksum computation
 */
function computeChecksum(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Basic XOR cipher for text obfuscation
 */
function xorTransform(input: string, key: string): string {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return output;
}

/**
 * Encode string to Base64 (UTF-8 safe)
 */
function encode(str: string): string {
  try {
    const xored = xorTransform(str, XOR_KEY);
    return btoa(encodeURIComponent(xored));
  } catch (e) {
    return str;
  }
}

/**
 * Decode string from Base64 (UTF-8 safe)
 */
function decode(str: string): string {
  try {
    const xored = decodeURIComponent(atob(str));
    return xorTransform(xored, XOR_KEY);
  } catch (e) {
    return '';
  }
}

export const secureStorage = {
  /**
   * Securely store data into localStorage with checksum and obfuscation
   */
  setItem<T>(key: string, data: T): void {
    try {
      const payload = JSON.stringify(data);
      const checksum = computeChecksum(payload + APP_SALT);
      const record = JSON.stringify({ payload, checksum });
      const encrypted = encode(record);
      safeStorage.setItem(key, encrypted);
    } catch (e) {
      // Ignore storage errors in restricted contexts
    }
  },

  /**
   * Retrieve and verify data from localStorage.
   * If corrupted or tampered, returns fallback default value.
   */
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const raw = safeStorage.getItem(key);
      if (!raw) return defaultValue;

      // 1. Try reading as secure obfuscated record
      try {
        const decoded = decode(raw);
        if (decoded) {
          const parsed = JSON.parse(decoded);
          if (parsed && typeof parsed.payload === 'string' && typeof parsed.checksum === 'string') {
            const expectedChecksum = computeChecksum(parsed.payload + APP_SALT);
            if (parsed.checksum === expectedChecksum) {
              return JSON.parse(parsed.payload) as T;
            } else {
              return defaultValue;
            }
          }
        }
      } catch (e) {
        // Decode or parse failed, move to fallback check
      }

      // 2. Legacy fallback check (for unencrypted existing saved data)
      try {
        // Try parsing raw as direct JSON
        const legacyParsed = JSON.parse(raw);
        if (legacyParsed !== null && legacyParsed !== undefined) {
          // Automatically migrate legacy value to secure format
          this.setItem(key, legacyParsed);
          return legacyParsed as T;
        }
      } catch (e) {
        // If raw is a legacy plain string/number (e.g. "150")
        if (typeof defaultValue === 'number') {
          const num = parseInt(raw, 10);
          if (!isNaN(num)) {
            this.setItem(key, num as unknown as T);
            return num as unknown as T;
          }
        }
      }
    } catch (e) {
      return defaultValue;
    }

    // Unrecognized or invalid format -> fallback to defaultValue
    return defaultValue;
  },

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    safeStorage.removeItem(key);
  }
};
