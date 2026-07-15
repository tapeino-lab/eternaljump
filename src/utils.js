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
