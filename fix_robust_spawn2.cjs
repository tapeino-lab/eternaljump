const fs = require('fs');

let code = fs.readFileSync('src/spawner.ts', 'utf-8');
const search = `export function spawnPlatform() {
  let lP = game.platforms[0];
  for (let i = 1; i < game.platforms.length; i++) {
    if (game.platforms[i].y < lP.y) {
      lP = game.platforms[i];
    }
  }`;

const replace = `export function getHighestPlatform() {
  if (game.platforms.length === 0) return null;
  let lP = game.platforms[0];
  for (let i = 1; i < game.platforms.length; i++) {
    if (game.platforms[i].y < lP.y) {
      lP = game.platforms[i];
    }
  }
  return lP;
}

export function spawnPlatform() {
  let lP = getHighestPlatform();`;
code = code.replace(search, replace);
fs.writeFileSync('src/spawner.ts', code);
