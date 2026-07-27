const fs = require('fs');

let code = fs.readFileSync('src/update-post.ts', 'utf-8');
const search = `  while (game.platforms.length > 0 && game.platforms[game.platforms.length - 1].type !== 'goal' && game.platforms[game.platforms.length - 1].y > game.cameraY - config.gameHeight) {
    spawnPlatform();
  }`;
const replace = `  let hp = null;
  while (game.platforms.length > 0 && (hp = game.platforms.reduce((min, p) => p.y < min.y ? p : min, game.platforms[0])) && hp.type !== 'goal' && hp.y > game.cameraY - config.gameHeight) {
    spawnPlatform();
  }`;
code = code.replace(search, replace);
fs.writeFileSync('src/update-post.ts', code);
