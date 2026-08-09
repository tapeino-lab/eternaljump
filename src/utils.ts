import { safeStorage } from './safeStorage.js';
import { secureStorage } from './secureStorage.js';

export const RND = Math.random;
export const FLR = Math.floor;
export const ABS = Math.abs;
export const MAX = Math.max;
export const MIN = Math.min;
export const SIN = Math.sin;
export const POW = Math.pow;
export const PI = Math.PI;

export const swapRemove = <T>(arr: T[], index: number): void => {
  if (index < 0 || index >= arr.length) return;
  const last = arr.pop()!;
  if (index < arr.length) {
    arr[index] = last;
  }
};

export const hasPlayedOnce = (): boolean => {
  if (safeStorage.getItem('JUMP_HAS_PLAYED') === 'true') {
    return true;
  }
  try {
    const pb = secureStorage.getItem<any>('EternalJumper_PB', null);
    if (pb && typeof pb.alt === 'number' && pb.alt > 0) {
      safeStorage.setItem('JUMP_HAS_PLAYED', 'true');
      return true;
    }
    const coins = secureStorage.getItem<number>('JUMP_TOTAL_COINS', 0);
    if (coins > 0) {
      safeStorage.setItem('JUMP_HAS_PLAYED', 'true');
      return true;
    }
  } catch (e) {}
  return false;
};

export const markHasPlayed = (): void => {
  try {
    safeStorage.setItem('JUMP_HAS_PLAYED', 'true');
  } catch (e) {}
};

export const getLang = (): string => {
  try {
    const raw = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    if (!raw) return '---';

    // Region-specific mappings (e.g. pt-br -> BRA, en-us -> USA)
    const localeMap: Record<string, string> = {
      'pt-br': 'BRA',
      'en-us': 'USA',
      'es-cl': 'CHI',
      'es-do': 'DOM',
      'en-ng': 'NGR',
      'pt-pt': 'POR',
    };
    if (localeMap[raw]) return localeMap[raw];

    // Primary language tag mappings
    const lang = raw.split('-')[0];
    const langMap: Record<string, string> = {
      ja: 'JPN',
      en: 'ENG',
      zh: 'CHN',
      ko: 'KOR',
      es: 'SPA',
      fr: 'FRA',
      de: 'GER',
      ru: 'RUS',
      it: 'ITA',
      pt: 'POR',
      lt: 'LTU', // Lithuanian
      lv: 'LVA', // Latvian
      et: 'EST', // Estonian
      fi: 'FIN', // Finnish
      rsl: 'RSL', // Russian Sign Language
      hy: 'ARM', // Armenian
      he: 'ISR', // Hebrew (Israel)
      iw: 'ISR', // Legacy Hebrew code
      da: 'DNK', // Danish (Scandinavia)
      no: 'NOR', // Norwegian (Scandinavia)
      nb: 'NOR',
      nn: 'NOR',
      sv: 'SWE', // Swedish (Scandinavia)
    };
    if (langMap[lang]) return langMap[lang];

    return lang.length >= 3 ? lang.substring(0, 3).toUpperCase() : '---';
  } catch (e) {
    return '---';
  }
};

export const $ = (i: string): HTMLElement | null => document.getElementById(i);

export const escapeHTML = (str: string | number): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const getPlayerName = (): string => {
  let n = safeStorage.getItem('JUMP_PLAYER_NAME');
  
  // Validate if player name matches "LANG XX" format (3-letter country code + space + 2 chars)
  // Migrate/reset legacy name formats automatically if invalid
  const isValidFormat = n && /^[A-Z]{3}\s[A-Z0-9.\-_!?]{2}$/.test(n);
  
  if (!n || !isValidFormat) {
    let lang = getLang();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randName = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
    n = `${lang} ${randName}`;
    safeStorage.setItem('JUMP_PLAYER_NAME', n);
  }
  return n;
};

