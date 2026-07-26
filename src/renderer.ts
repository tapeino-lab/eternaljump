import { game, demoState } from './state.js';
import { ctx, isAttractMode, IMG, runAttractUICycle, setIgnoreNextTap } from './game.js';
import { fireworksSystem } from './fireworks.js';
import { airplaneSystem } from './airplane.js';

import { config } from './config.js';
import { RankingAPI } from './ranking.js';
import { RND, FLR, MIN, MAX, SIN, ABS, PI, $ } from './utils.js';

export function dR(x, y, w, h, c) {
  if (c !== null) ctx.fillStyle = c;
  ctx.fillRect(FLR(x), FLR(y), FLR(w), FLR(h));
}

export function getColorAtScore(s) {
  let phases = config.bgPhases;
  if (s <= phases[0].score) return phases[0].color;
  if (s >= phases[phases.length - 1].score) return phases[phases.length - 1].color;
  
  for (let i = 0; i < phases.length - 1; i++) {
    let p1 = phases[i], p2 = phases[i + 1];
    if (s >= p1.score && s <= p2.score) {
      let r = (s - p1.score) / (p2.score - p1.score);
      return {
        r: p1.color.r + (p2.color.r - p1.color.r) * r,
        g: p1.color.g + (p2.color.g - p1.color.g) * r,
        b: p1.color.b + (p2.color.b - p1.color.b) * r
      };
    }
  }
  return phases[0].color;
}

const bgCache = document.createElement('canvas');
bgCache.width = 1;
bgCache.height = config.gameHeight;
const bgCtx = bgCache.getContext('2d', { alpha: false });
let lastBGScore = -1;

export function resetBGScore() {
  lastBGScore = -1;
}

const cloudCaches = [];
for (let i = 0; i < 3; i++) {
  let c = document.createElement('canvas');
  let cx = c.getContext('2d', { alpha: true });
  let s = 10;
  if (i === 0) {
    c.width = s * 6; c.height = s * 3;
    cx.fillStyle = '#fff';
    cx.fillRect(s, s, s * 4, s * 2);
    cx.fillRect(s * 2, 0, s * 2, s);
    cx.fillRect(0, s * 2, s * 6, s);
  } else if (i === 1) {
    c.width = s * 7; c.height = s * 3;
    cx.fillStyle = '#fff';
    cx.fillRect(s, s, s * 5, s * 2);
    cx.fillRect(s * 2, 0, s * 3, s);
    cx.fillRect(0, s * 2, s * 7, s);
  } else {
    c.width = s * 5; c.height = s * 3;
    cx.fillStyle = '#fff';
    cx.fillRect(s, s, s * 3, s * 2);
    cx.fillRect(s * 2, 0, s * 2, s);
    cx.fillRect(0, s * 2, s * 5, s);
  }
  cloudCaches.push(c);
}

