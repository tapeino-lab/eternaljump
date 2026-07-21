import { game } from './state.js';
import { setIgnoreNextTap } from './game.js';

import { $ } from './utils.js';
import { LootLockerAPI } from './lootlocker.js';
import { getLang, MIN, escapeHTML, getPlayerName } from './utils.js';

    export const RankingAPI = {
      key: 'EternalJumper_Rankings',
      pbKey: 'EternalJumper_PB',
      version: 'v1.58.00 - 2026/07/21 10:12 (JST)',
      isShowingResult: false,
      prefetchedScoresPromise: null,
      hasLootLocker: function() {
        return LootLockerAPI.hasLootLockerConfig === true;
      },
      syncPersonalBestPromise: null,
      syncPersonalBest: function() {
        if (this.syncPersonalBestPromise) return this.syncPersonalBestPromise;
        this.syncPersonalBestPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (!isConfigured) return;
          let onlinePB = await LootLockerAPI.getMemberScore();
          let pbKey = this.pbKey;
          
          let pending = [];
          try {
            pending = JSON.parse(localStorage.getItem('LL_PENDING_SCORES') || '[]');
          } catch(e) {
            localStorage.removeItem('LL_PENDING_SCORES');
          }

          if (onlinePB && typeof onlinePB.alt === 'number') {
            let storedPB = localStorage.getItem(pbKey);
            let localPB = null;
            try { if (storedPB) localPB = JSON.parse(storedPB); } catch(e) { localStorage.removeItem(pbKey); }
            
            let onlineIsBetter = false;
            if (!localPB || 
                onlinePB.alt > localPB.alt || 
                (onlinePB.alt === localPB.alt && onlinePB.coins > localPB.coins) || 
                (onlinePB.alt === localPB.alt && onlinePB.coins === localPB.coins && onlinePB.time < localPB.time)) {
              onlineIsBetter = true;
            }

            if (onlineIsBetter || pending.length === 0) {
              localStorage.setItem(pbKey, JSON.stringify(onlinePB));
            }
          } else if (onlinePB && onlinePB.notFound) {
            if (pending.length === 0) {
              localStorage.removeItem(pbKey);
              if (game.personalBest) {
                game.personalBest = null;
              }
            }
          }
        })();
        return this.syncPersonalBestPromise;
      },
      prefetchScores: function(forceNetwork = false) {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            await this.syncPersonalBest();
            let scores = null;
            let now = Date.now();
            let lastFetch = parseInt(localStorage.getItem('LL_LAST_FETCH') || '0');
            
            // プレイモード（ポーズなど）は60秒、デモモード放置時は10分キャッシュ
            let cacheDuration = (game && game.state === 'demo') ? 600000 : 60000;

            if (!forceNetwork && (now - lastFetch) < cacheDuration) {
              try {
                let cached = localStorage.getItem('LL_CACHED_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {
                localStorage.removeItem('LL_CACHED_LEADERBOARD');
              }
            }
            
            if (!scores) {
              scores = await LootLockerAPI.getScores(100);
              if (scores && scores.length > 0) {
                localStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
                localStorage.setItem('LL_LAST_FETCH', now.toString());
              } else {
                try {
                  let cached = localStorage.getItem('LL_CACHED_LEADERBOARD');
                  if (cached) scores = JSON.parse(cached);
                } catch(e) {
                  localStorage.removeItem('LL_CACHED_LEADERBOARD');
                }
              }
            }
            
            // Merge pending offline scores
            try {
              let pending = JSON.parse(localStorage.getItem('LL_PENDING_SCORES') || '[]');
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
              localStorage.removeItem('LL_PENDING_SCORES');
            }
            
            return scores;
          } else {
            try {
              let d = localStorage.getItem(this.key);
              if (!d) return [];
              let s = JSON.parse(d);
              s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
              return s.map((r, i) => ({ ...r, rank: i + 1 }));
            } catch (e) {
              localStorage.removeItem(this.key);
              return [];
            }
          }
        })();
      },
      getScores: async function(bypassCache = false) {
        if (bypassCache || !this.prefetchedScoresPromise) {
          this.prefetchScores(bypassCache);
        }
        const s = await this.prefetchedScoresPromise;
        this.prefetchedScoresPromise = null;
        return s;
      },
      saveScore: async function(a, t, c, r) {
        if (game.demoMode && !game.allowAutoRank) return;
        let l = getLang(), pid = LootLockerAPI.playerIdentifier;
        game.lastScoreObj = { id: pid, alt: MIN(a, 144000), time: t, coins: c, reason: r, lang: l };
        game.lastScoreId = pid;
        let pbKey = this.pbKey, storedPB = localStorage.getItem(pbKey);
        game.isNewRecord = false;
        game.personalBest = null;
        let cObj = { alt: game.lastScoreObj.alt, coins: game.lastScoreObj.coins, time: game.lastScoreObj.time };
        
        let localPB = null;
        if (storedPB) {
          try {
            localPB = JSON.parse(storedPB);
            if (typeof localPB.alt !== 'number') {
              localPB = null; // Ignore malformed PB
            } else {
              game.personalBest = localPB;
            }
          } catch(e) {
            localStorage.removeItem(pbKey);
          }
        }

        let isNewRecordLocal = false;
        if (!localPB || cObj.alt > localPB.alt || (cObj.alt === localPB.alt && cObj.coins > localPB.coins) || (cObj.alt === localPB.alt && cObj.coins === localPB.coins && cObj.time < localPB.time)) {
          isNewRecordLocal = true;
          game.isNewRecord = true;
          localStorage.setItem(pbKey, JSON.stringify(cObj));
          game.personalBest = cObj;
        }

        const isConfigured = await LootLockerAPI.checkConfig();
        
        if (isConfigured) {
          if (isNewRecordLocal) {
            let res = await LootLockerAPI.submitScore(a, c, t, l);
            if (res) {
              localStorage.setItem('LL_LAST_FETCH', '0'); // Force fetch next time
            }
          }
        } else {
          try {
            let s = await this.getScores();
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
            localStorage.setItem(this.key, JSON.stringify(s));
          } catch (e) {}
        }
        // Start background prefetch of scores immediately for latest values
        this.prefetchScores(game.isNewRecord);
      },
      show: async function(state) {
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        if (isEnd) {
          await this.showResult(state);
        } else {
          await this.showRanking(state);
        }
      },
      showResult: async function(state) {
        this.isShowingResult = true;
        $('rankingLoading').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        $('resultContainer').style.display = 'flex';
        $('rankingModal').style.display = 'flex';
        $('tapToStartMsg').style.display = 'none';
        setIgnoreNextTap(true);
        
        let title = '';
        let titleColor = '#fff';
        let titleAnim = '';
        if (state === 'clear') {
          title = 'CONGRATULATIONS!';
          titleColor = '#fff';
          titleAnim = 'superBlink 0.1s steps(1) infinite';
        } else if (state === 'gameover') {
          if (game.isNewRecord) {
            title = 'NEW RECORD!';
            titleColor = '#f0f';
            titleAnim = 'superBlink 0.3s steps(1) infinite';
          } else {
            title = 'TRY AGAIN!';
            titleColor = '#fff';
            titleAnim = '';
          }
        } else if (state === 'demo') {
          title = 'DEMO RESULT';
          titleColor = '#fff';
        }
        
        $('resultTitle').innerText = title;
        $('resultTitle').style.color = titleColor;
        $('resultTitle').style.animation = titleAnim;
        
        if (game.lastScoreObj) {
          if (game.isNewRecord && state === 'clear') {
            $('newRecordBadge').style.display = 'block';
          } else {
            $('newRecordBadge').style.display = 'none';
          }
          
          $('resultScoreAlt').innerText = game.lastScoreObj.alt + 'm';
          $('resultScoreCoins').innerHTML = '&times; ' + (game.lastScoreObj.coins || 0);
          
          let showBest = (!game.isNewRecord && game.personalBest);
          if (showBest) {
            $('bestScoreContainer').style.display = 'block';
            $('bestScoreAlt').innerText = game.personalBest.alt + 'm';
            $('bestScoreCoins').innerHTML = '&times; ' + (game.personalBest.coins || 0);
          } else {
            $('bestScoreContainer').style.display = 'none';
          }
        }
        
        setTimeout(() => {
          setIgnoreNextTap(false);
          $('tapToStartMsg').innerText = 'TAP TO RANKING';
          $('tapToStartMsg').style.display = 'block';
        }, 50);
      },
      showRanking: async function(state) {
        this.isShowingResult = false;
        $('resultContainer').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        $('rankingLoading').style.display = 'block';
        $('rankingModal').style.display = 'flex';
        setIgnoreNextTap(true);
        let s = await this.getScores();
        let pid = LootLockerAPI.playerIdentifier;
        let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : null;
        let pRank = s.find(x => x.id === pid || (pIdVal && x.id === pIdVal));
        if (pRank) game.lastRank = pRank.rank;
        
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        
        let curLen = s.length;
        for (let i = 0; i < 10 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2000, coins: 0, lang: 'CPU', n: 'CPU --' });
        
        let hl = false;
        let isPlayerInList = false;

        let renderRow = (r, i) => {
            let isC = (r.id === pid || (pIdVal && r.id === pIdVal));
            if (isC) {
                hl = true;
                isPlayerInList = true;
            }
            let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:bold;color:#fff;' : '';
            let idAttr = isC ? ' id="myRankRow"' : '';
            let m = '';
            let rNum = r.rank || (i + 1);
            if (rNum === 1) m = '<span class="mdl mdl-1"></span>';
            else if (rNum === 2) m = '<span class="mdl mdl-2"></span>';
            else if (rNum === 3) m = '<span class="mdl mdl-3"></span>';
            
            let nVal = r.n || '--- ??';
            if (isC && (!r.n || r.n === '--- ??')) nVal = getPlayerName();
            
            let lang = '---';
            let name = '??';
            if (nVal.includes(' ')) {
                let parts = nVal.split(' ');
                lang = parts[0] || '---';
                name = parts[1] || '??';
            } else if (nVal.length >= 3) {
                lang = nVal.substring(0, 3);
                name = nVal.substring(3) || '??';
            }
            if (lang === '???' || lang === '---') {
                if (r.lang && r.lang !== '---') lang = r.lang;
            }
            if (lang.length > 3) lang = lang.substring(0, 3);
            if (name.length > 2) name = name.substring(0, 2);
            return `<tr${idAttr} style="border-bottom:1px dashed #333;${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;">${m}${rNum}</td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(name)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;overflow:hidden;">${escapeHTML(r.alt)}m</td><td style="padding:4px 4px 4px 0;text-align:right;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;">${escapeHTML(r.coins || 0)}</td></tr>`;
        };

        let top3HTML = '';
        let othersHTML = '';
        let top100 = s.slice(0, 100);
        
        top100.forEach((r, i) => {
            if (i < 3) {
                top3HTML += renderRow(r, i);
            } else {
                othersHTML += renderRow(r, i);
            }
        });
        
        if (!isPlayerInList && (pRank || game.personalBest)) {
            let r = pRank || game.personalBest;
            r.rank = r.rank || '???';
            r.id = pid;
            othersHTML += `<tr><td colspan="6" style="text-align:center;color:#555;font-size:8px;padding:4px 0;">...</td></tr>`;
            othersHTML += renderRow(r, top100.length);
        }

        $('rankingTop3Body').innerHTML = top3HTML;
        $('rankingTableBody').innerHTML = othersHTML;
        $('playerRankContainer').style.display = 'none';
        
        $('rankingLoading').style.display = 'none';
        $('rankingContainer').style.display = 'flex';
        
        setTimeout(() => {
          let myRow = document.getElementById('myRankRow');
          if (myRow) {
              let wrap = $('rankingTableWrapper');
              if (wrap.contains(myRow)) {
                  let scrollPos = myRow.offsetTop - (wrap.clientHeight / 2) + (myRow.clientHeight / 2);
                  wrap.scrollTop = scrollPos;
              }
          }
        }, 10);
        
        setTimeout(() => {
          setIgnoreNextTap(false);
          if (isEnd) {
            $('tapToStartMsg').innerText = 'TAP TO START';
          } else {
            $('tapToStartMsg').innerText = 'TAP TO CLOSE';
          }
          $('tapToStartMsg').style.display = 'block';
        }, 50);
      },
      reset: function() {
        try {
          localStorage.removeItem(this.key);
          localStorage.removeItem(this.pbKey);
          alert('RANKING CLEARED!')
        } catch (e) {}
      }
    };

    // Data migration from old keys
    try {
      const oldKey = '8bitJump_Rankings';
      const oldPBKey = '8bitJump_PB';
      const newKey = 'EternalJumper_Rankings';
      const newPBKey = 'EternalJumper_PB';
      
      if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, localStorage.getItem(oldKey));
      }
      if (localStorage.getItem(oldPBKey) && !localStorage.getItem(newPBKey)) {
        localStorage.setItem(newPBKey, localStorage.getItem(oldPBKey));
      }
    } catch (e) {}

    // Start background score prefetch immediately upon loading the game
    RankingAPI.prefetchScores();
