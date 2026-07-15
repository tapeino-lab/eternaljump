const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

let target = `      } else if (spS < 55000) {
        if (r < 0.40) t = 'super';
        else if (r < 0.60) t = 'h-slide';
        else if (r < 0.70) t = 'v-slide';
      } else if (spS < 80000) {
        if (r < 0.05) forceSubIcy = true;
        let r2 = RND();
        if (r2 < 0.05) t = 'super';
        else if (r2 < 0.25) t = 'h-slide';
      } else if (spS <= 100000) {`;

let replacement = `      } else if (spS < 55000) {
        if (r < 0.40) t = 'super';
        else if (r < 0.60) t = 'h-slide';
        else if (r < 0.70) t = 'v-slide';
      } else if (spS < 80000) {
        if (spS >= 60000 && r < 0.15) forceSubIcy = true;
        let r2 = RND();
        if (r2 < 0.05) t = 'super';
        else if (r2 < 0.25) t = 'h-slide';
      } else if (spS <= 100000) {`;

code = code.replace(target, replacement);

fs.writeFileSync('src/game.js', code);
