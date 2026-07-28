import fs from 'fs';
let code = fs.readFileSync('src/shop.ts', 'utf8');

const targetStr = `    itemCard.classList.remove('owned', 'equipped');
    buyBtn.classList.remove('btn-get', 'btn-equip', 'btn-equipped');
    buyBtn.style.color = '';
    buyBtn.style.borderColor = '';

    if (game.inventory[id]) {
      itemCard.classList.add('owned');
      buyBtn.disabled = false;
      if (game.equipped?.[id]) {
        itemCard.classList.add('equipped');
        buyBtn.classList.add('btn-equipped');
        buyBtn.innerHTML = 'EQUIPPED';
      } else {
        buyBtn.classList.add('btn-equip');
        buyBtn.innerHTML = 'EQUIP';
      }
    } else {
      buyBtn.disabled = (game.totalCoins < price);
      buyBtn.classList.add('btn-get');
      buyBtn.innerHTML = '<span class="btn-get-label">GET</span><div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;"><div class="coin-icon" style="transform: translateY(-0.5px);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div><span class="shop-price-val">' + price + '</span></div>';
    }`;

const replacement = `    itemCard.classList.remove('owned', 'equipped');
    buyBtn.classList.remove('btn-get', 'btn-equip', 'btn-equipped', 'can-get');
    buyBtn.style.color = '';
    buyBtn.style.borderColor = '';

    if (game.inventory[id]) {
      itemCard.classList.add('owned');
      buyBtn.disabled = false;
      if (game.equipped?.[id]) {
        itemCard.classList.add('equipped');
        buyBtn.classList.add('btn-equipped');
        buyBtn.innerHTML = 'EQUIPPED';
      } else {
        buyBtn.classList.add('btn-equip');
        buyBtn.innerHTML = 'EQUIP';
      }
    } else {
      buyBtn.disabled = (game.totalCoins < price);
      buyBtn.classList.add('btn-get');
      if (game.totalCoins >= price) {
        buyBtn.classList.add('can-get');
      }
      buyBtn.innerHTML = '<span class="btn-get-label">GET</span><div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;"><div class="coin-icon" style="transform: translateY(-0.5px);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div><span class="shop-price-val">' + price + '</span></div>';
    }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/shop.ts', code);
  console.log("Success");
} else {
  console.log("Failed to find target string");
}
