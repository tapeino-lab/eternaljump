const fs = require('fs');
let content = fs.readFileSync('src/game.js', 'utf8');

// Add import
if (!content.includes("from './pwa.js'")) {
  content = content.replace("import { inputHandler, setupInputListeners } from './input.js';", "import { inputHandler, setupInputListeners } from './input.js';\nimport { checkUpdateAndReload } from './pwa.js';");
}

// Add to loop
let loopStart = "    function loop(ts) {";
let loopStartReplace = "    function loop(ts) {\n      checkUpdateAndReload(game.state, demoState.active);";
content = content.replace(loopStart, loopStartReplace);

fs.writeFileSync('src/game.js', content);
console.log('game.js fixed');
