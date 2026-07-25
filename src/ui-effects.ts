import { $ } from './utils.js';
import { game } from './state.js';

export function applyCoinCountUp(coins: number, title: string = 'DEMO BONUS', alreadyAddedToTotal: boolean = false, showWindow: boolean = true) {
  if (coins <= 0) return;
  
  if (alreadyAddedToTotal) {
    game.totalCoins -= coins;
  }
  
  let floater: HTMLElement | null = null;
  if (showWindow) {
    floater = document.createElement('div');
    floater.innerHTML = '<div style="font-size:10px; color:#fff; animation:blinkRetro 0.8s infinite; margin-bottom:8px; white-space:nowrap;">' + title + '</div><div style="display:flex; justify-content:center; align-items:center; color:#fd0; font-size:10px; text-shadow:1px 1px 0 #000;"><div class="coin-icon" style="margin-right:6px;"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div> &times; ' + coins + '</div>';
    floater.style.position = 'absolute';
    floater.style.left = '50%';
    floater.style.top = '40%';
    floater.style.transform = 'translate(-50%, -50%)';
    floater.style.backgroundColor = 'rgba(0,0,0,0.85)';
    floater.style.border = '2px solid #fff';
    floater.style.padding = '12px 16px';
    floater.style.borderRadius = '4px';
    floater.style.fontFamily = '"Press Start 2P", sans-serif';
    floater.style.textAlign = 'center';
    floater.style.zIndex = '2000';
    floater.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
    
    floater.style.pointerEvents = 'none';
    let cw = document.getElementById('canvasWrapper');
    if (cw) cw.appendChild(floater);
      
    setTimeout(() => { if (floater) floater.remove(); }, 2000);
  }
  
  let delay = showWindow ? 1000 : 50;
  setTimeout(() => {
    let uiLayer = document.getElementById('ui');
    if (uiLayer) {
      let coinIcon = uiLayer.querySelector('.coin-icon');
      if (coinIcon) {
        let rect = coinIcon.getBoundingClientRect();
        let cx = rect.left + rect.width / 2;
        let cy = rect.top + rect.height / 2;
        for (let i = 0; i < 30; i++) {
          let p = document.createElement('div');
          p.style.position = 'fixed';
          p.style.left = cx + 'px';
          p.style.top = cy + 'px';
          let size = 6 + Math.random() * 10;
          p.style.width = size + 'px';
          p.style.height = size + 'px';
          p.style.backgroundColor = '#fd0';
          p.style.borderRadius = '0';
          p.style.pointerEvents = 'none';
          p.style.zIndex = '2000';
          document.body.appendChild(p);
          let ang = Math.random() * Math.PI * 2;
          let spd = Math.random() * 200 + 50;
          let tx = Math.cos(ang) * spd;
          let ty = Math.sin(ang) * spd;
          let rot = Math.random() * 720 - 360;
          p.animate([
            { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg) scale(0)`, opacity: 0 }
          ], { duration: 800, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
          setTimeout(() => p.remove(), 800);
        }
          
        let coinUIContainer = coinIcon.parentElement;
        if (coinUIContainer) {
          coinUIContainer.animate([
            { transform: 'scale(1)', filter: 'brightness(1)', color: 'inherit' },
            { transform: 'scale(1.8)', filter: 'brightness(2)', color: '#fd0', offset: 0.1 },
            { transform: 'scale(1)', filter: 'brightness(1)', color: 'inherit' }
          ], { duration: 600, easing: 'ease-out' });
        }
      }
    }
    
    let totalAdded = 0;
    let addInterval = setInterval(() => {
       if (totalAdded >= coins) {
         clearInterval(addInterval);
         return;
       }
       let addAmt = Math.max(1, Math.floor((coins - totalAdded) / 5));
       totalAdded += addAmt;
       game.totalCoins += addAmt;
       localStorage.setItem('JUMP_TOTAL_COINS', game.totalCoins.toString());
    }, 50);
  }, delay);
}
