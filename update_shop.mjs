import fs from 'fs';
let code = fs.readFileSync('src/shop.ts', 'utf8');

const targetStr = `      let id = buyBtn.getAttribute('data-id') || '';
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

      // Disable buttons to prevent double-purchases
      confirmOk.style.pointerEvents = 'none';
      if (confirmCancel) confirmCancel.style.pointerEvents = 'none';

      // Complete award unlock - totalCoins is NOT deducted!
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

      // Flash shop items container to signify item is acquired & equipped!
      const itemsContainer = document.querySelector('.shop-items-container');
      if (itemsContainer) {
        itemsContainer.classList.remove('shop-flash-effect');
        void (itemsContainer as HTMLElement).offsetWidth;
        itemsContainer.classList.add('shop-flash-effect');
        setTimeout(() => {
          itemsContainer.classList.remove('shop-flash-effect');
        }, 600);
      }
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
}`;

const replacement = `      let id = buyBtn.getAttribute('data-id') || '';
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

        // Flash shop items container to signify item is acquired & equipped!
        const itemsContainer = document.querySelector('.shop-items-container');
        if (itemsContainer) {
          itemsContainer.classList.remove('shop-flash-effect');
          void (itemsContainer as HTMLElement).offsetWidth;
          itemsContainer.classList.add('shop-flash-effect');
          setTimeout(() => {
            itemsContainer.classList.remove('shop-flash-effect');
          }, 600);
        }
      }
    });
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/shop.ts', code);
  console.log("Success");
} else {
  console.log("Failed to find target string");
}
