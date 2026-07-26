import { $ } from './utils.js';
import { game } from './state.js';
import { FlyingCoin } from './entities/index.js';

export function applyCoinCountUp(coins: number, title: string = 'DEMO BONUS', alreadyAddedToTotal: boolean = false, showWindow: boolean = true) {
  if (coins <= 0) return;
  
  if (alreadyAddedToTotal) {
    game.totalCoins -= coins;
  }
  
  let floater: HTMLElement | null = null;
  let valSpan: HTMLElement | null = null;
  if (showWindow) {
    floater = document.createElement('div');
    floater.innerHTML = 
      '<div style="font-size:10px; color:#fff; animation:blinkRetro 0.6s 2; margin-bottom:8px; white-space:nowrap;">' + title + '</div>' +
      '<div style="display:flex; justify-content:center; align-items:center; gap:8px; color:#fff; font-size:10px; text-shadow:1px 1px 0 #000;">' +
        '<div class="coin-icon"></div>' +
        '<span>&times;</span>' +
        '<span id="floater-coin-val">' + coins + '</span>' +
      '</div>';
    floater.style.position = 'absolute';
    floater.style.left = '50%';
    floater.style.top = 'calc(100% * 256 / 360)';
    floater.style.transform = 'translateX(-50%)';
    floater.style.backgroundColor = 'rgba(0,0,0,0.4)';
    floater.style.border = '2px solid #fff';
    floater.style.padding = '12px 16px';
    floater.style.borderRadius = '4px';
    floater.style.fontFamily = '"Press Start 2P", sans-serif';
    floater.style.textAlign = 'center';
    floater.style.zIndex = '2000';
    floater.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
    floater.style.pointerEvents = 'none';
    
    // Inject coin icon pixels inside .coin-icon to match renderer HUD icon
    let cIcon = floater.querySelector('.coin-icon');
    if (cIcon) {
      cIcon.innerHTML = '<div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div>';
    }

    let cw = document.getElementById('canvasWrapper');
    if (cw) cw.appendChild(floater);
    valSpan = floater.querySelector('#floater-coin-val');
  }
  
  // Start flying effect after blinking text animation completes (1200ms)
  let delay = showWindow ? 1200 : 50;
  setTimeout(() => {
    let startX = 128;
    let startY = 250;
    let cw = document.getElementById('canvasWrapper');
    let iconEl = floater ? floater.querySelector('.coin-icon') : null;
    if (cw && iconEl) {
      let cwRect = cw.getBoundingClientRect();
      let iconRect = iconEl.getBoundingClientRect();
      if (cwRect.width > 0 && cwRect.height > 0) {
        startX = (iconRect.left + iconRect.width / 2 - cwRect.left) * (256 / cwRect.width);
        startY = (iconRect.top + iconRect.height / 2 - cwRect.top) * (360 / cwRect.height);
      }
    }

    let remainingCoins = coins;
    // Split into max 10 particle bursts to complete smoothly even for large coin counts
    let totalSpawns = Math.min(coins, 10);
    let coinPerSpawn = Math.max(1, Math.ceil(coins / totalSpawns));
    let spawnInterval = 60;

    let spawnTimer = setInterval(() => {
      if (remainingCoins <= 0) {
        clearInterval(spawnTimer);
        setTimeout(() => {
          if (floater) {
            floater.style.transition = 'opacity 0.3s';
            floater.style.opacity = '0';
            setTimeout(() => { if (floater) floater.remove(); }, 300);
          }
        }, 400);
        return;
      }

      let amt = Math.min(remainingCoins, coinPerSpawn);
      remainingCoins -= amt;
      if (valSpan) {
        valSpan.textContent = remainingCoins.toString();
      }

            let domStartX = 50;
      let domStartY = 50;
      let domEndX = 10;
      let domEndY = 10;
      let uiIcon = document.querySelector('#ui .coin-icon');
      let floaterIcon = floater ? floater.querySelector('.coin-icon') : null;
      let cwEl = document.getElementById('canvasWrapper');

      if (cwEl && uiIcon) {
          let cwRect = cwEl.getBoundingClientRect();
          if (floaterIcon) {
            let fRect = floaterIcon.getBoundingClientRect();
            domStartX = ((fRect.left + fRect.width/2 - cwRect.left) / cwRect.width) * 100;
            domStartY = ((fRect.top + fRect.height/2 - cwRect.top) / cwRect.height) * 100;
          } else {
            domStartX = 50;
            domStartY = (250 / 360) * 100;
          }
          let uRect = uiIcon.getBoundingClientRect();
          domEndX = ((uRect.left + uRect.width/2 - cwRect.left) / cwRect.width) * 100;
          domEndY = ((uRect.top + uRect.height/2 - cwRect.top) / cwRect.height) * 100;
      }

      let fc = document.createElement('div');
      fc.className = 'coin-icon';
      fc.innerHTML = '<div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div>';
      fc.style.position = 'absolute';
      fc.style.zIndex = '3000';
      fc.style.pointerEvents = 'none';
      if (cwEl) cwEl.appendChild(fc);

      let anim = fc.animate([
        { left: domStartX + '%', top: domStartY + '%', transform: 'translate(-50%, -50%) scale(1.5)', opacity: 1 },
        { left: domEndX + '%', top: domEndY + '%', transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
      ], { duration: 400, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });

      anim.onfinish = () => {
        if (fc.parentNode) fc.remove();
        game.totalCoins += amt;
        localStorage.setItem('JUMP_TOTAL_COINS', game.totalCoins.toString());
        if (uiIcon && uiIcon.parentElement) {
            uiIcon.parentElement.animate([
               { transform: 'scale(1)', filter: 'brightness(1)' },
               { transform: 'scale(1.4)', filter: 'brightness(2)' },
               { transform: 'scale(1)', filter: 'brightness(1)' }
            ], { duration: 250, easing: 'ease-out' });
        }
      };

    }, spawnInterval);

  }, delay);
}
