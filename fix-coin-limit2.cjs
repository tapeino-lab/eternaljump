const fs = require('fs');
let code = fs.readFileSync('src/lootlocker.js', 'utf-8');

code = code.replace(
  'submitScore: async function(a, c, l, t) {',
  'submitScore: async function(a, c, l, t) {\n    c = Math.min(c || 0, 999);'
);

code = code.replace(
  'let sc = a * 1000 + Math.min(c || 0, 999);',
  'let sc = a * 1000 + c;'
);

code = code.replace(
  'let meta = JSON.stringify({ alt: a, coins: Math.min(c || 0, 999), lang: l, t: Math.floor(t / 1000), sig: sig });',
  'let meta = JSON.stringify({ alt: a, coins: c, lang: l, t: Math.floor(t / 1000), sig: sig });'
);

fs.writeFileSync('src/lootlocker.js', code);
