const fs = require('fs');
let gameJs = fs.readFileSync('src/game.js', 'utf8');
gameJs = gameJs.replace(/\$\('prodControls'\)\.style\.display = 'flex';/g, '');
gameJs = gameJs.replace(/\$\('btnToDev'\)\.style\.display = 'flex';/g, '');
gameJs = gameJs.replace(/\$\('btnToDev'\)\.style\.display = 'none';/g, '');
fs.writeFileSync('src/game.js', gameJs);

let inputJs = fs.readFileSync('src/input.js', 'utf8');
inputJs = inputJs.replace(/if \(e\.target\.closest\('#btnToDev'\)\) \{[\s\S]*?return;\s*\}/, '');
fs.writeFileSync('src/input.js', inputJs);
console.log('Fixed btnToDev references');
