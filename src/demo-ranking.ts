import { $, escapeHTML } from './utils.js';
import { demoState } from './state.js';
import { RankingAPI } from './ranking.js';
import { LootLockerAPI } from './lootlocker.js';

export async function startDemoRankingScroll(isAttractMode: boolean, mode: 'ta' | 'height' = 'height', isTransition: boolean = false) {
  if (!isTransition) {
      const oldHeader = document.getElementById('demoHeaderOld');
      if (oldHeader) oldHeader.remove();
      const oldTop3 = document.getElementById('demoTop3Old');
      if (oldTop3) oldTop3.remove();
      const oldOthers = document.getElementById('demoOthersWrapperOld');
      if (oldOthers) oldOthers.remove();
  }
  if (!isAttractMode) return;
  demoState.active = true;
  if (!isTransition) {
    $('demoRankingContainer').style.display = 'block';
    $('demoRankingContainer').style.opacity = '1';
    $('demoRankingContainer').style.transition = 'none';
    $('demoRankingContainer').style.background = 'rgba(0,0,0,0.3)';
    $('demoLoading').style.display = 'flex';
  }
  $('demoHeader').innerHTML = '';
  $('demoTop3').innerHTML = '';
  $('demoOthers').innerHTML = '';
  
  let s = mode === 'ta' ? await RankingAPI.getTimeAttackScores() : await RankingAPI.getScores();
  if (!isAttractMode) {
    if (!isTransition) $('demoLoading').style.display = 'none';
    return;
  }
  if (!isTransition) $('demoLoading').style.display = 'none';
  
  let curLen = s.length;
  let maxLen = mode === 'ta' ? 10 : 100;
  for (let i = 0; i < maxLen - curLen; i++) {
    if (mode === 'ta') {
      s.push({ rank: curLen + i + 1, t: 5 * 60000, coins: 0, lang: 'CPU', n: 'CPU --' });
    } else {
      s.push({ rank: curLen + i + 1, alt: 2000, coins: 0, lang: 'CPU', n: 'CPU --' });
    }
  }
  
  let headerHtml = `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;"><tr style="color:rgba(255,255,255,0.85);font-size:8px;"><th style="padding:4px 0;text-align:left;width:24px;padding-left:4px;vertical-align:middle;font-weight:normal;">#</th><th style="padding:4px 0;text-align:center;width:32px;vertical-align:middle;font-weight:normal;">LANG</th><th style="padding:4px 0;width:4px;padding:0;vertical-align:middle;font-weight:normal;"></th><th style="padding:4px 0;text-align:center;width:36px;vertical-align:middle;font-weight:normal;">NAME</th><th style="padding:4px 0;text-align:${mode === 'ta' ? 'center' : 'right'};vertical-align:middle;font-weight:normal;">${mode === 'ta' ? 'TIME' : 'HEIGHT'}</th>${mode === 'ta' ? '' : '<th style="padding:4px 0;width:32px;padding-right:4px;vertical-align:middle;font-weight:normal;"><div style="display:flex;justify-content:center;align-items:center;height:8px;"><div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div></div></th>'}</tr></table>`;
  $('demoHeader').innerHTML = headerHtml;
  
  let t3Html = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;">';
  let otHtml = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;">';
  
  s.forEach((r, idx) => {
    let i = (r.rank ? r.rank - 1 : idx);
    let rankNum = i + 1;
    let m = '';
    let color = 'rgba(255,255,255,0.85)';
    let fw = 'normal';
    let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : null;
    let isC = (r.id === LootLockerAPI.playerIdentifier || (pIdVal && r.id === pIdVal));
    if (i === 0) { m = '<span class="mdl mdl-1"></span>'; color = '#ff0'; fw = 'normal'; }
    else if (i === 1) { m = '<span class="mdl mdl-2"></span>'; color = '#ccc'; fw = 'normal'; }
    else if (i === 2) { m = '<span class="mdl mdl-3"></span>'; color = '#d98'; fw = 'normal'; }
      
    let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:normal;' : '';
    let pt = '6px 0';
      
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

    let rankStyle = rankNum >= 100 ? 'font-size:7px;letter-spacing:-0.5px;padding-left:2px;' : '';
    
    let displayScore = `${escapeHTML(r.alt)}m`;
    let displayCoins = `<td style="text-align:right;padding:${pt};padding-right:4px;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;vertical-align:middle;">${escapeHTML(r.coins || 0)}</td>`;
    let scoreAlign = 'right';
    if (mode === 'ta' && r.t) {
        let t = r.t;
        let tMs = t % 1000;
        let totalSec = Math.floor(t / 1000);
        let mStr = Math.floor(totalSec / 60);
        let sStr = (totalSec % 60).toString().padStart(2, '0');
        let msStr = Math.floor(tMs / 10).toString().padStart(2, '0');
        displayScore = `<span style="color:#fff;">${mStr}:${sStr}.${msStr}</span>`;
        displayCoins = '';
        scoreAlign = 'center';
    }

    let row = `<tr style="color:${color};font-weight:${fw};${bg}"><td style="padding:${pt};text-align:left;width:24px;white-space:nowrap;overflow:hidden;padding-left:4px;vertical-align:middle;${rankStyle}">${m}${rankNum}</td><td style="padding:${pt};text-align:center;width:32px;white-space:nowrap;overflow:hidden;vertical-align:middle;font-size:8px;">${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:${pt};text-align:center;width:36px;white-space:nowrap;overflow:hidden;vertical-align:middle;font-size:8px;">${escapeHTML(name)}</td><td style="text-align:${scoreAlign};padding:${pt};white-space:nowrap;overflow:hidden;vertical-align:middle;">${displayScore}</td>${displayCoins}</tr>`;
      
    if (i < 3) t3Html += row;
    else otHtml += row;
  });
  
  t3Html += '</table>';
  otHtml += '</table>';
  $('demoTop3').innerHTML = t3Html;
  $('demoOthers').innerHTML = otHtml;
  
  demoState.active = true;
  demoState.phase = 'scroll';
  demoState.startTime = performance.now();
  demoState.calculated = false;
  
  $('demoHeader').style.top = '0px';
  $('demoTop3').style.top = '0px';
  $('demoOthersWrapper').style.top = '0px';
  $('demoOthers').style.top = '0px';
  $('demoHeader').style.transform = 'translateY(1000px)';
  $('demoTop3').style.transform = 'translateY(1000px)';
  $('demoOthersWrapper').style.transform = 'translateY(1000px)';
  $('demoOthersWrapper').style.maskImage = 'none';
  $('demoOthersWrapper').style.webkitMaskImage = 'none';
}
