const fs = require('fs');
let code = fs.readFileSync('src/input.js', 'utf-8');

code = code.replace(
  "    $('pauseScreen').addEventListener(ev, e => {\n      if (e.target.id === 'btnTitlePause') {\n        e.preventDefault();\n        e.stopPropagation();\n        game.isPaused = false;\n        $('pauseScreen').style.display = 'none';\n        setIgnoreNextTap(true);\n        setTimeout(() => setIgnoreNextTap(false), 500);\n        startAttractCycle();\n      }\n    }, { passive: false });",
  "    $('pauseScreen').addEventListener(ev, e => {\n      if (e.target.id === 'btnTitlePause') {\n        e.preventDefault();\n        e.stopPropagation();\n        game.isPaused = false;\n        $('pauseScreen').style.display = 'none';\n        setIgnoreNextTap(true);\n        setTimeout(() => setIgnoreNextTap(false), 500);\n        startAttractCycle();\n      } else {\n        e.preventDefault();\n        e.stopPropagation();\n        togglePause();\n      }\n    }, { passive: false });"
);

fs.writeFileSync('src/input.js', code);
