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
      export const syncPersonalBest = function() {
        if (RankingAPI.syncPersonalBestPromise) return RankingAPI.syncPersonalBestPromise;
        RankingAPI.syncPersonalBestPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (!isConfigured) return;
          let onlinePB = await LootLockerAPI.getMemberScore();
          let pbKey = RankingAPI.pbKey;
          
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
            }
          } else if (onlinePB && onlinePB.notFound) {
            if (pending.length === 0) {
              secureStorage.removeItem(pbKey);
              if (game.personalBest) {
                game.personalBest = null;
              }
            }
          }
        })();
        return RankingAPI.syncPersonalBestPromise;
}
      export const prefetchScores = function(forceNetwork = false) {
        RankingAPI.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            await RankingAPI.syncPersonalBest();
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
              scores = await LootLockerAPI.getScores(100);
              if (scores && scores.length > 0) {
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
            
            return scores;
          } else {
            try {
              let s = secureStorage.getItem<any[]>(RankingAPI.key, []);
              s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
              return s.map((r, i) => ({ ...r, rank: i + 1 }));
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
        RankingAPI.prefetchedScoresPromise = null;
        return s;
      }
      
      export const prefetchTAScores = function(forceNetwork = false) {
        RankingAPI.prefetchedTAScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
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
              scores = await LootLockerAPI.getTimeAttackScores(100);
              if (scores && scores.length > 0) {
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
            
            return scores;
          }
          return [];
        })();
      }

      export const getTimeAttackScores = async function(bypassCache = false) {
        if (bypassCache || !RankingAPI.prefetchedTAScoresPromise) {
          RankingAPI.prefetchTAScores(bypassCache);
        }
        const s = await RankingAPI.prefetchedTAScoresPromise;
        RankingAPI.prefetchedTAScoresPromise = null;
        return s;
      }
      export const saveScore = async function(a, t, c, r) {
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
          if (!localTAPB || t < localTAPB.time) {
            isNewTARecordLocal = true;
            game.isNewTARecord = true;
            secureStorage.setItem(taPbKey, { time: t });
          }
        }

        const isConfigured = await LootLockerAPI.checkConfig();
        
        if (isConfigured) {
          if (isNewRecordLocal) {
            let res = await LootLockerAPI.submitScore(a, c, t, l);
            if (res) {
              safeStorage.setItem('LL_LAST_FETCH', '0'); // Force fetch next time
            }
          }
          if (r === 'CLEAR' || a >= 144000) {
            await LootLockerAPI.submitTimeAttackScore(t, a, c, l);
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
        // Start background prefetch of scores immediately for latest values
        RankingAPI.prefetchScores(game.isNewRecord);
        RankingAPI.prefetchTAScores(game.isNewTARecord);
}
      export const reset = function() {
        try {
          secureStorage.removeItem(RankingAPI.key);
          secureStorage.removeItem(RankingAPI.pbKey);
          alert('RANKING CLEARED!')
        } catch (e) {}
}
