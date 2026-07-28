import { game } from './state.js';
import { secureStorage } from './secureStorage.js';
import { $ } from './utils.js';

export interface ShopItemConfig {
  id: string;
  name: string;
  desc: string;
  price: number;
  iconSvg: string;
}

export const SHOP_ITEMS: ShopItemConfig[] = [
  {
    id: 'mushroom',
    name: 'GREEN MUSHROOM',
    desc: 'Warp to space',
    price: 1000,
    iconSvg: `<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">
  <rect x="5" y="8" width="6" height="6" fill="#fcc"/>
  <rect x="2" y="2" width="12" height="6" fill="#2c2"/>
  <rect x="4" y="4" width="3" height="3" fill="#fff"/>
  <rect x="9" y="4" width="3" height="3" fill="#fff"/>
</svg>`
  },
  {
    id: 'helmet',
    name: 'HELMET',
    desc: 'Protects from meteors',
    price: 3000,
    iconSvg: `<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">
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
</svg>`
  },
  {
    id: 'skates',
    name: 'ICE SKATES',
    desc: 'Soft touch on ice',
    price: 6000,
    iconSvg: `<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">
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
</svg>`
  },
  {
    id: 'autocruise',
    name: 'AUTO CRUISE',
    desc: '"I\'ll take care of it."',
    price: 10000,
    iconSvg: `<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">
      <!-- Main Monitor Outline -->
      <rect x="2" y="2" width="12" height="12" fill="#111"/>
      
      <!-- Casing Base -->
      <rect x="3" y="3" width="10" height="10" fill="#d8d4c0"/>
      <!-- Highlights -->
      <rect x="3" y="3" width="10" height="1" fill="#fff"/>
      <rect x="3" y="4" width="1" height="9" fill="#fff"/>
      <!-- Shadows -->
      <rect x="4" y="12" width="9" height="1" fill="#a09888"/>
      <rect x="12" y="4" width="1" height="8" fill="#a09888"/>

      <!-- Screen Bezel -->
      <rect x="4" y="4" width="8" height="7" fill="#111"/>
      
      <!-- Screen -->
      <rect x="5" y="5" width="6" height="5" fill="#113311"/>
      <rect x="5" y="5" width="6" height="1" fill="#1a4d1a"/>
      
      <!-- Face (Green Phosphor) -->
      <rect x="6" y="6" width="1" height="1" fill="#33ff33"/>
      <rect x="9" y="6" width="1" height="1" fill="#33ff33"/>
      <rect x="7" y="8" width="2" height="1" fill="#33ff33"/>

      <!-- Drive & LED -->
      <rect x="5" y="11" width="3" height="1" fill="#555"/>
      <rect x="10" y="11" width="1" height="1" fill="#ff3333"/>
    </svg>`
  },
  {
    id: 'magnet',
    name: 'MAGNET',
    desc: 'Easy coin collect',
    price: 15000,
    iconSvg: `<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">
  <rect x="3" y="2" width="10" height="1" fill="#000"/>
  <rect x="2" y="3" width="1" height="10" fill="#000"/>
  <rect x="13" y="3" width="1" height="10" fill="#000"/>
  <rect x="3" y="13" width="3" height="1" fill="#000"/>
  <rect x="10" y="13" width="3" height="1" fill="#000"/>
  <rect x="6" y="6" width="1" height="7" fill="#000"/>
  <rect x="9" y="6" width="1" height="7" fill="#000"/>
  <rect x="7" y="5" width="2" height="1" fill="#000"/>
  <rect x="3" y="3" width="10" height="2" fill="#e52521"/>
  <rect x="3" y="5" width="3" height="4" fill="#e52521"/>
  <rect x="10" y="5" width="3" height="4" fill="#e52521"/>
  <rect x="3" y="9" width="3" height="4" fill="#ccc"/>
  <rect x="10" y="9" width="3" height="4" fill="#ccc"/>
  <rect x="4" y="3" width="8" height="1" fill="#fff" opacity="0.5"/>
  <rect x="4" y="4" width="1" height="4" fill="#fff" opacity="0.5"/>
  <rect x="11" y="4" width="1" height="4" fill="#fff" opacity="0.5"/>
</svg>`
  }
];

