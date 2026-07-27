const fs = require('fs');
let code = fs.readFileSync('src/input.ts', 'utf-8');
const patch = `  private bindUIEvents() {
    const autoCruiseBtn = $('autoCruiseBtn');
    if (autoCruiseBtn) {
      ['touchstart', 'mousedown'].forEach(ev => {
        autoCruiseBtn.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (game.equipped && game.equipped['autocruise']) {
            setAuto(!game.aiActive);
          }
        }, { passive: false });
      });
    }`;
code = code.replace("  private bindUIEvents() {", patch);
fs.writeFileSync('src/input.ts', code);
