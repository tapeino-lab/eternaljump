import fs from 'fs';
let code = fs.readFileSync('src/shop.ts', 'utf8');

const targetStr = `        // 演出2: アイテム枠のレインボー点滅＆コイン・紙吹雪のシャワー
        itemCard.classList.add('shop-item-rainbow-flash');

        const itemsContainer = document.querySelector('.shop-items-container');
        if (itemsContainer) {
          itemsContainer.style.position = 'relative';
          // コンテナの高さを取得（紙吹雪の範囲）
          const h = (itemsContainer as HTMLElement).offsetHeight || 360;
          const w = (itemsContainer as HTMLElement).offsetWidth || 224;

          const numParticles = 60;
          const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
          const particles: HTMLElement[] = [];

          for (let i = 0; i < numParticles; i++) {
            const p = document.createElement('div');
            const isCoin = Math.random() > 0.6;
            p.className = isCoin ? 'falling-coin' : 'confetti-piece';
            if (!isCoin) {
              p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            }
            // ランダムな初期位置（上部）と遅延
            p.style.left = (Math.random() * w) + 'px';
            p.style.top = '-20px';
            const delay = Math.random() * 0.5;
            const duration = 0.8 + Math.random() * 0.7;
            p.style.animationDelay = delay + 's';
            p.style.animationDuration = duration + 's';
            // 多少左右に散らす
            const shiftX = (Math.random() - 0.5) * 50;
            p.style.setProperty('--shift-x', shiftX + 'px'); // If we wanted horizontal drift, we could use this, but for now linear fall is fine
            
            itemsContainer.appendChild(p);
            particles.push(p);
          }

          setTimeout(() => {
            itemCard.classList.remove('shop-item-rainbow-flash');
            particles.forEach(p => {
              if (p.parentNode) p.parentNode.removeChild(p);
            });
          }, 1500);
        }`;

const replacement = `        // 演出: アイテム枠のレインボー点滅
        itemCard.classList.add('shop-item-rainbow-flash');
        setTimeout(() => {
          itemCard.classList.remove('shop-item-rainbow-flash');
        }, 1500);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/shop.ts', code);
  console.log("Success");
} else {
  console.log("Failed to find target string");
}