export function drawBG(ts) {
  let scoreTop = (game.baseScoreY - game.cameraY) * config.scoreMultiplier;
  let sT = FLR(scoreTop);
  if (sT !== lastBGScore) {
    let scoreBottom = (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier;
    let grad = bgCtx.createLinearGradient(0, 0, 0, config.gameHeight);
    for (let i = 0; i <= 4; i++) {
      let ratio = i / 4;
      let s = scoreTop - (scoreTop - scoreBottom) * ratio;
      let c = getColorAtScore(s);
      grad.addColorStop(ratio, 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')');
    }
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 1, config.gameHeight);
    lastBGScore = sT;
  }
  ctx.drawImage(bgCache, 0, 0, 1, config.gameHeight, 0, 0, config.gameWidth, config.gameHeight);
  
  let currentVisScore = (scoreTop + (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier) / 2;
  let sA = 0;
  if (currentVisScore >= 45000 && currentVisScore < 60000) sA = (currentVisScore - 45000) / 15000;
  else if (currentVisScore >= 60000 && currentVisScore < 125000) sA = 1;
  else if (currentVisScore >= 125000 && currentVisScore < 135000) sA = 1 - (currentVisScore - 125000) / 10000;
  
  let bA = (currentVisScore < 100000);
  if (sA > 0) {
    ctx.fillStyle = '#fff';
    game.stars.forEach(function(st) {
      let sy = (st.y - game.cameraY * st.speed) % config.gameHeight;
      if (sy < 0) sy += config.gameHeight;
      ctx.globalAlpha = sA * (bA ? (0.5 + 0.5 * SIN(ts * st.blink)) : 1);
      ctx.fillRect(FLR(st.x), FLR(sy), st.size, st.size);
    });
    ctx.globalAlpha = 1.0;
  }
  
  let cA = currentVisScore < 40000 ? 1 : (currentVisScore < 50000 ? 1 - (currentVisScore - 40000) / 10000 : 0);
  if (cA > 0) {
    game.clouds.forEach(function(c) {
      let sy = (c.y - game.cameraY) * c.speed, s = 10 * c.scale;
      if (sy > config.gameHeight || sy + s * 3 < 0) return;
      ctx.globalAlpha = cA * (c.speed === 0.6 ? 0.15 : 0.25);
      let cc = cloudCaches[c.type];
      ctx.drawImage(cc, FLR(c.x - s), FLR(sy - s), FLR(cc.width * c.scale), FLR(cc.height * c.scale));
      ctx.globalAlpha = 1.0;
    });
  }
  return getColorAtScore(scoreTop);
}

export function drawHorizontalPipe(ctx: CanvasRenderingContext2D) {
  if (game.cameraY > 300) return;

  ctx.save();

  // NES Super Mario Style Horizontal Green Pipe (Mouth facing Right at x = 27)
  // Y range: 210 to 241 (Lip height 32px, 1px overlap with ground at Y=240 for seamless fit)

  // 1. Black Outer Outline
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 211, 18, 30);  // Body outer border
  ctx.fillRect(18, 209, 10, 33); // Lip outer border

  // 2. Pipe Body (x = 0..18)
  ctx.fillStyle = '#b8f818';
  ctx.fillRect(0, 212, 18, 2);   // Top highlight line

  ctx.fillStyle = '#00d800';
  ctx.fillRect(0, 214, 18, 3);   // Bright green band

  ctx.fillStyle = '#00a800';
  ctx.fillRect(0, 217, 18, 15);  // Base green

  ctx.fillStyle = '#005000';
  ctx.fillRect(0, 232, 18, 5);   // Dark green shadow

  ctx.fillStyle = '#002800';
  ctx.fillRect(0, 237, 18, 3);   // Bottom extra dark shadow

  // 3. Pipe Lip / Rim (x = 18..25)
  ctx.fillStyle = '#b8f818';
  ctx.fillRect(18, 210, 8, 3);   // Lip top highlight

  ctx.fillStyle = '#00d800';
  ctx.fillRect(18, 213, 8, 3);   // Lip bright green

  ctx.fillStyle = '#00a800';
  ctx.fillRect(18, 216, 8, 17);  // Lip base green

  ctx.fillStyle = '#005000';
  ctx.fillRect(18, 233, 8, 6);   // Lip shadow

  ctx.fillStyle = '#002800';
  ctx.fillRect(18, 239, 8, 2);   // Lip bottom shadow

  // Lip left bevel line for pixel depth
  ctx.fillStyle = '#002800';
  ctx.fillRect(18, 210, 1, 31);

  // 4. Mouth Hole Opening on Right (x = 26..27)
  ctx.fillStyle = '#000000';
  ctx.fillRect(26, 210, 2, 31);
  ctx.fillStyle = '#002800';
  ctx.fillRect(26, 212, 1, 27);

  ctx.restore();
}

