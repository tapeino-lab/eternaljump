import fs from 'fs';
let code = fs.readFileSync('src/shop.ts', 'utf8');

const targetStr = `    } else {
      buyBtn.disabled = (game.totalCoins < price);
      buyBtn.classList.add('btn-get');
      if (game.totalCoins >= price) {
        buyBtn.classList.add('can-get');
      }
      buyBtn.innerHTML = '<span class="btn-get-label">GET</span><div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;"><div class="coin-icon" style="transform: translateY(-0.5px);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div><span class="shop-price-val">' + price + '</span></div>';
    }`;

const replacement = `    } else {
      buyBtn.disabled = (game.totalCoins < price);
      buyBtn.classList.add('btn-get');
      if (game.totalCoins >= price) {
        buyBtn.classList.add('can-get');
        buyBtn.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; min-height: 14px;"><span style="font-size: 9px;">GET</span></div>';
      } else {
        buyBtn.innerHTML = '<span class="btn-get-label">GET</span><div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;"><div class="coin-icon" style="transform: translateY(-0.5px);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div><span class="shop-price-val">' + price + '</span></div>';
      }
    }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/shop.ts', code);
  console.log("Success");
} else {
  console.log("Failed to find target string");
}
