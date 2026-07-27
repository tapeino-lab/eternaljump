const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');
const searchHTML = `<div class="shop-control-area" style="position: relative; width: 100%; height: var(--control-height); display: flex; justify-content: space-around; align-items: center; padding: 0 10%; box-sizing: border-box;">
      <button id="btnShopCancel" class="modal-btn shop-btn-cancel">CANCEL</button>
      <button id="btnShopOk" class="modal-btn shop-btn-ok">OK</button>
    </div>`;

const replaceHTML = `<div id="shopControlArea" class="shop-control-area" style="position: relative; width: 100%; height: var(--control-height); background: repeating-linear-gradient(45deg, #222, #222 10px, #333 10px, #333 20px);">
      <div style="position: absolute; top:0; left:0; width: 50%; height: 100%; border-right: 2px solid #000; display:flex; align-items:center; justify-content:center;">
        <span class="tri" style="transform: scaleX(-1); border-right-color: #555;"></span>
      </div>
      <div style="position: absolute; top:0; left:50%; width: 50%; height: 100%; display:flex; align-items:center; justify-content:center;">
        <span class="tri" style="border-left-color: #555;"></span>
      </div>
      <div id="shopTapToClose" class="tap-to-start-msg" style="display: block; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; pointer-events: none; width: 100%; text-align: center;">TAP TO CLOSE</div>
    </div>`;

html = html.replace(searchHTML, replaceHTML);
fs.writeFileSync('index.html', html);

let code = fs.readFileSync('src/shop.ts', 'utf-8');
const searchTS = `  const shopOk = $('btnShopOk');
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
  }`;
const replaceTS = `  const shopControlArea = $('shopControlArea');
  if (shopControlArea) {
    ['touchstart', 'mousedown'].forEach(ev => {
      shopControlArea.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        game.state = 'intro';
        game.player.x = 44;
        game.player.facingRight = true;
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
      }, { passive: false });
    });
  }`;
code = code.replace(searchTS, replaceTS);
fs.writeFileSync('src/shop.ts', code);
