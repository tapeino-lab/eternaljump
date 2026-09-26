import { game } from './state.js';

export let animatedTotalCoins: number | null = null;

let activeDelayTimer: any = null;
let activeCountUpDelayTimer: any = null;
let activeSpawnTimer: any = null;
let activeFloater: HTMLElement | null = null;

export function stopCoinCountUpAnimation() {
  if (activeDelayTimer) {
    clearTimeout(activeDelayTimer);
    activeDelayTimer = null;
  }
  if (activeCountUpDelayTimer) {
    clearTimeout(activeCountUpDelayTimer);
    activeCountUpDelayTimer = null;
  }
  if (activeSpawnTimer) {
    clearInterval(activeSpawnTimer);
    activeSpawnTimer = null;
  }
  if (activeFloater) {
    activeFloater.remove();
    activeFloater = null;
  }
  animatedTotalCoins = null;
}

export function applyCoinCountUp(coins: number, title: string = 'DEMO BONUS', _alreadyAddedToTotal: boolean = false, showWindow: boolean = true) {
  if (coins <= 0) return;

  stopCoinCountUpAnimation();

  const finalTotal = game.totalCoins;
  const startTotal = Math.max(0, finalTotal - coins);
  animatedTotalCoins = startTotal;

  // Immediately reflect starting animated value in HUD if present
  let hudCoinEl = document.getElementById('hud-coin');
  if (hudCoinEl) {
    hudCoinEl.textContent = startTotal.toString();
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
    floater.style.zIndex = '15';
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
    activeFloater = floater;
  }
  
  // Start flying effect after blinking text animation completes (1200ms)
  let delay = showWindow ? 1200 : 50;
  activeDelayTimer = setTimeout(() => {
    activeDelayTimer = null;
    // Spawn floating +n popup text near the HUD coin display
    let coinBox = document.getElementById('hud-coin-box') || (document.querySelector('#ui .coin-icon')?.parentElement as HTMLElement);
    if (coinBox && coinBox.parentElement) {
      let parent = coinBox.parentElement as HTMLElement;
      parent.style.position = 'relative';

      let oldPop = parent.querySelector('.coin-add-popup');
      if (oldPop) oldPop.remove();

      let pop = document.createElement('span');
      pop.className = 'coin-add-popup';
      pop.textContent = '+' + coins;
      parent.appendChild(pop);

      pop.addEventListener('animationend', () => {
        pop.remove();
      });
    }

    let remainingCoins = coins;
    let currentDisplay = startTotal;
    // Split into max 10 particle bursts to complete smoothly even for large coin counts
    let totalSpawns = Math.min(coins, 10);
    let coinPerSpawn = Math.max(1, Math.ceil(coins / totalSpawns));
    let spawnInterval = 60;

    // Start count-up timing right as the popup begins fading out at 2.2 seconds (2200ms)
    let countUpDelay = 2200;

    activeCountUpDelayTimer = setTimeout(() => {
      activeCountUpDelayTimer = null;
      activeSpawnTimer = setInterval(() => {
        if (remainingCoins <= 0 || currentDisplay >= finalTotal) {
          clearInterval(activeSpawnTimer);
          activeSpawnTimer = null;
          animatedTotalCoins = null;

          let hc = document.getElementById('hud-coin');
          if (hc) hc.textContent = finalTotal.toString();

          setTimeout(() => {
            if (activeFloater) {
              activeFloater.style.transition = 'opacity 0.3s';
              activeFloater.style.opacity = '0';
              let toRemove = activeFloater;
              activeFloater = null;
              setTimeout(() => { if (toRemove) toRemove.remove(); }, 300);
            }
          }, 400);
          return;
        }

        let amt = Math.min(remainingCoins, coinPerSpawn);
        remainingCoins -= amt;
        currentDisplay = Math.min(finalTotal, currentDisplay + amt);
        animatedTotalCoins = currentDisplay;

        if (valSpan) {
          valSpan.textContent = remainingCoins.toString();
        }

        let hc = document.getElementById('hud-coin');
        if (hc) {
          hc.textContent = currentDisplay.toString();
        }

        let coinBox = document.getElementById('hud-coin-box');
        if (coinBox) {
          coinBox.animate([
            { transform: 'scale(1)', filter: 'brightness(1)' },
            { transform: 'scale(1.4)', filter: 'brightness(2)' },
            { transform: 'scale(1)', filter: 'brightness(1)' }
          ], { duration: 220, easing: 'ease-out' });
        }

      }, spawnInterval);
    }, countUpDelay);

  }, delay);
}
