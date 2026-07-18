const fs = require('fs');

let inputJs = fs.readFileSync('src/input.js', 'utf8');
inputJs = inputJs.replace(/\$\('prodControls'\)\.addEventListener\(ev, e => {[\s\S]*?}\);/, '');
fs.writeFileSync('src/input.js', inputJs);

let gameJs = fs.readFileSync('src/game.js', 'utf8');
gameJs = gameJs.replace(/\$\('prodControls'\)\.style\.display = 'none';/g, '');
gameJs = gameJs.replace(/\$\('prodControls'\)\.style\.display = 'flex';/g, '');
fs.writeFileSync('src/game.js', gameJs);

console.log('Fixed prodControls references');
