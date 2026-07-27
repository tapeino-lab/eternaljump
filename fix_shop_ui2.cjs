const fs = require('fs');
let code = fs.readFileSync('src/shop.ts', 'utf-8');
const searchTS = `        game.player.facingRight = true;
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);`;
const replaceTS = `        game.player.facingRight = true;
        secureStorage.setItem('JUMP_EQUIPPED', game.equipped);
        import('./lifecycle.js').then(m => m.startAttractCycle());`;
code = code.replace(searchTS, replaceTS);
fs.writeFileSync('src/shop.ts', code);
