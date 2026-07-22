const fs = require('fs');

let gameTs = fs.readFileSync('src/game.ts', 'utf-8');
gameTs = gameTs.replace(/    if \(isDev\) \{\n      \$\('devControls'\)\.style\.display = 'flex';\n      \n    \} else \{\n      startAttractCycle\(\);\n    \}/g, '    startAttractCycle();');
fs.writeFileSync('src/game.ts', gameTs);

console.log("devControls cleanup done.");
