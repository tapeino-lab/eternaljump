import { game, demoState } from '../state.js';
import { ctx, IMG } from '../display.js';
import { isAttractMode, runAttractUICycle, setIgnoreNextTap } from '../lifecycle.js';
import { fireworksSystem } from '../fireworks.js';
import { airplaneSystem } from '../airplane.js';
import { config } from '../config.js';
import { RankingAPI } from '../ranking.js';
import { RND, FLR, MIN, MAX, SIN, ABS, PI, $, hasPlayedOnce } from '../utils.js';

import { dR } from './core.js';
export function drawOffscreenIndicators() {
  for (let _idx_npcs = 0; _idx_npcs < game.npcs.length; _idx_npcs++) {
    let n = game.npcs[_idx_npcs];
    let cx = n.x + n.w / 2, cy = n.y + n.h / 2, sy = cy - game.cameraY, sx = cx;
    if (sy < 0 || sy > config.gameHeight || sx < 0 || sx > config.gameWidth) {
      let indX = MAX(10, MIN(config.gameWidth - 10, sx)), indY = MAX(10, MIN(config.gameHeight - 10, sy)), ang = Math.atan2(sy - indY, sx - indX);
      if (sy > config.gameHeight) ang = Math.PI / 2;
      else if (sy < 0) ang = -Math.PI / 2;
      ctx.save();
      ctx.translate(indX, indY);
      
      if (n.balloonTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        let tw = n.balloonText.length * 8 + 8;
        
        if (sy < 0) {
          ctx.beginPath();
          ctx.roundRect(-tw/2, 4, tw, 14, 4);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(-2, 4);
          ctx.lineTo(2, 4);
          ctx.lineTo(0, 0);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          if (ctx.font !== '8px "Press Start 2P", monospace') ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.balloonText, 0, 11);
        } else {
          ctx.beginPath();
          ctx.roundRect(-tw/2, -14, tw, 14, 4);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(-2, 0);
          ctx.lineTo(2, 0);
          ctx.lineTo(0, 4);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          if (ctx.font !== '8px "Press Start 2P", monospace') ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.balloonText, 0, -7);
        }
      } else {
        ctx.rotate(ang);
        ctx.fillStyle = n.active ? 'rgba(255,255,255,0.3)' : 'rgba(150,150,150,0.2)';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-5, 5);
        ctx.lineTo(-5, -5);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function getEquippedIconSVG(id: string | null): string {
  if (id === 'magnet') {
    return `<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="3" y="2" width="10" height="3" fill="#f33"/>
      <rect x="3" y="5" width="3" height="4" fill="#f33"/>
      <rect x="10" y="5" width="3" height="4" fill="#f33"/>
      <rect x="3" y="9" width="3" height="4" fill="#ccc"/>
      <rect x="10" y="9" width="3" height="4" fill="#ccc"/>
    </svg>`;
  } else if (id === 'helmet') {
    return `<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="4" y="3" width="8" height="1" fill="#000"/>
      <rect x="2" y="4" width="2" height="1" fill="#000"/>
      <rect x="12" y="4" width="2" height="1" fill="#000"/>
      <rect x="1" y="5" width="1" height="6" fill="#000"/>
      <rect x="14" y="5" width="1" height="6" fill="#000"/>
      <rect x="0" y="11" width="1" height="2" fill="#000"/>
      <rect x="15" y="11" width="1" height="2" fill="#000"/>
      <rect x="1" y="13" width="14" height="1" fill="#000"/>
      <rect x="4" y="4" width="8" height="1" fill="#fd0"/>
      <rect x="2" y="5" width="12" height="6" fill="#fd0"/>
      <rect x="1" y="11" width="14" height="2" fill="#fd0"/>
      <rect x="7" y="4" width="2" height="7" fill="#f80"/>
      <rect x="3" y="5" width="2" height="2" fill="#fff" opacity="0.7"/>
      <rect x="11" y="5" width="2" height="2" fill="#fff" opacity="0.7"/>
    </svg>`;
  } else if (id === 'mushroom') {
    return `<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="5" y="8" width="6" height="6" fill="#fcc"/>
      <rect x="2" y="2" width="12" height="6" fill="#2c2"/>
      <rect x="4" y="4" width="3" height="3" fill="#fff"/>
      <rect x="9" y="4" width="3" height="3" fill="#fff"/>
    </svg>`;
  } else if (id === 'skates') {
    return `<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="3" y="3" width="5" height="1" fill="#000"/>
      <rect x="2" y="4" width="1" height="8" fill="#000"/>
      <rect x="8" y="4" width="1" height="3" fill="#000"/>
      <rect x="9" y="7" width="1" height="2" fill="#000"/>
      <rect x="10" y="9" width="3" height="1" fill="#000"/>
      <rect x="13" y="10" width="1" height="2" fill="#000"/>
      <rect x="12" y="12" width="1" height="1" fill="#000"/>
      <rect x="1" y="12" width="11" height="1" fill="#000"/>
      <rect x="1" y="13" width="1" height="2" fill="#000"/>
      <rect x="14" y="12" width="1" height="3" fill="#000"/>
      <rect x="2" y="15" width="12" height="1" fill="#000"/>
      <rect x="3" y="4" width="5" height="8" fill="#4be"/>
      <rect x="8" y="7" width="1" height="5" fill="#4be"/>
      <rect x="9" y="10" width="4" height="2" fill="#4be"/>
      <rect x="3" y="4" width="5" height="2" fill="#eef"/>
      <rect x="3" y="6" width="1" height="6" fill="#9ff"/>
      <rect x="4" y="10" width="6" height="1" fill="#9ff"/>
      <rect x="7" y="6" width="1" height="6" fill="#17b"/>
      <rect x="8" y="11" width="4" height="1" fill="#17b"/>
      <rect x="2" y="12" width="11" height="1" fill="#777"/>
      <rect x="3" y="13" width="1" height="1" fill="#999"/>
      <rect x="7" y="13" width="1" height="1" fill="#999"/>
      <rect x="11" y="13" width="1" height="1" fill="#999"/>
      <rect x="2" y="14" width="12" height="1" fill="#ddd"/>
      <rect x="13" y="13" width="1" height="1" fill="#ddd"/>
    </svg>`;
  } else if (id === 'autocruise') {
    return `<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="7" y="0" width="2" height="2" fill="#f33"/>
      <rect x="7" y="2" width="2" height="2" fill="#888"/>
      <rect x="1" y="6" width="1" height="4" fill="#777"/>
      <rect x="14" y="6" width="1" height="4" fill="#777"/>
      <rect x="2" y="4" width="12" height="11" fill="#888"/>
      <rect x="3" y="5" width="10" height="9" fill="#ccc"/>
      <rect x="3" y="5" width="9" height="1" fill="#eee"/>
      <rect x="3" y="5" width="1" height="8" fill="#eee"/>
      <rect x="4" y="7" width="8" height="3" fill="#111"/>
      <rect x="5" y="8" width="2" height="1" fill="#00f0ff"/>
      <rect x="9" y="8" width="2" height="1" fill="#00f0ff"/>
      <rect x="5" y="11" width="6" height="2" fill="#555"/>
      <rect x="6" y="11" width="1" height="2" fill="#222"/>
      <rect x="8" y="11" width="1" height="2" fill="#222"/>
      <rect x="10" y="11" width="1" height="2" fill="#222"/>
    </svg>`;
  }
  return '';
}

export function updateHUD(topColor) {
  let lum = topColor.r * 0.299 + topColor.g * 0.587 + topColor.b * 0.114;
  let wrap = $('canvasWrapper');
  let ui = $('ui');
  if (lum > 140) wrap.classList.add('bright-bg');
  else wrap.classList.remove('bright-bg');
  
  let effPlayTime = (game.state === 'clear') ? game.clearTime : game.playTime;
  let timeLeft = MAX(0, config.timeLimit - effPlayTime / 1000);
  let timeStr = Math.ceil(timeLeft).toString().padStart(3, '0');
  
  let timeNumStyle = '';
  if (timeLeft <= 10 && timeLeft > 0) timeNumStyle = 'color:#f33;animation:blinkRetro 0.3s infinite;';
  else if (timeLeft <= 60 && timeLeft > 0) timeNumStyle = 'color:#ff0;animation:blinkRetro 0.3s infinite;';
  else if (timeLeft === 0) timeNumStyle = 'color:#f00;';
  
  let aiStatus = '';
  
  let isTitle = (isAttractMode && !demoState.active) || ((game.state === 'intro' || (game.state as any) === 'intro_anim') && game.player.y <= 240 - config.playerSize);
  let isTimerVisible = !isAttractMode;
  
  if (!ui.querySelector('#hud-coin')) {
    let cI = '<div class="coin-icon" style="margin-right:4px;"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>';
    ui.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:flex-start;">
        <div style="display:flex; align-items:center;">
          ${cI}<span id="hud-coin"></span>
        </div>
        <div id="hud-equipped-badge" style="display:none; margin-top:3px; padding:2px; background:rgba(0,0,0,0.75); border:1px solid #00e676; border-radius:3px; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.5); pointer-events:none;">
          <div id="hud-equipped-icon" style="display:flex; align-items:center; justify-content:center; gap:2px;"></div>
        </div>
      </div>
      <span id="hud-score" style="flex:1;text-align:center;"></span>
      <span id="hud-time" style="flex:1;text-align:right;"></span>
    `;
  }

  let coinDisplay = isTitle ? game.totalCoins : game.scoreCoin;
  let centerHtml = isTitle ? '' : MIN(config.goalScore, game.score) + 'm' + aiStatus;
  let timeHtml = isTimerVisible ? 'TIME <span style="' + timeNumStyle + '">' + timeStr + '</span>' : '';

  let eqList = game.equipped ? Object.keys(game.equipped).filter(k => game.equipped[k]) : [];
  let eqKey = eqList.slice().sort().join(',');

  let curState = coinDisplay + '_' + centerHtml + '_' + timeHtml + '_' + eqKey;
  if (game.lastUI !== curState) {
    let hc = document.getElementById('hud-coin');
    let hs = document.getElementById('hud-score');
    let ht = document.getElementById('hud-time');
    if (hc && hc.innerHTML !== coinDisplay.toString()) hc.innerHTML = coinDisplay.toString();
    if (hs && hs.innerHTML !== centerHtml) hs.innerHTML = centerHtml;
    if (ht && ht.innerHTML !== timeHtml) ht.innerHTML = timeHtml;

    let badge = document.getElementById('hud-equipped-badge');
    let iconContainer = document.getElementById('hud-equipped-icon');
    if (badge && iconContainer) {
      if (eqList.length > 0) {
        badge.style.display = 'inline-flex';
        let iconsHtml = eqList.map(id => getEquippedIconSVG(id)).join('');
        if (iconContainer.innerHTML !== iconsHtml) {
          iconContainer.innerHTML = iconsHtml;
        }
      } else {
        badge.style.display = 'none';
      }
    }

    game.lastUI = curState;
  }

}

export function updateDemoRanking(ts) {
  if (demoState.active && demoState.phase === 'scroll') {
    if (!demoState.calculated) {
      demoState.containerH = $('demoRankingContainer').offsetHeight;
      demoState.headerH = $('demoHeader').offsetHeight;
      demoState.t3H = $('demoTop3').offsetHeight;
      demoState.otH = $('demoOthers').offsetHeight;
      demoState.startScrollY = demoState.containerH;
      demoState.fixedHeaderY = demoState.containerH * 0.15;
      demoState.fixedTop3Y = demoState.fixedHeaderY + demoState.headerH;
      demoState.gap = 8;
      demoState.wH = demoState.containerH - demoState.fixedTop3Y - demoState.t3H - demoState.gap;
      $('demoOthersWrapper').style.height = demoState.wH + 'px';
      demoState.dist1 = demoState.containerH - demoState.fixedHeaderY;
      demoState.dist2 = MAX(0, demoState.otH - demoState.wH + 40);
      demoState.totalDist = demoState.dist1 + demoState.dist2;
      demoState.scrollDuration = (demoState.totalDist / 0.035);
      demoState.calculated = true;
    }
    
    let elapsed = ts - demoState.startTime;
    let progress = MIN(1, elapsed / demoState.scrollDuration);
    let currentScrolled = demoState.totalDist * progress;
    
    if (currentScrolled < demoState.dist1) {
      let headerY = demoState.containerH - currentScrolled;
      $('demoHeader').style.transform = `translateY(${headerY}px)`;
      $('demoTop3').style.transform = `translateY(${headerY + demoState.headerH}px)`;
      $('demoOthersWrapper').style.transform = `translateY(${headerY + demoState.headerH + demoState.t3H + demoState.gap}px)`;
      $('demoOthers').style.transform = 'translateY(0px)';
      $('demoOthersWrapper').style.maskImage = 'none';
      $('demoOthersWrapper').style.webkitMaskImage = 'none';
    } else {
      $('demoHeader').style.transform = `translateY(${demoState.fixedHeaderY}px)`;
      $('demoTop3').style.transform = `translateY(${demoState.fixedTop3Y}px)`;
      $('demoOthersWrapper').style.transform = `translateY(${demoState.fixedTop3Y + demoState.t3H + demoState.gap}px)`;
      let othersScrolled = currentScrolled - demoState.dist1;
      $('demoOthers').style.transform = `translateY(${-othersScrolled}px)`;
      $('demoOthersWrapper').style.maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)';
      $('demoOthersWrapper').style.webkitMaskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)';
    }
    
    if (progress >= 1) {
      demoState.phase = 'wait';
      setTimeout(() => {
        if (!isAttractMode) return;
        let fo = $('fadeOverlay');
        fo.style.display = 'block';
        fo.offsetHeight;
        fo.style.opacity = '1';
        setTimeout(() => {
          if (!isAttractMode) return;
          $('demoRankingContainer').style.display = 'none';
          $('demoRankingContainer').style.opacity = '1';
          $('demoRankingContainer').style.transition = 'none';
          runAttractUICycle();
          setTimeout(() => {
            fo.style.opacity = '0';
            setTimeout(() => { fo.style.display = 'none'; }, 1000);
          }, 500);
        }, 1000);
      }, 3000);
    }
  }
}
