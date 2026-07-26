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
  <rect x="4" y="8" width="8" height="8" fill="#fcc"/>
  <rect x="0" y="0" width="16" height="8" fill="#2c2"/>
  <rect x="2" y="2" width="4" height="4" fill="#fff"/>
  <rect x="10" y="2" width="4" height="4" fill="#fff"/>
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
    id: 'magnet',
    name: 'MAGNET',
    desc: 'Easy coin collect',
    price: 10000,
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
    }
  });
}

export function onEnterShop() {
  shopState.initialEquipped = { ...(game.equipped || {}) };
  updateShopUI();
}

export function initShop() {
  renderShopItemsDOM();

  const shopOk = $('btnShopOk');
  const shopCancel = $('btnShopCancel');

  if (shopOk) {
    shopOk.addEventListener('click', () => {
      game.state = 'intro';
      game.player.x = 44;
      game.player.facingRight = true;
      secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
    });
  }
  if (shopCancel) {
    shopCancel.addEventListener('click', () => {
      game.equipped = { ...shopState.initialEquipped };
      game.state = 'intro';
      game.player.x = 44;
      game.player.facingRight = true;
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

        shopState.pendingItem = id;

        const modal = $('shopConfirmModal');
        const mIcon = $('confirmIcon');
        const mName = $('confirmName');
        const mDesc = $('confirmDesc');
        const mPriceVal = $('confirmPriceVal');

        if (modal && mIcon && mName && mDesc) {
          const iconHtml = itemCard.querySelector('.shop-item-icon')?.innerHTML || '';
          mIcon.innerHTML = iconHtml;
          mName.innerText = item.name;
          mDesc.innerText = item.desc;
          if (mPriceVal) mPriceVal.innerText = item.price.toString();
          modal.style.display = 'flex';
          const ctrl = document.querySelector('.shop-control-area') as HTMLElement;
          if (ctrl) ctrl.style.pointerEvents = 'none';
        }
      }
    });
  });

  const confirmOk = $('confirmOkBtn');
  const confirmCancel = $('confirmCancelBtn');

  if (confirmOk) {
    confirmOk.addEventListener('click', () => {
      let id = shopState.pendingItem;
      if (!id || !shopState.itemData[id]) return;

      const item = shopState.itemData[id];
      if (game.totalCoins < item.price) return;

      // Disable buttons during animation to prevent double-purchases
      confirmOk.style.pointerEvents = 'none';
      if (confirmCancel) confirmCancel.style.pointerEvents = 'none';

      const startCoins = game.totalCoins;
      const price = item.price;
      const targetCoins = startCoins - price;

      // 1. Coin countdown animation in top-left UI
      const duration = 600;
      const startTime = performance.now();

      function animateCoins(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const currentCoins = Math.round(startCoins - (price * progress));
        
        document.querySelectorAll('.shopCoinAmountVal').forEach(el => {
          el.textContent = currentCoins.toString();
        });

        if (progress < 1) {
          requestAnimationFrame(animateCoins);
        }
      }
      requestAnimationFrame(animateCoins);

      // 2. Flying coins animation from top-left coin header to GET button
      const coinHeader = document.querySelector('.shop-coin-header');
      const getBtn = $('confirmOkBtn');

      if (coinHeader && getBtn) {
        const startRect = coinHeader.getBoundingClientRect();
        const endRect = getBtn.getBoundingClientRect();

        const startX = startRect.left + 12;
        const startY = startRect.top + startRect.height / 2;
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;

        const numCoins = 5;
        for (let i = 0; i < numCoins; i++) {
          setTimeout(() => {
            const coinEl = document.createElement('div');
            coinEl.className = 'flying-shop-coin';
            coinEl.innerHTML = `<div class="coin-icon" style="transform: scale(1.4);"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div>`;
            coinEl.style.left = `${startX}px`;
            coinEl.style.top = `${startY}px`;
            document.body.appendChild(coinEl);

            // Force reflow
            void coinEl.offsetWidth;

            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 16;

            coinEl.style.transform = `translate(${endX - startX + offsetX}px, ${endY - startY + offsetY}px) scale(0.8)`;
            coinEl.style.opacity = '0.9';

            setTimeout(() => {
              coinEl.style.opacity = '0';
              setTimeout(() => {
                if (coinEl.parentNode) coinEl.parentNode.removeChild(coinEl);
              }, 200);
            }, 400);
          }, i * 60);
        }
      }

      // 3. Complete purchase & close modal after animation finishes
      setTimeout(() => {
        game.totalCoins = targetCoins;
        game.inventory[id] = true;
        if (!game.equipped) game.equipped = {};
        game.equipped[id] = true; // Immediately equip upon purchase

        secureStorage.setItem('JUMP_TOTAL_COINS', game.totalCoins);
        secureStorage.setItem('JUMP_INVENTORY', game.inventory);
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);

        shopState.pendingItem = null;

        const modal = $('shopConfirmModal');
        if (modal) modal.style.display = 'none';

        const ctrl = document.querySelector('.shop-control-area') as HTMLElement;
        if (ctrl) ctrl.style.pointerEvents = 'auto';

        confirmOk.style.pointerEvents = 'auto';
        if (confirmCancel) confirmCancel.style.pointerEvents = 'auto';

        updateShopUI();

        // 4. Flash shop items container to signify item is acquired & equipped!
        const itemsContainer = document.querySelector('.shop-items-container');
        if (itemsContainer) {
          itemsContainer.classList.remove('shop-flash-effect');
          void (itemsContainer as HTMLElement).offsetWidth;
          itemsContainer.classList.add('shop-flash-effect');
          setTimeout(() => {
            itemsContainer.classList.remove('shop-flash-effect');
          }, 600);
        }
      }, 700);
    });
  }
  if (confirmCancel) {
    confirmCancel.addEventListener('click', () => {
      shopState.pendingItem = null;
      const modal = $('shopConfirmModal');
      if (modal) modal.style.display = 'none';
      const ctrl = document.querySelector('.shop-control-area') as HTMLElement;
      if (ctrl) ctrl.style.pointerEvents = 'auto';
    });
  }
}
