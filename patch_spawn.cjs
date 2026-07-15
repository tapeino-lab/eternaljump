const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

let target = `      } else if (spS < 80000) {
        icy = r < 0.05;
        let r2 = RND();
        if (!icy && r2 < 0.05) t = 'super';
        else if (!icy && r2 < 0.25) t = 'h-slide';
      } else if (spS < 120000) {
        icy = r < 0.25;
        if (!icy && RND() < 0.15) t = 'h-slide';
      } else if (spS < 135000) {`;

let replacement = `      } else if (spS < 80000) {
        if (r < 0.05) forceSubIcy = true;
        let r2 = RND();
        if (r2 < 0.05) t = 'super';
        else if (r2 < 0.25) t = 'h-slide';
      } else if (spS <= 100000) {
        if (r < 0.25) forceSubIcy = true;
        if (RND() < 0.15) t = 'h-slide';
      } else if (spS < 120000) {
        icy = r < 0.25;
        if (!icy && RND() < 0.15) t = 'h-slide';
      } else if (spS < 135000) {`;

code = code.replace(target, replacement);

target = `      let t = 'normal', r = RND(), c = 1, icy = false;`;
replacement = `      let t = 'normal', r = RND(), c = 1, icy = false, forceSubIcy = false;`;
code = code.replace(target, replacement);

target = `      if (isDarkBeforeFinal) {
        if (RND() < 0.40) {
          genSub = true;
          subIcy = true;
        }
      }`;

replacement = `      if (isDarkBeforeFinal) {
        if (RND() < 0.40) {
          genSub = true;
          subIcy = true;
        }
      }
      
      if (forceSubIcy && t !== 'super') {
        genSub = true;
        subIcy = true;
      }`;

code = code.replace(target, replacement);

fs.writeFileSync('src/game.js', code);
