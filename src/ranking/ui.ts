import { game } from '../state.js';
import { setIgnoreNextTap } from '../lifecycle.js';

import { secureStorage } from '../secureStorage.js';
import { safeStorage } from '../safeStorage.js';

import { $ } from '../utils.js';
import { LootLockerAPI } from '../lootlocker.js';
import { getLang, MIN, escapeHTML, getPlayerName, markHasPlayed } from '../utils.js';

import { RankingAPI } from './api.js';
import { prefetchScores, getScores, syncPersonalBest, saveScore } from './core.js';

let currentRankingSession = 0;
export let currentLangFilter = '';

      export const show = async function(state) {
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        if (isEnd) {
          await RankingAPI.showResult(state);
        } else {
          await RankingAPI.showRanking(state, 'height', '');
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
          if (game.isNewRecord || game.isNewTARecord) {
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
              let msStr = Math.floor(tMs / 10).toString().padStart(2, '0');
              $('resultScoreTime').innerText = `${mStr}:${sStr}.${msStr}`;
              
              let scoreTime = $('resultScoreTime');
              let timeLabel = $('resultTimeLabel');
              if (game.isNewTARecord) {
                if (timeLabel) {
                  timeLabel.innerText = 'NEW TIME RECORD!';
                  timeLabel.style.color = '#ff00ff';
                  timeLabel.style.animation = 'superBlink 0.25s steps(1) infinite';
                  timeLabel.style.textShadow = '0 0 8px #f0f, 0 0 16px #ff0';
                }
                scoreTime.style.color = '#ff00ff';
                scoreTime.style.animation = 'superBlink 0.25s steps(1) infinite';
                scoreTime.style.textShadow = '0 0 8px #f0f, 0 0 16px #ff0';
              } else {
                if (timeLabel) {
                  timeLabel.innerText = 'TIME';
                  timeLabel.style.color = '#fff';
                  timeLabel.style.animation = '';
                  timeLabel.style.textShadow = '';
                }
                scoreTime.style.color = '#fff';
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

            let updateBestTimeUI = () => {
              let localTAPB = secureStorage.getItem<any>(RankingAPI.taPbKey, null);
              let timeRow = $('bestScoreTimeRow');
              if (timeRow) {
                if (localTAPB && typeof localTAPB.time === 'number' && localTAPB.time > 0 && localTAPB.time < 86400000) {
                  let t = localTAPB.time;
                  let tMs = t % 1000;
                  let totalSec = Math.floor(t / 1000);
                  let mStr = Math.floor(totalSec / 60);
                  let sStr = (totalSec % 60).toString().padStart(2, '0');
                  let msStr = Math.floor(tMs / 10).toString().padStart(2, '0');
                  $('bestScoreTimeVal').innerText = `${mStr}:${sStr}.${msStr}`;
                } else {
                  $('bestScoreTimeVal').innerText = '-:--.--';
                }
                timeRow.style.display = 'block';
              }
            };

            updateBestTimeUI();
            RankingAPI.syncPersonalBest(true).then(() => {
              updateBestTimeUI();
            });
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
      export const renderRankingTable = function(sList, state, mode, skipScroll = false) {
        let s = sList ? [...sList] : [];
        if (mode === 'ta') {
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
                const headerScore = document.getElementById('rankingHeaderScore');
                if (headerScore) {
                    headerScore.innerText = 'TIME';
                    headerScore.style.textAlign = 'center';
                    headerScore.style.paddingRight = '0';
                }
                Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => {
                    (el as HTMLElement).style.display = 'none';
                });
            }
        } else {
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
                const headerScore = document.getElementById('rankingHeaderScore');
                if (headerScore) {
                    headerScore.innerText = 'HEIGHT';
                    headerScore.style.textAlign = 'center';
                    headerScore.style.paddingRight = '0';
                }
                Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => {
                    (el as HTMLElement).style.display = '';
                    (el as HTMLElement).style.opacity = '1';
                    (el as HTMLElement).style.width = '32px';
                });
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
            if (r.lang && r.lang !== '---' && r.lang !== '???') {
                lang = r.lang;
            } else if (lang === '???' || lang === '---') {
                lang = 'INT';
            }
            if (lang.length > 3) lang = lang.substring(0, 3);
            if (name.length > 2) name = name.substring(0, 2);
            
            let displayScore = `${escapeHTML(r.alt)}m`;
            let displayCoins = escapeHTML(r.coins || 0);
            let scoreAlign = 'right';
            let coinTdHtml = `<td style="padding:4px 4px 4px 0;text-align:right;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;">${displayCoins}</td>`;
            let timeVal = (typeof r.t === 'number') ? r.t : r.time;
            if (mode === 'ta' && typeof timeVal === 'number') {
                let t = timeVal;
                let tMs = t % 1000;
                let totalSec = Math.floor(t / 1000);
                let mStr = Math.floor(totalSec / 60);
                let sStr = (totalSec % 60).toString().padStart(2, '0');
                let msStr = Math.floor(tMs / 10).toString().padStart(2, '0');
                displayScore = `<span style="color:#fff;">${mStr}:${sStr}.${msStr}</span>`;
                scoreAlign = 'center';
                coinTdHtml = '';
            }

            let rankStyle = (typeof rNum === 'number' && rNum >= 100) ? 'font-size:7px;letter-spacing:-0.5px;padding-left:2px;' : '';
            return `<tr${idAttr} style="border-bottom:1px dashed #333;height:20px;box-sizing:border-box;${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;${rankStyle}">${m}${rNum}</td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:4px 0;text-align:center;width:36px;white-space:nowrap;overflow:hidden;font-size:8px;">${escapeHTML(name)}</td><td style="padding:4px 0;text-align:${scoreAlign};white-space:nowrap;overflow:hidden;">${displayScore}</td>${coinTdHtml}</tr>`;
        };

        let top3HTML = '';
        let othersHTML = '';
        let displayLimit = mode === 'ta' ? 100 : 400;
        let topLimited = s.slice(0, displayLimit);
        
        topLimited.forEach((r, i) => {
            if (i < 3) {
                top3HTML += renderRow(r, i);
            } else {
                othersHTML += renderRow(r, i);
            }
        });
        
        let shouldShowMyRecord = true;
        if (currentLangFilter && currentLangFilter !== getLang().substring(0, 3).toUpperCase()) {
            shouldShowMyRecord = false;
        }

        if (shouldShowMyRecord && !isPlayerInList && mode === 'height' && (pRank || game.personalBest)) {
            let r = pRank || game.personalBest;
            r.rank = r.rank || '???';
            r.id = pid;
            othersHTML += `<tr><td colspan="6" style="text-align:center;color:#555;font-size:8px;padding:4px 0;">...</td></tr>`;
            othersHTML += renderRow(r, topLimited.length);
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

        if (!skipScroll) {
          setTimeout(() => {
            let myRow = document.getElementById('myRankRow');
            let wrap = $('rankingTableWrapper');
            if (wrap) {
              if (myRow && wrap.contains(myRow)) {
                  let scrollPos = myRow.offsetTop - (wrap.clientHeight / 2) + (myRow.clientHeight / 2);
                  wrap.scrollTop = scrollPos;
              } else {
                  wrap.scrollTop = 0;
              }
            }
          }, 10);
        }

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

      export const getSortedLangList = function(mode?: string): string[] {
        try {
          let cacheKey = (mode === 'ta') ? 'LL_CACHED_TA_LEADERBOARD' : 'LL_CACHED_LEADERBOARD';
          let raw = safeStorage.getItem(cacheKey);
          if (!raw) raw = safeStorage.getItem('LL_CACHED_LEADERBOARD');
          if (!raw) raw = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
          if (raw) {
            let scores = JSON.parse(raw);
            if (Array.isArray(scores) && scores.length > 0) {
              const counts: Record<string, number> = {};
              scores.forEach((r: any) => {
                const lang = (r.lang || r.l || 'unk').toString().toUpperCase().substring(0, 3);
                if (lang && lang !== 'UNK' && lang !== '---' && lang !== '???') {
                  counts[lang] = (counts[lang] || 0) + 1;
                }
              });
              return Object.entries(counts)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .map(([lang]) => lang);
            }
          }
        } catch (e) {}
        return [];
      };

      export const showLangStats = async function() {
        $('langStatsModal').style.display = 'flex';
        $('langStatsLoading').style.display = 'flex';
        $('langStatsContent').style.display = 'none';
        $('langStatsList').innerHTML = '';

        let renderData = (sList: any[]) => {
            if (sList && sList.length > 0) {
              const counts: Record<string, number> = {};
              sList.forEach((r: any) => {
                const lang = (r.lang || r.l || 'unk').toString().toUpperCase().substring(0, 3);
                counts[lang] = (counts[lang] || 0) + 1;
              });
              
              let sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
              
              let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(10, auto); grid-auto-flow: column; gap: 6px 4px; position: relative; width: 100%;">';
              html += '<div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.2); transform: translateX(-50%);"></div>';
              sorted.forEach(([lang, count]) => {
                html += `<div style="display: flex; align-items: center; justify-content: flex-start;">
                  <button class="modal-btn lang-filter-btn" style="width: 56px; flex: none; padding: 4px; font-size: 10px; font-family: 'Press Start 2P'; color: #fff; text-align: center; box-sizing: border-box; margin: 0 0 0 10px;" data-lang="${lang}">${lang}</button>
                  <span style="font-size: 10px; font-family: 'Press Start 2P'; margin-left: 6px; color: #fff; text-align: left; flex: 1; overflow: hidden; text-overflow: ellipsis;">${count}</span>
                </div>`;
              });
              html += '</div>';
              
              $('langStatsList').innerHTML = html;
              $('langStatsContent').style.display = 'block';
            } else {
              $('langStatsList').innerHTML = '<div style="text-align:center;font-size:10px;color:#aaa;">NO DATA</div>';
              $('langStatsContent').style.display = 'block';
            }
        };

        // Check local cache for immediate non-blocking rendering
        let cached = null;
        try {
          let raw = safeStorage.getItem('LL_CACHED_LEADERBOARD');
          if (raw) cached = JSON.parse(raw);
        } catch (e) {}

        let hasRenderedCache = false;
        if (cached && Array.isArray(cached) && cached.length > 0) {
          $('langStatsLoading').style.display = 'none';
          renderData(cached);
          hasRenderedCache = true;
        }

        // Fetch latest leaderboard scores
        let s = await RankingAPI.getScores(false);
        
        if (!hasRenderedCache || (s && s.length > 0)) {
            $('langStatsLoading').style.display = 'none';
            renderData(s);
        }
      }

      export const cycleLanguage = function(state: any, mode: string, direction: 'next' | 'prev') {
        let langList = getSortedLangList(mode);
        // List including global (empty string) as the first entry
        let list = ['', ...langList];
        let currIdx = list.indexOf(currentLangFilter);
        if (currIdx === -1) currIdx = 0;

        let nextIdx = 0;
        if (direction === 'next') {
          nextIdx = (currIdx + 1) % list.length;
        } else {
          nextIdx = (currIdx - 1 + list.length) % list.length;
        }

        showRanking(state, mode, list[nextIdx]);
      };

      let swipeListenersAttached = false;
      function attachSwipeListeners() {
        if (swipeListenersAttached) return;
        const rankingContainer = $('rankingContainer');
        if (!rankingContainer) return;
        swipeListenersAttached = true;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        rankingContainer.addEventListener('touchstart', (e: TouchEvent) => {
          if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
          }
        }, { passive: true });

        rankingContainer.addEventListener('touchend', (e: TouchEvent) => {
          if (e.changedTouches.length === 1) {
            let touchEndX = e.changedTouches[0].clientX;
            let touchEndY = e.changedTouches[0].clientY;
            let dx = touchEndX - touchStartX;
            let dy = touchEndY - touchStartY;
            let dt = Date.now() - touchStartTime;

            // Check if horizontal swipe: minimum 35px, horizontal > vertical * 1.3, duration < 500ms
            if (dt < 500 && Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              let mode = document.getElementById('btnTabTA')?.classList.contains('active') ? 'ta' : 'height';
              if (dx < 0) {
                // Swipe left -> Next language
                cycleLanguage(game.state, mode, 'next');
              } else {
                // Swipe right -> Previous language
                cycleLanguage(game.state, mode, 'prev');
              }
            }
          }
        }, { passive: true });

        // Also wire arrow button clicks
        const prevBtn = $('rankingPrevLangBtn');
        const nextBtn = $('rankingNextLangBtn');
        if (prevBtn) {
          prevBtn.onclick = (e) => {
            e.stopPropagation();
            let mode = document.getElementById('btnTabTA')?.classList.contains('active') ? 'ta' : 'height';
            cycleLanguage(game.state, mode, 'prev');
          };
        }
        if (nextBtn) {
          nextBtn.onclick = (e) => {
            e.stopPropagation();
            let mode = document.getElementById('btnTabTA')?.classList.contains('active') ? 'ta' : 'height';
            cycleLanguage(game.state, mode, 'next');
          };
        }
      }

      export const showRanking = async function(state, mode = 'height', langFilter?: string) {
        if (langFilter !== undefined) currentLangFilter = langFilter;
        currentRankingSession++;
        let session = currentRankingSession;

        if (RankingAPI.isShowingResult && game.isNewTARecord && !game.isNewRecord) {
            mode = 'ta';
        }
        RankingAPI.isShowingResult = false;
        $('resultContainer').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        if ($('langStatsModal')) $('langStatsModal').style.display = 'none';
        $('rankingModal').style.display = 'flex'; 
        document.body.classList.add('showing-ranking');

        attachSwipeListeners();

        let titleLabel = $('rankingTitleLabel');
        let prevBtn = $('rankingPrevLangBtn');
        let nextBtn = $('rankingNextLangBtn');
        if (titleLabel) {
            titleLabel.innerHTML = currentLangFilter ? `<span style="color:#fff;">[${currentLangFilter}]</span> RANKING` : 'RANKING';
        }
        if (prevBtn && nextBtn) {
            prevBtn.style.display = 'inline-block';
            nextBtn.style.display = 'inline-block';
        }

        setIgnoreNextTap(true);
        setTimeout(() => setIgnoreNextTap(false), 50);

        // Check local cache for immediate non-blocking rendering
        let cached = null;
        try {
          let cacheKey = (mode === 'ta') ? 'LL_CACHED_TA_LEADERBOARD' : 'LL_CACHED_LEADERBOARD';
          let raw = safeStorage.getItem(cacheKey);
          if (raw) cached = JSON.parse(raw);
        } catch (e) {}

        if (currentLangFilter && cached && Array.isArray(cached)) {
           cached = cached.filter((r: any) => (r.lang || r.l || 'unk').toString().toUpperCase().substring(0, 3) === currentLangFilter)
                          .map((r: any) => ({...r}));
           cached.forEach((v, idx) => v.rank = idx + 1);
        }

        let hasRenderedCache = false;
        if (cached && Array.isArray(cached) && cached.length > 0) {
          $('rankingLoading').style.display = 'none';
          renderRankingTable(cached, state, mode, false);
          hasRenderedCache = true;
        } else {
          $('rankingLoading').style.display = 'flex';
        }

        // Background fetch latest personal best & leaderboard scores
        RankingAPI.syncPersonalBest(false);
        let s = [];
        if (mode === 'ta') {
            s = await RankingAPI.getTimeAttackScores(false);
        } else {
            s = await RankingAPI.getScores(false);
        }

        if (session !== currentRankingSession) return;

        if ($('rankingModal')?.style.display === 'none' || !document.body.classList.contains('showing-ranking')) {
            $('rankingLoading').style.display = 'none';
            return;
        }

        if (currentLangFilter && s && Array.isArray(s)) {
           s = s.filter((r: any) => (r.lang || r.l || 'unk').toString().toUpperCase().substring(0, 3) === currentLangFilter)
                .map((r: any) => ({...r}));
           s.forEach((v, idx) => v.rank = idx + 1);
        }

        // Render latest synced data
        if (s && s.length > 0) {
            renderRankingTable(s, state, mode, hasRenderedCache);
        } else if (!cached || cached.length === 0) {
            renderRankingTable([], state, mode, hasRenderedCache);
        }
      }