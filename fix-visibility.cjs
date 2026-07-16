const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf-8');
code = code.replace(
  "document.addEventListener('visibilitychange', () => {\n      if (document.visibilityState === 'visible') {\n        drawGroundCache();\n        resetBGScore();\n      }\n    });",
  "document.addEventListener('visibilitychange', () => {\n      if (document.visibilityState === 'visible') {\n        drawGroundCache();\n        resetBGScore();\n      } else {\n        if (game.state === 'playing' && !game.isPaused && !game.demoMode) {\n          togglePause();\n        }\n      }\n    });"
);
fs.writeFileSync('src/game.js', code);
