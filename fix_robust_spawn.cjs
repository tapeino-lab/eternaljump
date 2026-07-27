const fs = require('fs');

let code = fs.readFileSync('src/spawner.ts', 'utf-8');
const search = `  let lP = game.platforms[game.platforms.length - 1];`;
const replace = `  let lP = game.platforms[0];
  for (let i = 1; i < game.platforms.length; i++) {
    if (game.platforms[i].y < lP.y) {
      lP = game.platforms[i];
    }
  }`;
code = code.replace(search, replace);
fs.writeFileSync('src/spawner.ts', code);
