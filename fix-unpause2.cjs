const fs = require('fs');
let code = fs.readFileSync('src/input.js', 'utf-8');

code = code.replace(
  "      if (game.isPaused) {\n        togglePause();\n        return;\n      }",
  "      if (game.isPaused) {\n        e.stopPropagation();\n        togglePause();\n        return;\n      }"
);
code = code.replace(
  "      if (game.isPaused) {\n        togglePause();\n        return;\n      }",
  "      if (game.isPaused) {\n        e.stopPropagation();\n        togglePause();\n        return;\n      }"
);
code = code.replace(
  "    if (game.isPaused && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {\n      togglePause();\n      return;\n    }",
  "    if (game.isPaused && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {\n      e.stopPropagation();\n      togglePause();\n      return;\n    }"
);
code = code.replace(
  "      if (game.isPaused) {\n        if (!e.target.closest('#pauseBtn') && !e.target.closest('#pauseScreen')) togglePause();\n        return;\n      }",
  "      if (game.isPaused) {\n        e.stopPropagation();\n        if (!e.target.closest('#pauseBtn') && !e.target.closest('#pauseScreen')) togglePause();\n        return;\n      }"
);

fs.writeFileSync('src/input.js', code);
