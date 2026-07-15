const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

let target = `      } else if (spS <= 100000) {
        if (r < 0.25) forceSubIcy = true;
        if (RND() < 0.15) t = 'h-slide';
      } else if (spS < 120000) {
        icy = r < 0.25;
        if (!icy && RND() < 0.15) t = 'h-slide';
      } else if (spS < 135000) {`;

let replacement = `      } else if (spS <= 100000) {
        if (r < 0.25) forceSubIcy = true;
        if (RND() < 0.15) t = 'h-slide';
      } else if (spS <= 105000) {
        icy = r < 0.25;
        if (!icy && RND() < 0.15) t = 'h-slide';
      } else if (spS < 120000) {
        icy = r < 0.15;
        if (!icy && RND() < 0.15) t = 'h-slide';
      } else if (spS < 135000) {`;

code = code.replace(target, replacement);

fs.writeFileSync('src/game.js', code);
