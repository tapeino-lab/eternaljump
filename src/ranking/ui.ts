import { game } from '../state.js';
import { setIgnoreNextTap } from '../lifecycle.js';

import { secureStorage } from '../secureStorage.js';
import { safeStorage } from '../safeStorage.js';

import { $ } from '../utils.js';
import { LootLockerAPI } from '../lootlocker.js';
import { getLang, MIN, escapeHTML, getPlayerName, markHasPlayed } from '../utils.js';

import { RankingAPI } from './api.js';
import { prefetchScores, getScores, syncPersonalBest, saveScore } from './core.js';
      export const show = async function(state) {
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        if (isEnd) {
          await RankingAPI.showResult(state);
        } else {
          await RankingAPI.showRanking(state);
        }
}
      export const showResult = async function(state) {
        if (!game.demoMode && game.lastScoreObj && state !== 'demo') {
          let c = game.lastScoreObj.coins || 0;
          if (state === 'clear') c *= 2;
          game.totalCoins += c;
          secureStorage.setItem('JUMP_TOTAL_COINS', game.totalCoins);
        }

        RankingAPI.isShowingResult = true;
        $('rankingLoading').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        $('resultContainer').style.display = 'flex';
        $('rankingModal').style.display = 'flex'; document.body.classList.add('showing-ranking');
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
          title = 'TRY AGAIN!';
          titleColor = '#fff';
          titleAnim = '';
        } else if (state === 'demo') {
          title = 'DEMO RESULT';
          titleColor = '#fff';
        }
        
        $('resultTitle').innerText = title;
        $('resultTitle').style.color = titleColor;
        $('resultTitle').style.animation = titleAnim;
        
        if (game.lastScoreObj) {
          const scoreLabel = document.querySelector('.result-score-label') as HTMLElement;
          if (game.isNewRecord) {
            if (scoreLabel) {
              scoreLabel.innerText = 'NEW RECORD!';
              scoreLabel.style.color = '#ff00ff';
              scoreLabel.style.animation = 'superBlink 0.25s steps(1) infinite';
              scoreLabel.style.textShadow = '0 0 8px #f0f, 0 0 16px #ff0';
            }
            if ($('newRecordBadge')) $('newRecordBadge').style.display = 'none';
          } else {
            if (scoreLabel) {
              scoreLabel.innerText = 'SCORE';
              scoreLabel.style.color = '#0f0';
              scoreLabel.style.animation = '';
              scoreLabel.style.textShadow = '';
            }
            if ($('newRecordBadge')) $('newRecordBadge').style.display = 'none';
          }
          
          $('resultScoreAlt').innerText = game.lastScoreObj.alt + 'm';
          
          let baseCoins = game.lastScoreObj.coins || 0;
          let elCoins = $('resultScoreCoins');
          let elBonusRow = $('resultBonusRow');
          let elBonusCoins = $('resultBonusCoins');
          
          if (elCoins) elCoins.innerHTML = '&times; ' + baseCoins;
          
          let elCoinContainer = document.querySelector('.result-coin-container');
          
          if (state === 'clear' && !game.demoMode && baseCoins > 0) {
            if (elCoinContainer) elCoinContainer.classList.remove('single-row');
            if (elBonusRow && elBonusCoins) {
              elBonusRow.style.display = 'flex';
              elBonusCoins.innerHTML = '&times; 0';
              
              setTimeout(() => {
                if (!elBonusRow || !elBonusCoins) return;
                
                let count = 0;
                let duration = 600; // ms
                let steps = Math.min(baseCoins, 20);
                let stepTime = Math.max(25, Math.floor(duration / steps));
                let stepVal = baseCoins / steps;
                
                let timer = setInterval(() => {
                  count += stepVal;
                  if (count >= baseCoins) {
                    count = baseCoins;
                    clearInterval(timer);
                    elBonusCoins.innerHTML = '&times; ' + baseCoins;
                  } else {
                    elBonusCoins.innerHTML = '&times; ' + Math.floor(count);
                  }
                }, stepTime);
              }, 500);
            }
          } else {
            if (elCoinContainer) elCoinContainer.classList.add('single-row');
            if (elBonusRow) {
              elBonusRow.style.display = 'none';
            }
          }
          
          let timeContainer = $('resultTimeContainer');
          if (timeContainer) {
            if (state === 'clear') {
              timeContainer.style.display = 'block';
              let t = game.lastScoreObj.time || 0;
              let tMs = t % 1000;
              let totalSec = Math.floor(t / 1000);
              let mStr = Math.floor(totalSec / 60);
              let sStr = (totalSec % 60).toString().padStart(2, '0');
              let msStr = Math.floor(tMs / 100).toString();
              $('resultScoreTime').innerText = `${mStr}:${sStr}.${msStr}`;
              
              let timeLabel = $('resultTimeLabel');
              if (game.isNewTARecord) {
                timeLabel.innerText = 'NEW TIME RECORD!';
                timeLabel.style.color = '#ff00ff';
                timeLabel.style.animation = 'superBlink 0.25s steps(1) infinite';
                timeLabel.style.textShadow = '0 0 8px #f0f, 0 0 16px #ff0';
                
                let scoreTime = $('resultScoreTime');
                scoreTime.style.color = '#ff00ff';
                scoreTime.style.animation = 'superBlink 0.25s steps(1) infinite';
                scoreTime.style.textShadow = '0 0 8px #f0f, 0 0 16px #ff0';
              } else {
                timeLabel.innerText = 'TIME';
                timeLabel.style.color = '#fff';
                timeLabel.style.animation = '';
                timeLabel.style.textShadow = '';
                
                let scoreTime = $('resultScoreTime');
                scoreTime.style.color = '#0ff';
                scoreTime.style.animation = '';
                scoreTime.style.textShadow = '';
              }
            } else {
              timeContainer.style.display = 'none';
            }
          }

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
}
      export const showRanking = async function(state, mode = 'height') {
        RankingAPI.isShowingResult = false;
        $('resultContainer').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        $('rankingLoading').style.display = 'flex';
        $('rankingModal').style.display = 'flex'; document.body.classList.add('showing-ranking');
        setIgnoreNextTap(true);
        
        let s = [];
        if (mode === 'ta') {
            s = await RankingAPI.getTimeAttackScores();
            if (document.getElementById('btnTabTA')) {
                const btnH = document.getElementById('btnTabHeight');
                const btnTA = document.getElementById('btnTabTA');
                if (btnH) {
                    btnH.style.background = '';
                    btnH.style.color = '';
                    btnH.style.border = '';
                    btnH.classList.remove('active');
                }
                if (btnTA) {
                    btnTA.style.background = '';
                    btnTA.style.color = '';
                    btnTA.style.border = '';
                    btnTA.classList.add('active');
                }
                document.getElementById('rankingHeaderScore').innerText = 'TIME';
                Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => (el as HTMLElement).style.opacity = '0');
            }
        } else {
            s = await RankingAPI.getScores();
            if (document.getElementById('btnTabTA')) {
                const btnH = document.getElementById('btnTabHeight');
                const btnTA = document.getElementById('btnTabTA');
                if (btnH) {
                    btnH.style.background = '';
                    btnH.style.color = '';
                    btnH.style.border = '';
                    btnH.classList.add('active');
                }
                if (btnTA) {
                    btnTA.style.background = '';
                    btnTA.style.color = '';
                    btnTA.style.border = '';
                    btnTA.classList.remove('active');
                }
                document.getElementById('rankingHeaderScore').innerText = 'HEIGHT';
                Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => (el as HTMLElement).style.opacity = '1');
            }
        }

        let pid = LootLockerAPI.playerIdentifier;
        let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : null;
        let pRank = s.find(x => x.id === pid || (pIdVal && x.id === pIdVal));
        if (pRank && mode === 'height') game.lastRank = pRank.rank;
        
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        
        let curLen = s.length;
        if (mode === 'height') {
            for (let i = 0; i < 10 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2000, coins: 0, lang: 'CPU', n: 'CPU --' });
        } else if (mode === 'ta') {
            for (let i = 0; i < 10 - curLen; i++) s.push({ rank: curLen + i + 1, t: 5 * 60000, coins: 0, lang: 'CPU', n: 'CPU --' });
        }
        
        let hl = false;
        let isPlayerInList = false;

        let renderRow = (r, i) => {
            let isC = (r.id === pid || (pIdVal && r.id === pIdVal));
            if (isC) {
                hl = true;
                isPlayerInList = true;
            }
            let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:bold;' : '';
            let idAttr = isC ? ' id="myRankRow"' : '';
            let m = '';
            let rNum = r.rank || (i + 1);
            if (rNum === 1) m = '<span class="mdl mdl-1"></span>';
            else if (rNum === 2) m = '<span class="mdl mdl-2"></span>';
            else if (rNum === 3) m = '<span class="mdl mdl-3"></span>';
            
            let nVal = r.n || '--- ??';
            if (isC) nVal = getPlayerName(); // Always override with latest local player name
            
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
            
            let displayScore = `${escapeHTML(r.alt)}m`;
            let displayCoins = escapeHTML(r.coins || 0);
            if (mode === 'ta' && r.t) {
                let t = r.t;
                let tMs = t % 1000;
                let totalSec = Math.floor(t / 1000);
                let mStr = Math.floor(totalSec / 60);
                let sStr = (totalSec % 60).toString().padStart(2, '0');
                let msStr = Math.floor(tMs / 100).toString();
                displayScore = `<span style="color:#fff;">${mStr}:${sStr}.${msStr}</span>`;
                displayCoins = '';
            }

            let rankStyle = (typeof rNum === 'number' && rNum >= 100) ? 'font-size:7px;letter-spacing:-0.5px;padding-left:2px;' : '';
            return `<tr${idAttr} style="border-bottom:1px dashed #333;${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;${rankStyle}">${m}${rNum}</td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(name)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;overflow:hidden;">${displayScore}</td><td style="padding:4px 4px 4px 0;text-align:right;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;">${displayCoins}</td></tr>`;
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
        
        if (!isPlayerInList && mode === 'height' && (pRank || game.personalBest)) {
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
        
        // Tab setup
        if (document.getElementById('btnTabHeight') && !document.getElementById('btnTabHeight').onclick) {
            document.getElementById('btnTabHeight').onclick = (e) => {
                e.stopPropagation();
                showRanking(state, 'height');
            };
            document.getElementById('btnTabTA').onclick = (e) => {
                e.stopPropagation();
                showRanking(state, 'ta');
            };
        }

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
}