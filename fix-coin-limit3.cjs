const fs = require('fs');
let code = fs.readFileSync('src/update.js', 'utf-8');
code = code.replace(
  'game.scoreCoin++;',
  'if (game.scoreCoin < 999) game.scoreCoin++;'
);
fs.writeFileSync('src/update.js', code);
