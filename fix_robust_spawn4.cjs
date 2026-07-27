const fs = require('fs');

let code = fs.readFileSync('src/entities/platform.ts', 'utf-8');
const search = `            let lp = game.platforms[game.platforms.length - 1];`;
const replace = `            let lp = game.platforms.reduce((min, p) => p.y < min.y ? p : min, game.platforms[0]);`;
code = code.replace(search, replace);
fs.writeFileSync('src/entities/platform.ts', code);
