const fs = require('fs');
let code = fs.readFileSync('src/lifecycle.ts', 'utf-8');
const search = "  if (game.demoMode) {\n    if (isAttractMode) {\n      if (demoState.active) setAuto(true);\n      else setAuto(false);\n    } else {\n      setAuto(true);\n    }\n  } else {\n    game.aiActive = false;\n  }";
const patch = `  if (game.demoMode) {
    if (isAttractMode) {
      if (demoState.active) setAuto(true);
      else setAuto(false);
    } else {
      setAuto(true);
    }
  } else {
    game.aiActive = false;
  }
  const autoCruiseBtn = document.getElementById('autoCruiseBtn');
  if (autoCruiseBtn) {
    if (!game.demoMode && game.equipped && game.equipped['autocruise']) {
      autoCruiseBtn.style.display = 'block';
      autoCruiseBtn.innerHTML = 'AUTO OFF';
      autoCruiseBtn.style.color = '#fff';
      autoCruiseBtn.style.borderColor = '#fff';
    } else {
      autoCruiseBtn.style.display = 'none';
    }
  }`;
code = code.replace(search, patch);
fs.writeFileSync('src/lifecycle.ts', code);
