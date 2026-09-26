import { game } from '../state.js';
import { secureStorage } from '../secureStorage.js';
import { safeStorage } from '../safeStorage.js';
import { LootLockerAPI } from '../lootlocker.js';
import { getLang, MIN, getPlayerName, markHasPlayed } from '../utils.js';
import { RankingAPI } from './api.js';
import { validatePhysicalScore } from '../security.js';
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

          let currentLang = getLang();

          if (onlinePB && typeof onlinePB.alt === 'number') {
            let localPB = secureStorage.getItem<any>(pbKey, null);
            
            let onlineIsBetter = false;
            let localTime = (localPB && typeof localPB.time === 'number' && localPB.time > 0) ? localPB.time : 99999999;
            let onlineTime = (onlinePB && typeof onlinePB.time === 'number' && onlinePB.time > 0) ? onlinePB.time : 99999999;
            if (!localPB || 
                onlinePB.alt > localPB.alt || 
                (onlinePB.alt === localPB.alt && onlinePB.coins > localPB.coins) || 
                (onlinePB.alt === localPB.alt && onlinePB.coins === localPB.coins && onlineTime < localTime)) {
              onlineIsBetter = true;
            }

            let localIsBetter = false;
            if (localPB && typeof localPB.alt === 'number' && localPB.alt > 0) {
              let localCoins = localPB.coins || 0;
              let onlineCoins = onlinePB.coins || 0;
              if (localPB.alt > onlinePB.alt || 
                  (localPB.alt === onlinePB.alt && localCoins > onlineCoins) || 
                  (localPB.alt === onlinePB.alt && localCoins === onlineCoins && localTime < onlineTime)) {
                localIsBetter = true;
              }
            }

            if (onlineIsBetter) {
              secureStorage.setItem(pbKey, onlinePB);
              if (!game.personalBest || game.personalBest.alt <= onlinePB.alt) {
                game.personalBest = onlinePB;
              }
            } else if (localIsBetter) {
              // Local is strictly better than online -> Upload local PB to server to fix desync
              const v = validatePhysicalScore(localPB.alt, localPB.coins || 0, localPB.time || 0);
              if (v.valid) {
                LootLockerAPI.submitScore(localPB.alt, localPB.coins || 0, localPB.time || 0, currentLang).then(res => {
                  if (res) {
                    safeStorage.setItem('LL_LAST_FETCH', '0');
                  }
                });
              }
            }
          } else if (onlinePB && onlinePB.notFound) {
            // Player preservation: If online PB is not found but local PB exists,
            // check anti-cheat physical validity before re-submitting to restore server sync.
            let localPB = secureStorage.getItem<any>(pbKey, null);
            if (localPB && typeof localPB.alt === 'number' && localPB.alt > 0) {
              const v = validatePhysicalScore(localPB.alt, localPB.coins || 0, localPB.time || 0);
              if (v.valid) {
                LootLockerAPI.submitScore(localPB.alt, localPB.coins || 0, localPB.time || 0, currentLang).then(res => {
                  if (res) {
                    safeStorage.setItem('LL_LAST_FETCH', '0');
                  }
                });
              }
            }
          }

          // Clean up corrupted local TAPB if time > 24 hours
          let localTAPBCheck = secureStorage.getItem<any>(taPbKey, null);
          if (localTAPBCheck && (typeof localTAPBCheck.time !== 'number' || localTAPBCheck.time >= 86400000 || localTAPBCheck.time <= 0)) {
            secureStorage.removeItem(taPbKey);
          }

          if (onlineTAPB && typeof onlineTAPB.time === 'number' && onlineTAPB.time > 0 && onlineTAPB.time < 86400000) {
            let localTAPB = secureStorage.getItem<any>(taPbKey, null);
            let localTime = (localTAPB && typeof localTAPB.time === 'number' && localTAPB.time > 0) ? localTAPB.time : 99999999;

            if (!localTAPB || typeof localTAPB.time !== 'number' || localTAPB.time <= 0 || onlineTAPB.time < localTime) {
              secureStorage.setItem(taPbKey, { time: onlineTAPB.time });
            } else if (localTAPB && typeof localTAPB.time === 'number' && localTAPB.time > 0 && localTAPB.time < onlineTAPB.time) {
              // Local TA PB is better than online -> upload local TA PB to server
              let localPB = secureStorage.getItem<any>(pbKey, null);
              let alt = (localPB && typeof localPB.alt === 'number') ? localPB.alt : 144000;
              let coins = (localPB && typeof localPB.coins === 'number') ? localPB.coins : 0;
              const v = validatePhysicalScore(alt, coins, localTAPB.time);
              if (v.valid) {
                LootLockerAPI.submitTimeAttackScore(localTAPB.time, alt, coins, currentLang).then(res => {
                  if (res) {
                    safeStorage.setItem('LL_LAST_TA_FETCH', '0');
                  }
                });
              }
            }
          } else if (onlineTAPB && onlineTAPB.notFound) {
            // Player preservation: If online TA PB is not found but local TA record exists,
            // check anti-cheat physical validity before re-submitting to restore server sync.
            let localTAPB = secureStorage.getItem<any>(taPbKey, null);
            if (localTAPB && typeof localTAPB.time === 'number' && localTAPB.time > 0 && localTAPB.time < 86400000) {
              let localPB = secureStorage.getItem<any>(pbKey, null);
              let alt = (localPB && typeof localPB.alt === 'number') ? localPB.alt : 144000;
              let coins = (localPB && typeof localPB.coins === 'number') ? localPB.coins : 0;
              const v = validatePhysicalScore(alt, coins, localTAPB.time);
              if (v.valid) {
                LootLockerAPI.submitTimeAttackScore(localTAPB.time, alt, coins, currentLang).then(res => {
                  if (res) {
                    safeStorage.setItem('LL_LAST_TA_FETCH', '0');
                  }
                });
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
              let fetched = await LootLockerAPI.getScores();
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
                  let pTime = (typeof p.time === 'number' && p.time > 0) ? p.time : (typeof p.t === 'number' ? p.t : 0);
                  scores.push({ id: pid, alt: p.alt, coins: p.coins, lang: p.lang, n: playerName, t: pTime, time: pTime });
                });
                scores.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || (((A.time || A.t || 99999999) - (B.time || B.t || 99999999))));
                
                // Deduplicate to keep only best score per player
                let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : safeStorage.getItem('LL_SYS_PLAYER_ID');
                let uniqueScores = [];
                let seen = new Set();
                scores.forEach(s => {
                  let id = String(s.id);
                  let isMe = (id === String(pid) || (pIdVal && id === String(pIdVal)) || (s.n && s.n === playerName && s.n !== '???'));
                  let dedupKey = isMe ? '__ME__' : (id || s.n);
                  if (!seen.has(dedupKey)) {
                    seen.add(dedupKey);
                    uniqueScores.push(s);
                  }
                });
                scores = uniqueScores;
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
              s.sort((A: any, B: any) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || (A.time || 99999999) - (B.time || 99999999));
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
              let fetched = await LootLockerAPI.getTimeAttackScores();
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
            
            // Merge pending offline TA scores
            try {
              let pendingTA = JSON.parse(safeStorage.getItem('LL_PENDING_TA_SCORES') || '[]');
              if (pendingTA.length > 0) {
                let pid = LootLockerAPI.playerIdentifier;
                let playerName = getPlayerName();
                if (!scores) scores = [];
                pendingTA.forEach(p => {
                  let pTime = (typeof p.time === 'number' && p.time > 0) ? p.time : (typeof p.t === 'number' ? p.t : 0);
                  scores.push({ id: pid, alt: p.alt || 144000, coins: p.coins || 0, lang: p.lang, n: playerName, t: pTime, time: pTime });
                });
                scores.sort((A, B) => ((A.time || A.t || 99999999) - (B.time || B.t || 99999999)) || (B.coins || 0) - (A.coins || 0));
                
                // Deduplicate to keep only best score per player
                let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : safeStorage.getItem('LL_SYS_PLAYER_ID');
                let uniqueScores = [];
                let seen = new Set();
                scores.forEach(s => {
                  let id = String(s.id);
                  let isMe = (id === String(pid) || (pIdVal && id === String(pIdVal)) || (s.n && s.n === playerName && s.n !== '???'));
                  let dedupKey = isMe ? '__ME__' : (id || s.n);
                  if (!seen.has(dedupKey)) {
                    seen.add(dedupKey);
                    uniqueScores.push(s);
                  }
                });
                scores = uniqueScores;
                scores.forEach((s, i) => s.rank = i + 1);
              }
            } catch(e) {
              safeStorage.removeItem('LL_PENDING_TA_SCORES');
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
            let myEntry = { id: pid, alt, coins, time, t: time, lang, n: playerName };

            if (existingIndex !== -1) {
              let current = scores[existingIndex];
              let curTime = (typeof current.time === 'number' && current.time > 0) ? current.time : (current.t || 99999999);
              if (alt > current.alt || (alt === current.alt && coins > current.coins) || (alt === current.alt && coins === current.coins && time < curTime)) {
                scores[existingIndex] = { ...current, ...myEntry };
              }
            } else {
              scores.push(myEntry);
            }
            scores.sort((A, B) => (B.alt || 0) - (A.alt || 0) || (B.coins || 0) - (A.coins || 0) || (((A.time || A.t || 99999999) - (B.time || B.t || 99999999))));
            scores.forEach((item, idx) => item.rank = idx + 1);
            safeStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
          } else {
            let raw = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
            let scores: any[] = raw ? JSON.parse(raw) : [];
            let existingIndex = scores.findIndex(s => String(s.id) === String(pid) || (s.n && s.n === playerName));
            let myEntry = { id: pid, alt, coins, t: time, time, lang, n: playerName };

            if (existingIndex !== -1) {
              let current = scores[existingIndex];
              let curT = (typeof current.time === 'number' && current.time > 0) ? current.time : (typeof current.t === 'number' ? current.t : 0);
              if (typeof curT !== 'number' || curT === 0 || time < curT) {
                scores[existingIndex] = { ...current, ...myEntry };
              }
            } else {
              scores.push(myEntry);
            }
            scores.sort((A, B) => ((typeof A.time === 'number' && A.time > 0) ? A.time : (A.t || 99999999)) - ((typeof B.time === 'number' && B.time > 0) ? B.time : (B.t || 99999999)) || (B.coins || 0) - (A.coins || 0));
            scores.forEach((item, idx) => item.rank = idx + 1);
            safeStorage.setItem('LL_CACHED_TA_LEADERBOARD', JSON.stringify(scores));
          }
        } catch(e) {}
      }

      export const saveScore = async function(a, t, c, r) {
        if (game.debugUsed) return;
        markHasPlayed();
        if (game.demoMode && !game.allowAutoRank) return;
        if (!a || a <= 0) return; // Exclude 0m scores

        // Anti-Cheat: Verify physical score validity before recording PB or submitting
        const valCheck = validatePhysicalScore(a, c, t);
        if (!valCheck.valid) {
          console.warn('[Anti-Cheat] Rejected invalid score run:', valCheck.reason, { alt: a, coins: c, time: t });
          return;
        }

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
        let prevPBTime = (localPB && typeof localPB.time === 'number' && localPB.time > 0) ? localPB.time : 99999999;
        let currTime = (cObj.time && cObj.time > 0) ? cObj.time : 99999999;
        if (!localPB || cObj.alt > localPB.alt || (cObj.alt === localPB.alt && cObj.coins > localPB.coins) || (cObj.alt === localPB.alt && cObj.coins === localPB.coins && currTime < prevPBTime)) {
          isNewRecordLocal = true;
          game.isNewRecord = true;
          secureStorage.setItem(pbKey, cObj);
          game.personalBest = cObj;
        }

        let isNewTARecordLocal = false;
        if (r === 'CLEAR' || a >= 144000) {
          let taPbKey = RankingAPI.taPbKey;
          let localTAPB = secureStorage.getItem<any>(taPbKey, null);
          let prevTATime = (localTAPB && typeof localTAPB.time === 'number' && localTAPB.time > 0) ? localTAPB.time : 99999999;
          if (!localTAPB || typeof localTAPB.time !== 'number' || localTAPB.time <= 0 || t < prevTATime) {
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
          if (isNewTARecordLocal) {
            submitTasks.push(LootLockerAPI.submitTimeAttackScore(t, a, c, l).then(res => {
              if (res) safeStorage.setItem('LL_LAST_TA_FETCH', '0');
            }));
          }
          // Always submit latest coin total to register active play timestamp, device & region
          submitTasks.push(LootLockerAPI.submitCoinScore(game.totalCoins || 0, l));

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
              let ca = s[ex].alt, cc = s[ex].coins || 0;
              let ct = (s[ex].time && s[ex].time > 0) ? s[ex].time : 99999999;
              let nt = (game.lastScoreObj.time && game.lastScoreObj.time > 0) ? game.lastScoreObj.time : 99999999;
              if (a > ca || (a === ca && c > cc) || (a === ca && c === cc && nt < ct)) {
                s[ex] = game.lastScoreObj;
              }
            } else {
              s.push(game.lastScoreObj);
            }
            s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || (A.time || 99999999) - (B.time || 99999999));
            game.lastRank = s.findIndex(x => x.id === pid) + 1;
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
