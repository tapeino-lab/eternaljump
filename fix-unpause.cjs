const fs = require('fs');
let code = fs.readFileSync('src/input.js', 'utf-8');

// For ctrlArea
code = code.replace(
  "    ctrlArea.addEventListener(ev, e => {\n      e.preventDefault();\n      if (isAttractMode) {",
  "    ctrlArea.addEventListener(ev, e => {\n      e.preventDefault();\n      if (game.isPaused) {\n        togglePause();\n        return;\n      }\n      if (isAttractMode) {"
);

// For tOv
code = code.replace(
  "    tOv.addEventListener(ev, e => {\n      e.preventDefault();\n      if (isAttractMode) {",
  "    tOv.addEventListener(ev, e => {\n      e.preventDefault();\n      if (game.isPaused) {\n        togglePause();\n        return;\n      }\n      if (isAttractMode) {"
);

// For document
code = code.replace(
  "    document.addEventListener(ev, e => {\n      if (RankingAPI.isShowingResult) {",
  "    document.addEventListener(ev, e => {\n      if (game.isPaused) {\n        if (!e.target.closest('#pauseBtn') && !e.target.closest('#pauseScreen')) togglePause();\n        return;\n      }\n      if (RankingAPI.isShowingResult) {"
);

// For keyboard
code = code.replace(
  "    if (e.code === 'KeyP') togglePause(e);\n    if (game.demoMode && game.aiActive) return;",
  "    if (e.code === 'KeyP') togglePause(e);\n    if (game.isPaused && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {\n      togglePause();\n      return;\n    }\n    if (game.demoMode && game.aiActive) return;"
);

fs.writeFileSync('src/input.js', code);
