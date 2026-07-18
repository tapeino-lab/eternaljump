const fs = require('fs');

// Fix index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace('<h1 style="margin-bottom:15px; text-shadow: 2px 2px 0 #000;">PAUSED</h1>', '<h2 style="margin-bottom:15px; font-size:16px;">PAUSED</h2>');
fs.writeFileSync('index.html', indexHtml);

// Fix src/ranking.js
let rankingJs = fs.readFileSync('src/ranking.js', 'utf8');
rankingJs = rankingJs.replace('h += \'<h2 style="color:#ff0;margin:0 0 8px 0;font-size:12px;">RESULT</h2>\';', '');
fs.writeFileSync('src/ranking.js', rankingJs);

console.log('UI elements fixed');
