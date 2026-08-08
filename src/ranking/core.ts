import { game } from '../state.js';
import { setIgnoreNextTap } from '../lifecycle.js';

import { secureStorage } from '../secureStorage.js';
import { safeStorage } from '../safeStorage.js';

import { $ } from '../utils.js';
import { LootLockerAPI } from '../lootlocker.js';
import { getLang, MIN, escapeHTML, getPlayerName, markHasPlayed } from '../utils.js';

import { RankingAPI } from './api.js';
      export const hasLootLocker = function() {
        return LootLockerAPI.hasLootLockerConfig === true;
}
      export const syncPersonalBest = function(bypassCache = false) {
        if (bypassCache) {
          RankingAPI.syncPersonalBestPromise = null;
        }
        if (RankingAPI.syncPersonalBestPromise) return RankingAPI.syncPersonalBestPromise;
        RankingAPI.syncPersonalBestPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (!isConfigured) return;
          
          // Submit any updated total coins count at the beginning
          LootLockerAPI.syncTotalCoins();
          
          let onlinePB = await LootLockerAPI.getMemberScore();
          let onlineTAPB = await LootLockerAPI.getMemberTAScore();
          let pbKey = RankingAPI.pbKey;
          let taPbKey = RankingAPI.taPbKey;
          
          let pending = [];
          try {
            pending = JSON.parse(safeStorage.getItem('LL_PENDING_SCORES') || '[]');
          } catch(e) {
            safeStorage.removeItem('LL_PENDING_SCORES');
          }

          if (onlinePB && typeof onlinePB.alt === 'number') {
            let localPB = secureStorage.getItem<any>(pbKey, null);
            
            let onlineIsBetter = false;
            if (!localPB || 
                onlinePB.alt > localPB.alt || 
                (onlinePB.alt === localPB.alt && onlinePB.coins > localPB.coins) || 
                (onlinePB.alt === localPB.alt && onlinePB.coins === localPB.coins && onlinePB.time < localPB.time)) {
              onlineIsBetter = true;
            }

            if (onlineIsBetter || pending.length === 0) {
              secureStorage.setItem(pbKey, onlinePB);
              if (game.personalBest && game.personalBest.alt === onlinePB.alt) {
                game.personalBest.time = onlinePB.time;
                game.personalBest.coins = onlinePB.coins;
              }
            }
          } else if (onlinePB && onlinePB.notFound) {
            if (pending.length === 0) {
              secureStorage.removeItem(pbKey);
              if (game.personalBest) {
                game.personalBest = null;
              }
            }
          }

          // Clean up corrupted local TAPB if time > 24 hours
          let localTAPBCheck = secureStorage.getItem<any>(taPbKey, null);
          if (localTAPBCheck && (typeof localTAPBCheck.time !== 'number' || localTAPBCheck.time >= 86400000 || localTAPBCheck.time <= 0)) {
            secureStorage.removeItem(taPbKey);
          }

          if (onlineTAPB && typeof onlineTAPB.time === 'number' && onlineTAPB.time > 0 && onlineTAPB.time < 86400000) {
            if (pending.length === 0) {
              secureStorage.setItem(taPbKey, { time: onlineTAPB.time });
            } else {
              let localTAPB = secureStorage.getItem<any>(taPbKey, null);
              if (!localTAPB || typeof localTAPB.time !== 'number' || onlineTAPB.time <= localTAPB.time) {
                secureStorage.setItem(taPbKey, { time: onlineTAPB.time });
              }
            }
          } else if (onlineTAPB && onlineTAPB.notFound) {
            if (pending.length === 0) {
              secureStorage.removeItem(taPbKey);
            }
          }
        })();
        return RankingAPI.syncPersonalBestPromise;
}
      export const prefetchScores = function(forceNetwork = false) {
        RankingAPI.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            await RankingAPI.syncPersonalBest(forceNetwork);
            let scores = null;
            let now = Date.now();
            let lastFetch = parseInt(safeStorage.getItem('LL_LAST_FETCH') || '0');
            
            // Cache for 60 seconds during play, or 10 minutes in demo mode
            let cacheDuration = (game && game.state === 'demo') ? 600000 : 60000;

            if (!forceNetwork && (now - lastFetch) < cacheDuration) {
              try {
                let cached = safeStorage.getItem('LL_CACHED_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {
                safeStorage.removeItem('LL_CACHED_LEADERBOARD');
              }
            }
            
            if (!scores) {
              let fetched = await LootLockerAPI.getScores(200);
              if (Array.isArray(fetched)) {
                scores = fetched;
                safeStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
                safeStorage.setItem('LL_LAST_FETCH', now.toString());
              } else {
                try {
                  let cached = safeStorage.getItem('LL_CACHED_LEADERBOARD');
                  if (cached) scores = JSON.parse(cached);
                } catch(e) {
                  safeStorage.removeItem('LL_CACHED_LEADERBOARD');
                }
              }
            }
            
            // Merge pending offline scores
            try {
              let pending = JSON.parse(safeStorage.getItem('LL_PENDING_SCORES') || '[]');
              if (pending.length > 0) {
                let pid = LootLockerAPI.playerIdentifier;
                let playerName = getPlayerName();
                if (!scores) scores = [];
                pending.forEach(p => {
                  scores.push({ id: pid, alt: p.alt, coins: p.coins, lang: p.lang, n: playerName, t: p.t });
                });
                scores.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.t - B.t);
                
                // Deduplicate by ID to keep only best score per player (if they appear multiple times)
                let uniqueScores = [];
                let seen = new Set();
                scores.forEach(s => {
                  let id = String(s.id);
                  if (!seen.has(id)) {
                    seen.add(id);
                    uniqueScores.push(s);
                  }
                });
                scores = uniqueScores.slice(0, 100);
                scores.forEach((s, i) => s.rank = i + 1);
              }
            } catch(e) {
              safeStorage.removeItem('LL_PENDING_SCORES');
            }
            
            return scores || [];
          } else {
            try {
              let cached = safeStorage.getItem('LL_CACHED_LEADERBOARD');
              if (cached) {
                  let s = JSON.parse(cached);
                  if (Array.isArray(s) && s.length > 0) return s;
              }
              let s = secureStorage.getItem<any[]>(RankingAPI.key, []);
              s.sort((A: any, B: any) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
              return s.map((r: any, i: number) => ({ ...r, rank: i + 1 }));
            } catch (e) {
              secureStorage.removeItem(RankingAPI.key);
              return [];
            }
          }
        })();
}
      export const getScores = async function(bypassCache = false) {
        if (bypassCache || !RankingAPI.prefetchedScoresPromise) {
          RankingAPI.prefetchScores(bypassCache);
        }
        const s = await RankingAPI.prefetchedScoresPromise;
        if (bypassCache) {
          RankingAPI.prefetchedScoresPromise = null;
        }
        return s;
      }
      
      export const prefetchTAScores = function(forceNetwork = false) {
        RankingAPI.prefetchedTAScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            await RankingAPI.syncPersonalBest(forceNetwork);
            let scores = null;
            let now = Date.now();
            let lastFetch = parseInt(safeStorage.getItem('LL_LAST_TA_FETCH') || '0');
            
            // Cache for 60 seconds during play, or 10 minutes in demo mode
            let cacheDuration = (game && game.state === 'demo') ? 600000 : 60000;
            if (!forceNetwork && (now - lastFetch) < cacheDuration) {
              try {
                let cached = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {
                safeStorage.removeItem('LL_CACHED_TA_LEADERBOARD');
              }
            }
            
            if (!scores) {
              let fetched = await LootLockerAPI.getTimeAttackScores(100);
              if (Array.isArray(fetched)) {
                scores = fetched;
                safeStorage.setItem('LL_CACHED_TA_LEADERBOARD', JSON.stringify(scores));
                safeStorage.setItem('LL_LAST_TA_FETCH', now.toString());
              } else {
                try {
                  let cached = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
                  if (cached) scores = JSON.parse(cached);
                } catch(e) {
                  safeStorage.removeItem('LL_CACHED_TA_LEADERBOARD');
                }
              }
            }
            
            return scores || [];
          } else {
            try {
              let cached = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
              if (cached) {
                  let s = JSON.parse(cached);
                  if (Array.isArray(s) && s.length > 0) return s;
              }
              return [];
            } catch (e) {
              return [];
            }
          }
        })();
      }

      export const getTimeAttackScores = async function(bypassCache = false) {
        if (bypassCache || !RankingAPI.prefetchedTAScoresPromise) {
          RankingAPI.prefetchTAScores(bypassCache);
        }
        const s = await RankingAPI.prefetchedTAScoresPromise;
        if (bypassCache) {
          RankingAPI.prefetchedTAScoresPromise = null;
        }
        return s;
      }
      export function updateOptimisticCache(alt: number, coins: number, time: number, isTA: boolean = false) {
        try {
          let pid = LootLockerAPI.playerIdentifier;
          let playerName = getPlayerName();
          let lang = getLang();

          if (!isTA) {
            let raw = safeStorage.getItem('LL_CACHED_LEADERBOARD');
            let scores: any[] = raw ? JSON.parse(raw) : [];
            let existingIndex = scores.findIndex(s => String(s.id) === String(pid) || (s.n && s.n === playerName));
            let myEntry = { id: pid, alt, coins, time, lang, n: playerName };

            if (existingIndex !== -1) {
              let current = scores[existingIndex];
              if (alt > current.alt || (alt === current.alt && coins > current.coins) || (alt === current.alt && coins === current.coins && time < current.time)) {
                scores[existingIndex] = { ...current, ...myEntry };
              }
            } else {
              scores.push(myEntry);
            }
            scores.sort((A, B) => (B.alt || 0) - (A.alt || 0) || (B.coins || 0) - (A.coins || 0) || (A.time || 0) - (B.time || 0));
            scores = scores.slice(0, 100);
            scores.forEach((item, idx) => item.rank = idx + 1);
            safeStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
          } else {
            let raw = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
            let scores: any[] = raw ? JSON.parse(raw) : [];
            let existingIndex = scores.findIndex(s => String(s.id) === String(pid) || (s.n && s.n === playerName));
            let myEntry = { id: pid, alt, coins, t: time, time, lang, n: playerName };

            if (existingIndex !== -1) {
              let current = scores[existingIndex];
              let curT = (typeof current.t === 'number') ? current.t : current.time;
              if (typeof curT !== 'number' || time < curT) {
                scores[existingIndex] = { ...current, ...myEntry };
              }
            } else {
              scores.push(myEntry);
            }
            scores.sort((A, B) => ((typeof A.t === 'number') ? A.t : A.time || 0) - ((typeof B.t === 'number') ? B.t : B.time || 0));
            scores = scores.slice(0, 100);
            scores.forEach((item, idx) => item.rank = idx + 1);
            safeStorage.setItem('LL_CACHED_TA_LEADERBOARD', JSON.stringify(scores));
          }
        } catch(e) {}
      }

      export const saveScore = async function(a, t, c, r) {
        if (game.debugUsed) return;
        markHasPlayed();
        if (game.demoMode && !game.allowAutoRank) return;
        let l = getLang(), pid = LootLockerAPI.playerIdentifier;
        game.lastScoreObj = { id: pid, alt: MIN(a, 144000), time: t, coins: c, reason: r, lang: l };
        game.lastScoreId = pid;
        let pbKey = RankingAPI.pbKey;
        game.isNewRecord = false;
        game.isNewTARecord = false;
        game.personalBest = null;
        let cObj = { alt: game.lastScoreObj.alt, coins: game.lastScoreObj.coins, time: game.lastScoreObj.time };
        
        let localPB = secureStorage.getItem<any>(pbKey, null);
        if (localPB && typeof localPB.alt === 'number') {
          game.personalBest = localPB;
        } else {
          localPB = null;
        }

        let isNewRecordLocal = false;
        if (!localPB || cObj.alt > localPB.alt || (cObj.alt === localPB.alt && cObj.coins > localPB.coins) || (cObj.alt === localPB.alt && cObj.coins === localPB.coins && cObj.time < localPB.time)) {
          isNewRecordLocal = true;
          game.isNewRecord = true;
          secureStorage.setItem(pbKey, cObj);
          game.personalBest = cObj;
        }

        let isNewTARecordLocal = false;
        if (r === 'CLEAR' || a >= 144000) {
          let taPbKey = RankingAPI.taPbKey;
          let localTAPB = secureStorage.getItem<any>(taPbKey, null);
          if (!localTAPB || typeof localTAPB.time !== 'number' || t < localTAPB.time) {
            isNewTARecordLocal = true;
            game.isNewTARecord = true;
            secureStorage.setItem(taPbKey, { time: t });
          } else {
            game.isNewTARecord = false;
          }
        }

        // Perform immediate optimistic update to local cache
        if (game.isNewRecord) {
          updateOptimisticCache(MIN(a, 144000), c, t, false);
        }
        if (game.isNewTARecord) {
          updateOptimisticCache(MIN(a, 144000), c, t, true);
        }

        const isConfigured = await LootLockerAPI.checkConfig();
        
        if (isConfigured) {
          // Immediately start background prefetch with current cache
          RankingAPI.prefetchScores(false);
          RankingAPI.prefetchTAScores(false);

          let submitTasks: Promise<any>[] = [];
          if (isNewRecordLocal) {
            submitTasks.push(LootLockerAPI.submitScore(a, c, t, l).then(res => {
              if (res) safeStorage.setItem('LL_LAST_FETCH', '0');
            }));
          }
          if (r === 'CLEAR' || a >= 144000) {
            submitTasks.push(LootLockerAPI.submitTimeAttackScore(t, a, c, l).then(res => {
              if (res) safeStorage.setItem('LL_LAST_TA_FETCH', '0');
            }));
          }

          // When network submission completes, refresh cache from server
          if (submitTasks.length > 0) {
            Promise.all(submitTasks).then(() => {
              RankingAPI.prefetchScores(true);
              RankingAPI.prefetchTAScores(true);
            });
          }
        } else {
          try {
            let s = await RankingAPI.getScores();
            let ex = s.findIndex(x => x.id === pid);
            if (ex !== -1) {
              let ca = s[ex].alt, cc = s[ex].coins;
              if (a > ca || (a === ca && c > cc)) s[ex] = game.lastScoreObj;
            } else {
              s.push(game.lastScoreObj);
            }
            s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
            game.lastRank = s.findIndex(x => x.id === pid) + 1;
            s = s.slice(0, 100);
            secureStorage.setItem(RankingAPI.key, s);
          } catch (e) {}
        }
}
      export const reset = function() {
        try {
          secureStorage.removeItem(RankingAPI.key);
          secureStorage.removeItem(RankingAPI.pbKey);
          secureStorage.removeItem(RankingAPI.taPbKey);
          alert('RANKING CLEARED!')
        } catch (e) {}
}