export function drawGameEntities(ts) {
  airplaneSystem.draw(ctx, game, isAttractMode);
  game.birds.forEach(function(b) {
    if (b.y > game.cameraY + config.gameHeight + 50 || b.y < game.cameraY - 50) return;
    if (!b.isPerched && (b.type === 1 || b.type === 2)) b.draw(ts);
  });
  game.platforms.forEach(function(p) {
    if (p.y > game.cameraY + config.gameHeight + 100 || p.y + (p.h || 32) < game.cameraY - 100) return;
    p.draw();
  });
  game.items.forEach(function(i) {
    if (i.y > game.cameraY + config.gameHeight + 50 || i.y + i.h < game.cameraY - 50) return;
    i.draw();
  });
  game.coins.forEach(function(c) {
    if (c.y > game.cameraY + config.gameHeight + 50 || c.y + c.h < game.cameraY - 50) return;
    c.draw();
  });
  game.meteors.forEach(function(m) {
    if (m.y > game.cameraY + config.gameHeight + 100 || m.y < game.cameraY - 100) return;
    m.draw();
  });
  game.particles.forEach(function(pt) {
    if (pt.y > game.cameraY + config.gameHeight + 50 || pt.y < game.cameraY - 50) return;
    pt.draw();
  });
  game.birds.forEach(function(b) {
    if (b.y > game.cameraY + config.gameHeight + 50 || b.y < game.cameraY - 50) return;
    if (b.type === 0 || (b.isPerched && b.type === 1)) b.draw(ts);
  });
  game.npcs.forEach(function(n) {
    if (n.y > game.cameraY + config.gameHeight + 100 || n.y + (n.h || 32) < game.cameraY - 100) return;
    n.draw();
  });
  game.player.draw();
  drawHorizontalPipe(ctx);
}

export function drawOffscreenIndicators() {
  game.npcs.forEach(function(n) {
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
  });
}

function getEquippedIconSVG(id: string | null): string {
  if (id === 'magnet') {
    return `<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="2" y="2" width="4" height="10" fill="#f33"/>
      <rect x="10" y="2" width="4" height="10" fill="#f33"/>
      <rect x="2" y="10" width="12" height="4" fill="#f33"/>
      <rect x="6" y="6" width="4" height="8" fill="#000"/>
      <rect x="2" y="2" width="4" height="3" fill="#eee"/>
      <rect x="10" y="2" width="4" height="3" fill="#eee"/>
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
      <rect x="4" y="8" width="8" height="8" fill="#fcc"/>
      <rect x="0" y="0" width="16" height="8" fill="#2c2"/>
      <rect x="2" y="2" width="4" height="4" fill="#fff"/>
      <rect x="10" y="2" width="4" height="4" fill="#fff"/>
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

export function drawBackgroundLayer(ts: number) {
  return drawBG(ts);
}

export function drawWorldLayer(ts: number) {
  fireworksSystem.draw(ctx);
  if (IMG.title && IMG.title.complete && IMG.title.naturalWidth > 0) {
    ctx.drawImage(IMG.title, FLR((config.gameWidth - IMG.title.naturalWidth) / 2), 95);
  }
}

export function drawEntitiesLayer(ts: number) {
  drawGameEntities(ts);
}

export function drawUILayer(topColor: any, ts: number) {
  if (game.flyingCoins) {
    game.flyingCoins.forEach(function(fc) { fc.draw(); });
  }
  
  drawOffscreenIndicators();
  updateHUD(topColor);
  updateDemoRanking(ts);
}

export function render(ts: number) {
  let topColor = drawBackgroundLayer(ts);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  
  let sX = 0, sY = 0;
  if (game.shakeAmount > 0) {
    sX = (RND() - 0.5) * 2 * game.shakeAmount;
    sY = (RND() - 0.5) * 2 * game.shakeAmount;
    game.shakeAmount *= 0.85;
    if (game.shakeAmount < 0.5) game.shakeAmount = 0;
  }
  ctx.translate(FLR(sX), FLR(-game.cameraY + sY));
  
  drawWorldLayer(ts);
  drawEntitiesLayer(ts);
  
  ctx.restore();
  
  drawUILayer(topColor, ts);
}

