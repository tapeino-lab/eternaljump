export const RND = Math.random;
export const FLR = Math.floor;
export const ABS = Math.abs;
export const MAX = Math.max;
export const MIN = Math.min;
export const SIN = Math.sin;
export const POW = Math.pow;
export const PI = Math.PI;

export const getLang = () => {
  try {
    let l = (navigator.language || navigator.userLanguage || '').split('-')[0].toLowerCase();
    let m = { ja: 'JPN', en: 'ENG', zh: 'CHN', ko: 'KOR', es: 'SPA', fr: 'FRA', de: 'GER', ru: 'RUS', it: 'ITA', pt: 'POR' };
    return m[l] || (l.length >= 3 ? l.substring(0, 3).toUpperCase() : '---');
  } catch (e) {
    return '---';
  }
};
export const $ = i => document.getElementById(i);

export const escapeHTML = str => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const getPlayerName = () => {
  let n = localStorage.getItem('JUMP_PLAYER_NAME');
  
  // 新しい「LANG XX」形式（3桁国コード + 半角スペース + 2桁英数字）に適合しているかチェック
  // 適合していない古いID（例：かつての8桁などの文字列）の場合は、自動で新しい仕様にリセット・マイグレーションする
  const isValidFormat = n && /^[A-Z]{3}\s[A-Z0-9]{2}$/.test(n);
  
  if (!n || !isValidFormat) {
    let lang = getLang();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randName = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
    n = `${lang} ${randName}`;
    localStorage.setItem('JUMP_PLAYER_NAME', n);
  }
  return n;
};

