import { game, setIgnoreNextTap } from './game.js';
import { $ } from './utils.js';
import { LootLockerAPI } from './lootlocker.js';
import { getLang, MIN, escapeHTML, getPlayerName } from './utils.js';

    export const RankingAPI = {
      key: 'EternalJumper_Rankings',
      pbKey: 'EternalJumper_PB',
      version: 'v1.37.70 - 2026/07/17 03:12',
      isShowingResult: false,
      prefetchedScoresPromise: null,
      hasLootLocker: function() {
        return LootLockerAPI.hasLootLockerConfig === true;
      },
      prefetchScores: function() {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            return await LootLockerAPI.getScores(100);
          } else {
            try {
              let d = localStorage.getItem(this.key);
              if (!d) return [];
              let s = JSON.parse(d);
              s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
              return s.map((r, i) => ({ ...r, rank: i + 1 }));
            } catch (e) {
              return [];
            }
          }
        })();
      },
      getScores: async function(bypassCache = false) {
        if (bypassCache || !this.prefetchedScoresPromise) {
          this.prefetchScores();
        }
        const s = await this.prefetchedScoresPromise;
        this.prefetchedScoresPromise = null;
        return s;
      },
      saveScore: async function(a, t, c, r) {
        if (game.isBenchmarking) return;
        if (game.demoMode && !game.allowAutoRank) return;
        let l = getLang(), pid = LootLockerAPI.playerIdentifier;
        game.lastScoreObj = { id: pid, alt: MIN(a, 144000), time: t, coins: c, reason: r, lang: l };
        game.lastScoreId = pid;
        let pbKey = this.pbKey, storedPB = localStorage.getItem(pbKey);
        game.isNewRecord = false;
        game.personalBest = null;
        let cObj = { alt: game.lastScoreObj.alt, coins: game.lastScoreObj.coins, time: game.lastScoreObj.time };
        if (storedPB) {
          let pb = JSON.parse(storedPB);
          game.personalBest = pb;
          if (cObj.alt > pb.alt || (cObj.alt === pb.alt && cObj.coins > pb.coins) || (cObj.alt === pb.alt && cObj.coins === pb.coins && cObj.time < pb.time)) {
            game.isNewRecord = true;
            localStorage.setItem(pbKey, JSON.stringify(cObj));
          }
        } else {
          game.isNewRecord = true;
          localStorage.setItem(pbKey, JSON.stringify(cObj));
        }
        if (game.isNewRecord) {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (!isConfigured) {
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
        }

        // オンラインLootLockerにはプレイ毎に毎回送信し、LootLocker側の「Keep Best」仕様に判断を委ねることで、端末間の同期不一致を完全に防ぐ
        const isConfigured = await LootLockerAPI.checkConfig();
        if (isConfigured) {
          await LootLockerAPI.submitScore(game.lastScoreObj.alt, c, l, game.lastScoreObj.time);
        }

        // Start background prefetch of scores immediately for latest values
        this.prefetchScores();
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
        $('rankingModal').innerHTML = '<h1 style="color:#fff;font-size:12px;text-align:center;">LOADING...</h1>';
        $('rankingModal').style.display = 'flex';
        $('tapToStartMsg').style.display = 'none';
        setIgnoreNextTap(true);
        
        let title = '';
        if (state === 'clear') {
          title = '<h1 style="animation:superBlink 0.1s steps(1) infinite;margin:0 0 10px 0;font-size:12px;text-align:center;">CONGRATULATIONS!</h1>';
        } else if (state === 'gameover') {
          if (game.isNewRecord) {
            title = '<h1 style="color:#f0f;margin:0 0 10px 0;font-size:12px;text-align:center;animation:superBlink 0.3s steps(1) infinite;">NEW RECORD!</h1>';
          } else {
            title = '<h1 style="color:#fff;margin:0 0 10px 0;font-size:12px;text-align:center;">TRY AGAIN!</h1>';
          }
        }
        
        let h = title;
        if (game.lastScoreObj) {
          let pbHTML = (game.isNewRecord && state === 'clear') ? '<div style="color:#f0f;font-size:10px;margin-bottom:6px;animation:superBlink 0.3s steps(1) infinite;">NEW RECORD!</div>' : '';
          
          h += '<div style="background:#222;padding:10px;margin-bottom:10px;border:2px solid #fff;border-radius:6px;width:90%;max-width:400px;box-sizing:border-box;text-align:center;">' + pbHTML;

          h += '<h2 style="color:#ff0;margin:0 0 8px 0;font-size:12px;">RESULT</h2>';
          h += '<div style="color:#fff; font-size:16px; font-weight:bold; text-align:center; margin:8px 0 6px 0;">' + game.lastScoreObj.alt + 'm</div>';
          h += '<div class="coin-align" style="font-size:11px; color:#ffb; margin-bottom:10px;">';
          h += '<div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>';
          h += '<span>&times; ' + (game.lastScoreObj.coins || 0) + '</span>';
          h += '</div>';

          if (!game.isNewRecord && game.personalBest) {
            h += '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #555;text-align:center;">';
            h += '<h2 style="color:#aaa;margin:0 0 6px 0;font-size:10px;">YOUR BEST</h2>';
            h += '<div style="color:#ddd; font-size:13px; font-weight:bold; text-align:center; margin:4px 0 4px 0;">' + game.personalBest.alt + 'm</div>';
            h += '<div class="coin-align" style="font-size:9px; color:#dd8;">';
            h += '<div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>';
            h += '<span>&times; ' + (game.personalBest.coins || 0) + '</span>';
            h += '</div>';
            h += '</div>';
          }
          h += '<div style="margin-top:12px; font-size:8px; color:#888; text-align:right;">ID: ' + getPlayerName() + '</div>';
          h += '</div>';
        }
        

        
        $('rankingModal').innerHTML = h;
        $('rankingModal').style.display = 'flex';
        

        
        setTimeout(() => {
          setIgnoreNextTap(false);
          $('tapToStartMsg').innerText = 'TAP TO RANKING';
          $('tapToStartMsg').style.display = 'block';
        }, 500);
      },
      showRanking: async function(state) {
        this.isShowingResult = false;
        $('rankingModal').innerHTML = '<h1 style="color:#fff;font-size:12px;text-align:center;">LOADING...</h1>';
        $('rankingModal').style.display = 'flex';
        setIgnoreNextTap(true);
        let s = await this.getScores();
        let pid = LootLockerAPI.playerIdentifier;
        let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : null;
        let pRank = s.find(x => x.id === pid || (pIdVal && x.id === pIdVal));
        if (pRank) game.lastRank = pRank.rank;
        
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        let h = '<h1 style="color:#0f0;margin:0 0 10px 0;font-size:12px;text-align:center;">RANKING</h1>';
        
        h += '<div style="width:90%;max-width:400px;box-sizing:border-box;text-align:center;">';
        
        let cI = '<div class="coin-icon" style="margin-top:0;"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>';
        
        h += '<div style="border:1px solid #fff;border-radius:4px;padding:8px 0;background:rgba(0,0,0,0.5);margin-bottom:10px;">';
        h += '<table style="width:100%;table-layout:fixed;font-size:9px;border-collapse:collapse;"><tr style="color:#fff;"><th style="padding-bottom:4px;text-align:left;width:24px;padding-left:4px;vertical-align:middle;">#</th><th style="padding-bottom:4px;text-align:center;width:34px;vertical-align:middle;">LANG</th><th style="padding-bottom:4px;width:2px;padding:0;vertical-align:middle;"></th><th style="padding-bottom:4px;text-align:center;vertical-align:middle;">NAME</th><th style="padding-bottom:4px;text-align:right;width:26%;vertical-align:middle;">HEIGHT</th><th style="padding-bottom:4px;width:30px;vertical-align:middle;"><div style="display:flex;justify-content:center;align-items:center;height:8px;">' + cI + '</div></th></tr>';
        
        let curLen = s.length;
        for (let i = 0; i < 10 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2000, coins: 0, lang: '---', n: '--- ??' });

        let top10 = s.slice(0, 10);
        let hl = false;
        top10.forEach((r, i) => {
            let isC = (r.id === pid || (pIdVal && r.id === pIdVal));
            if (isC) hl = true;
            let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:bold;' : '';
            let m = '';
            if (i === 0) m = '<span class="mdl mdl-1"></span>';
            else if (i === 1) m = '<span class="mdl mdl-2"></span>';
            else if (i === 2) m = '<span class="mdl mdl-3"></span>';
            
            let nVal = r.n || '--- ??';
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

            h += `<tr style="border-bottom:1px dashed #333;${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;">${m}${i + 1}</td><td style="text-align:center;width:34px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(lang)}</td><td style="width:2px;padding:0;"></td><td style="text-align:center;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(name)}</td><td style="text-align:right;width:26%;white-space:nowrap;overflow:hidden;">${escapeHTML(r.alt)}m</td><td style="text-align:center;width:30px;color:#ffb;white-space:nowrap;overflow:hidden;">${escapeHTML(r.coins || 0)}</td></tr>`;
        });
        h += '</table></div>';
        
        if (!hl && pRank && pRank.rank > 10) {
            let r = pRank;
            let rRank = pRank.rank;
            let rLang = '---';
            let rName = '??';
            let rnVal = r.n || '--- ??';
            if (rnVal.includes(' ')) {
                let parts = rnVal.split(' ');
                rLang = parts[0] || '---';
                rName = parts[1] || '??';
            } else if (rnVal.length >= 3) {
                rLang = rnVal.substring(0, 3);
                rName = rnVal.substring(3) || '??';
            }
            if (rLang === '???' || rLang === '---') {
                if (r.lang && r.lang !== '---') rLang = r.lang;
            }
            if (rLang.length > 3) rLang = rLang.substring(0, 3);
            if (rName.length > 2) rName = rName.substring(0, 2);

            h += `<div style="padding:4px 0;margin-top:4px;"><table style="width:100%;table-layout:fixed;font-size:9px;border-collapse:collapse;"><tr style="animation:rowBlink 1s infinite;font-weight:bold;color:#fff;"><td style="padding:0 0 0 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;">${rRank}</td><td style="padding:0;text-align:center;width:34px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(rLang)}</td><td style="width:2px;padding:0;"></td><td style="padding:0;text-align:center;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(rName)}</td><td style="padding:0;text-align:right;width:26%;white-space:nowrap;overflow:hidden;">${escapeHTML(r.alt)}m</td><td style="padding:0;text-align:center;width:30px;color:#ffb;white-space:nowrap;overflow:hidden;">${escapeHTML(r.coins || 0)}</td></tr></table></div>`;
        }
        
        h += '</div>';
        $('rankingModal').innerHTML = h;

        setTimeout(() => {
          setIgnoreNextTap(false);
          if (isEnd) {
            $('tapToStartMsg').innerText = 'TAP TO START';
          } else {
            $('tapToStartMsg').innerText = 'TAP TO CLOSE';
          }
          $('tapToStartMsg').style.display = 'block';
        }, 500);
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
