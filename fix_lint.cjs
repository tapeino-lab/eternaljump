const fs = require('fs');

// entities.ts
let entities = fs.readFileSync('src/entities.ts', 'utf-8');
entities = entities.replace(/        if \(isDev && game\.demoMode && this\.blacklisted\) \{[\s\S]*?        \}\n/g, '');
fs.writeFileSync('src/entities.ts', entities);

// game.ts
let game = fs.readFileSync('src/game.ts', 'utf-8');
game = game.replace(/      if \(sBtn\) \{\n        sBtn\.style\.display = \(isAttractMode && !demoState\.active && !game\.isPaused\) \? 'block' : 'none';\n      \}\n/g, '');
fs.writeFileSync('src/game.ts', game);