export const shopState = {
  initialEquipped: {} as Record<string, boolean>,
  pendingItem: null as string | null,
  get itemData(): Record<string, { name: string; desc: string; price: number }> {
    const data: Record<string, { name: string; desc: string; price: number }> = {};
    SHOP_ITEMS.forEach(item => {
      data[item.id] = { name: item.name, desc: item.desc, price: item.price };
    });
    return data;
  }
};

export function renderShopItemsDOM() {
  const container = document.querySelector('.shop-items-container');
  if (!container) return;

  container.innerHTML = SHOP_ITEMS.map(item => `
    <div class="shop-item">
      <div class="shop-item-main">
        <div class="shop-item-icon">${item.iconSvg}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
        </div>
        <button class="shop-item-buy" data-id="${item.id}" data-price="${item.price}">
          <span class="btn-get-label">GET</span>
          <div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;">
            <div class="coin-icon" style="transform: translateY(-0.5px);">
              <div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div>
            </div>
            <span class="shop-price-val">${item.price}</span>
          </div>
        </button>
      </div>
      <div class="shop-item-desc">${item.desc}</div>
    </div>
  `).join('');
}

export function updateShopUI() {
  document.querySelectorAll('.shopCoinAmountVal').forEach(el => {
    el.innerHTML = game.totalCoins.toString();
  });

  document.querySelectorAll('.shop-item').forEach(itemCard => {
    let buyBtn = itemCard.querySelector('.shop-item-buy') as HTMLButtonElement;
    if (!buyBtn) return;
    let id = buyBtn.getAttribute('data-id') || '';
    let price = parseInt(buyBtn.getAttribute('data-price') || '0', 10);

    let descEl = itemCard.querySelector('.shop-item-desc');
    if (descEl && shopState.itemData[id]) {
      descEl.textContent = shopState.itemData[id].desc;
    }

    itemCard.classList.remove('owned', 'equipped');
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
        buyBtn.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; min-height: 14px;"><span style="font-size: 9px;">GET</span></div>';
      } else {
        buyBtn.innerHTML = '<span class="btn-get-label">GET</span><div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;"><div class="coin-icon" style="transform: translateY(-0.5px);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div><span class="shop-price-val">' + price + '</span></div>';
      }
    }
  });
}

export function onEnterShop() {
  shopState.initialEquipped = { ...(game.equipped || {}) };
  updateShopUI();

  const container = document.querySelector('.shop-items-container') as HTMLElement;
  if (container) {
    container.scrollTop = 0;
  }
}

export function initShop() {
  renderShopItemsDOM();

  const shopControlArea = $('shopControlArea');
  if (shopControlArea) {
    ['touchstart', 'mousedown'].forEach(ev => {
      shopControlArea.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        game.state = 'intro';
        game.player.x = 44;
        game.player.facingRight = true;
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
        import('./lifecycle.js').then(m => m.startAttractCycle());
      }, { passive: false });
    });
  }

  document.querySelectorAll('.shop-item').forEach(itemCard => {
    itemCard.addEventListener('click', () => {
      let buyBtn = itemCard.querySelector('.shop-item-buy') as HTMLButtonElement;
      if (!buyBtn) return;
      let id = buyBtn.getAttribute('data-id') || '';

      if (game.inventory[id]) {
        if (!game.equipped) game.equipped = {};
        game.equipped[id] = !game.equipped[id];
        updateShopUI();
      } else {
        let item = shopState.itemData[id];
        if (!item || game.totalCoins < item.price) return;

        // Complete award unlock - totalCoins is NOT deducted!
        game.inventory[id] = true;
        if (!game.equipped) game.equipped = {};
        game.equipped[id] = true; // Immediately equip upon purchase

        secureStorage.setItem('JUMP_TOTAL_COINS', game.totalCoins);
        secureStorage.setItem('JUMP_INVENTORY', game.inventory);
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);

        updateShopUI();

        // 演出: アイテム枠のレインボー点滅
        itemCard.classList.add('shop-item-rainbow-flash');
        setTimeout(() => {
          itemCard.classList.remove('shop-item-rainbow-flash');
        }, 1500);
      }
    });
  });
}

  const resetBtn = $('shopResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      game.inventory = {};
      game.equipped = {};
      secureStorage.setItem('JUMP_INVENTORY', game.inventory);
      secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
      updateShopUI();
    });
  }
