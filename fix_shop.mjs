import fs from 'fs';
let code = fs.readFileSync('src/shop.ts', 'utf8');

const targetStr = `    });
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
  }`;

const replacement = `    });
  });

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
}`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/shop.ts', code);
console.log("Fixed");
