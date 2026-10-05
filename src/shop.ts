import { startAttractCycle } from "./lifecycle.js";
import { game } from './state.js';
import { secureStorage } from './secureStorage.js';
import { persistTotalCoins } from './identity.js';
import { $ } from './utils.js';

export interface ShopItemConfig {
  id: string;
  name: string;
  desc: string;
  price: number;
  iconSvg: string;
}

const LOCK_ICON = `<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" style="display:block; margin:auto;"><path d="M5 6V4.5a3 3 0 1 1 6 0V6h.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H5zm1.5 0h3V4.5a1.5 1.5 0 0 0-3 0V6z"/></svg>`;

export const SHOP_ITEMS: ShopItemConfig[] = [
  {
    id: 'mushroom',
    name: 'GREEN MUSHROOM',
    desc: 'Warp to space',
    price: 1000,
    iconSvg: `<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">
  <rect x="5" y="2" width="6" height="1" fill="#1a0f08"/>
  <rect x="3" y="3" width="2" height="1" fill="#1a0f08"/>
  <rect x="5" y="3" width="6" height="1" fill="#fdc86e"/>
  <rect x="11" y="3" width="2" height="1" fill="#1a0f08"/>
  <rect x="2" y="4" width="1" height="1" fill="#1a0f08"/>
  <rect x="3" y="4" width="1" height="1" fill="#fdc86e"/>
  <rect x="4" y="4" width="8" height="1" fill="#9f582b"/>
  <rect x="12" y="4" width="1" height="1" fill="#fdc86e"/>
  <rect x="13" y="4" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="5" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="5" width="1" height="1" fill="#fdc86e"/>
  <rect x="3" y="5" width="1" height="1" fill="#9f582b"/>
  <rect x="4" y="5" width="8" height="1" fill="#1a0f08"/>
  <rect x="12" y="5" width="1" height="1" fill="#9f582b"/>
  <rect x="13" y="5" width="1" height="1" fill="#fdc86e"/>
  <rect x="14" y="5" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="6" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="6" width="1" height="1" fill="#9f582b"/>
  <rect x="3" y="6" width="1" height="1" fill="#1a0f08"/>
  <rect x="12" y="6" width="1" height="1" fill="#1a0f08"/>
  <rect x="13" y="6" width="1" height="1" fill="#9f582b"/>
  <rect x="14" y="6" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="7" width="1" height="1" fill="#9f582b"/>
  <rect x="2" y="7" width="5" height="1" fill="#1a0f08"/>
  <rect x="9" y="7" width="5" height="1" fill="#1a0f08"/>
  <rect x="14" y="7" width="1" height="1" fill="#9f582b"/>
  <rect x="1" y="8" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="8" width="4" height="1" fill="#fdc86e"/>
  <rect x="6" y="8" width="1" height="1" fill="#d69435"/>
  <rect x="7" y="8" width="2" height="1" fill="#1a0f08"/>
  <rect x="9" y="8" width="4" height="1" fill="#fdc86e"/>
  <rect x="13" y="8" width="1" height="1" fill="#d69435"/>
  <rect x="14" y="8" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="9" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="9" width="1" height="1" fill="#fdc86e"/>
  <rect x="3" y="9" width="2" height="1" fill="#0b5650"/>
  <rect x="5" y="9" width="1" height="1" fill="#59d68a"/>
  <rect x="6" y="9" width="1" height="1" fill="#6f2e10"/>
  <rect x="7" y="9" width="2" height="1" fill="#fdc86e"/>
  <rect x="9" y="9" width="1" height="1" fill="#fdc86e"/>
  <rect x="10" y="9" width="2" height="1" fill="#0b5650"/>
  <rect x="12" y="9" width="1" height="1" fill="#59d68a"/>
  <rect x="13" y="9" width="1" height="1" fill="#6f2e10"/>
  <rect x="14" y="9" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="10" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="10" width="1" height="1" fill="#fdc86e"/>
  <rect x="3" y="10" width="1" height="1" fill="#0b5650"/>
  <rect x="4" y="10" width="1" height="1" fill="#59d68a"/>
  <rect x="5" y="10" width="1" height="1" fill="#0b5650"/>
  <rect x="6" y="10" width="1" height="1" fill="#6f2e10"/>
  <rect x="7" y="10" width="2" height="1" fill="#d69435"/>
  <rect x="9" y="10" width="1" height="1" fill="#fdc86e"/>
  <rect x="10" y="10" width="1" height="1" fill="#0b5650"/>
  <rect x="11" y="10" width="1" height="1" fill="#59d68a"/>
  <rect x="12" y="10" width="1" height="1" fill="#0b5650"/>
  <rect x="13" y="10" width="1" height="1" fill="#6f2e10"/>
  <rect x="14" y="10" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="11" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="11" width="1" height="1" fill="#d69435"/>
  <rect x="3" y="11" width="1" height="1" fill="#59d68a"/>
  <rect x="4" y="11" width="2" height="1" fill="#0b5650"/>
  <rect x="6" y="11" width="1" height="1" fill="#6f2e10"/>
  <rect x="7" y="11" width="2" height="1" fill="#1a0f08"/>
  <rect x="9" y="11" width="1" height="1" fill="#d69435"/>
  <rect x="10" y="11" width="1" height="1" fill="#59d68a"/>
  <rect x="11" y="11" width="2" height="1" fill="#0b5650"/>
  <rect x="13" y="11" width="1" height="1" fill="#6f2e10"/>
  <rect x="14" y="11" width="1" height="1" fill="#1a0f08"/>
  <rect x="1" y="12" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="12" width="1" height="1" fill="#d69435"/>
  <rect x="3" y="12" width="4" height="1" fill="#6f2e10"/>
  <rect x="7" y="12" width="2" height="1" fill="#ac9fb1"/>
  <rect x="9" y="12" width="1" height="1" fill="#d69435"/>
  <rect x="10" y="12" width="4" height="1" fill="#6f2e10"/>
  <rect x="14" y="12" width="1" height="1" fill="#1a0f08"/>
  <rect x="2" y="13" width="5" height="1" fill="#1a0f08"/>
  <rect x="9" y="13" width="5" height="1" fill="#1a0f08"/>
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
          <span class="btn-get-label" style="display:flex; justify-content:center; align-items:center;">${LOCK_ICON}</span>
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
        buyBtn.innerHTML = '<span class="btn-get-label" style="display:flex; justify-content:center; align-items:center;">' + LOCK_ICON + '</span><div class="shop-price-tag" style="display:flex; align-items:center; gap:2px;"><div class="coin-icon" style="transform: translateY(-0.5px);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div><span class="shop-price-val">' + price + '</span></div>';
      }
    }
  });

  const equippedSlots = document.querySelectorAll('.shop-slot');
  if (equippedSlots) {
    let equippedList = Object.keys(game.equipped || {}).filter(id => game.equipped![id]);
    for (let i = 0; i < 3; i++) {
      let slot = equippedSlots[i] as HTMLElement;
      if (i < equippedList.length) {
        let itemId = equippedList[i];
        let itemConf = SHOP_ITEMS.find(item => item.id === itemId);
        if (itemConf) {
          slot.innerHTML = itemConf.iconSvg;
          slot.style.border = "2px solid rgba(255, 255, 255, 0.8)";
          slot.style.background = "rgba(255, 255, 255, 0.2)";
          slot.style.cursor = "pointer";
          slot.setAttribute('data-id', itemId);
          let svg = slot.querySelector('svg');
          if (svg) {
            svg.setAttribute('width', '20');
            svg.setAttribute('height', '20');
          }
        }
      } else {
        slot.innerHTML = '';
        slot.style.border = "2px dashed rgba(255, 255, 255, 0.3)";
        slot.style.background = "transparent";
        slot.style.cursor = "default";
        slot.removeAttribute('data-id');
      }
    }
  }
}

export const AUTOCRUISE_QUOTES_BASIC = [
  '"Already on it."',
  '"I\'ll take care of it."'
];

export const AUTOCRUISE_QUOTES_SMART = [
  '"Right away, Michael."',
  '"I\'m on it, Michael."',
  '"Leave it to me, Michael."'
];

export function onEnterShop() {
  const autoCruiseItem = SHOP_ITEMS.find(i => i.id === 'autocruise');
  if (autoCruiseItem) {
    autoCruiseItem.desc = AUTOCRUISE_QUOTES_BASIC[Math.floor(Math.random() * AUTOCRUISE_QUOTES_BASIC.length)];
  }
  const autoCruise2Item = SHOP_ITEMS.find(i => i.id === 'autocruise2');
  if (autoCruise2Item) {
    autoCruise2Item.desc = AUTOCRUISE_QUOTES_SMART[Math.floor(Math.random() * AUTOCRUISE_QUOTES_SMART.length)];
  }

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
        startAttractCycle();
      }, { passive: false });
    });
  }

  document.querySelectorAll('.shop-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      let id = slot.getAttribute('data-id');
      if (id && game.equipped && game.equipped[id]) {
        game.equipped[id] = false;
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
        updateShopUI();
      }
    });
  });

  document.querySelectorAll('.shop-item').forEach(itemCard => {
    itemCard.addEventListener('click', () => {
      let buyBtn = itemCard.querySelector('.shop-item-buy') as HTMLButtonElement;
      if (!buyBtn) return;
      let id = buyBtn.getAttribute('data-id') || '';

      if (game.inventory[id]) {
        if (!game.equipped) game.equipped = {};
        let isCurrentlyEquipped = !!game.equipped[id];

        if (!isCurrentlyEquipped) {
          // Mutually exclusive: swap AI equipment if the other is equipped
          if (id === 'autocruise' && game.equipped['autocruise2']) {
            game.equipped['autocruise2'] = false;
          } else if (id === 'autocruise2' && game.equipped['autocruise']) {
            game.equipped['autocruise'] = false;
          }
          if (id === 'lithuanian') {
            game.equipped['helmet'] = false;
            game.equipped['skates'] = false;
          } else if (id === 'helmet' || id === 'skates') {
            game.equipped['lithuanian'] = false;
          }

          let numEquipped = Object.values(game.equipped).filter(Boolean).length;
          if (numEquipped >= 3) {
            itemCard.classList.add('shake-effect');
            setTimeout(() => itemCard.classList.remove('shake-effect'), 300);
            return;
          }
          game.equipped[id] = true;
        } else {
          game.equipped[id] = false;
        }

        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
        updateShopUI();
      } else {
        let item = shopState.itemData[id];
        if (!item || game.totalCoins < item.price) return;

        // Complete award unlock - totalCoins is NOT deducted!
        game.inventory[id] = true;
        if (!game.equipped) game.equipped = {};
        
        // Mutually exclusive on unlock auto-equip
        if (id === 'autocruise' && game.equipped['autocruise2']) {
          game.equipped['autocruise2'] = false;
        } else if (id === 'autocruise2' && game.equipped['autocruise']) {
          game.equipped['autocruise'] = false;
        }
        if (id === 'lithuanian') {
          game.equipped['helmet'] = false;
          game.equipped['skates'] = false;
        } else if (id === 'helmet' || id === 'skates') {
          game.equipped['lithuanian'] = false;
        }

        let numEquipped = Object.values(game.equipped).filter(Boolean).length;
        if (numEquipped < 3) {
          game.equipped[id] = true; // Auto equip if slot available
        }

        persistTotalCoins(game.totalCoins);
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

  const resetBtn = $('shopResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      game.equipped = {};
      secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
      updateShopUI();
    });
  }
}
