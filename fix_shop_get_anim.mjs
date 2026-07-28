import fs from 'fs';
let code = fs.readFileSync('src/shop.ts', 'utf8');

const targetStr = `        // Flash shop items container to signify item is acquired & equipped!
        const itemsContainer = document.querySelector('.shop-items-container');
        if (itemsContainer) {
          itemsContainer.classList.remove('shop-flash-effect');
          void (itemsContainer as HTMLElement).offsetWidth;
          itemsContainer.classList.add('shop-flash-effect');
          setTimeout(() => {
            itemsContainer.classList.remove('shop-flash-effect');
          }, 600);
        }`;

const replacement = `        // 演出1: アイテム欄全体を使った巨大なGET!表示
        const itemsContainer = document.querySelector('.shop-items-container');
        if (itemsContainer) {
          const rect = itemsContainer.getBoundingClientRect();
          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          overlay.style.color = '#ff0000';
          overlay.style.fontFamily = "'Press Start 2P', sans-serif";
          overlay.style.fontSize = '32px';
          overlay.style.fontWeight = 'bold';
          overlay.style.textShadow = '4px 4px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff';
          overlay.style.zIndex = '100';
          overlay.style.animation = 'getOverlayAnim 1.5s forwards';
          overlay.innerHTML = 'GET!';
          
          // Animation definition is handled in CSS, but we can inject it if not present, or use keyframes in game.css.
          // Alternatively, just do a simple inline animation with web animations API
          overlay.animate([
            { opacity: 0, transform: 'scale(0.5)' },
            { opacity: 1, transform: 'scale(1.2)', offset: 0.1 },
            { opacity: 1, transform: 'scale(1)', offset: 0.2 },
            { opacity: 1, transform: 'scale(1)', offset: 0.7 },
            { opacity: 0, transform: 'scale(1.5)', offset: 1.0 }
          ], {
            duration: 1500,
            easing: 'ease-out',
            fill: 'forwards'
          });

          // Flash background
          itemsContainer.style.position = 'relative';
          itemsContainer.appendChild(overlay);

          itemsContainer.classList.remove('shop-flash-effect');
          void (itemsContainer as HTMLElement).offsetWidth;
          itemsContainer.classList.add('shop-flash-effect');
          
          setTimeout(() => {
            itemsContainer.classList.remove('shop-flash-effect');
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          }, 1500);
        }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/shop.ts', code);
  console.log("Success");
} else {
  console.log("Failed to find target string");
}
