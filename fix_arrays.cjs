const fs = require('fs');

let code = fs.readFileSync('src/update-post.ts', 'utf-8');
code = code.replace(/swapRemove\(game\.platforms, i\);/g, 'game.platforms.splice(i, 1);');
code = code.replace(/swapRemove\(game\.items, i\);/g, 'game.items.splice(i, 1);');
code = code.replace(/swapRemove\(game\.coins, i\);/g, 'game.coins.splice(i, 1);');
code = code.replace(/swapRemove\(game\.clouds, i\);/g, 'game.clouds.splice(i, 1);');
fs.writeFileSync('src/update-post.ts', code);

code = fs.readFileSync('src/update-entities.ts', 'utf-8');
code = code.replace(/swapRemove\(game\.birds, i\);/g, 'game.birds.splice(i, 1);');
code = code.replace(/swapRemove\(game\.meteors, i\);/g, 'game.meteors.splice(i, 1);');
code = code.replace(/swapRemove\(game\.particles, i\);/g, 'game.particles.splice(i, 1);'); // actually this one can be swapRemove, but whatever
code = code.replace(/swapRemove\(game\.flyingCoins, i\);/g, 'game.flyingCoins.splice(i, 1);');
code = code.replace(/swapRemove\(game\.npcs, i\);/g, 'game.npcs.splice(i, 1);');
fs.writeFileSync('src/update-entities.ts', code);
