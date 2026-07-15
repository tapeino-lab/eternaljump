const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

let target1 = `          if (game.isNewRecord) {
            title = '<h1 style="color:#f0f;margin:0 0 10px 0;font-size:12px;text-align:center;animation:superBlink 0.3s steps(1) infinite;">★ NEW RECORD! ★</h1>';
          } else {`;
let rep1 = `          if (game.isNewRecord) {
            title = '<h1 style="color:#f0f;margin:0 0 10px 0;font-size:12px;text-align:center;animation:superBlink 0.3s steps(1) infinite;">NEW RECORD!</h1>';
          } else {`;

code = code.replace(target1, rep1);

let target2 = `        if (game.lastScoreObj) {
          let pbHTML = (game.isNewRecord && state === 'clear') ? '<div style="color:#f0f;font-size:10px;margin-bottom:6px;animation:superBlink 0.3s steps(1) infinite;">★ NEW RECORD! ★</div>' : '';`;
let rep2 = `        if (game.lastScoreObj) {
          let pbHTML = (game.isNewRecord && state === 'clear') ? '<div style="color:#f0f;font-size:10px;margin-bottom:6px;animation:superBlink 0.3s steps(1) infinite;">NEW RECORD!</div>' : '';`;

code = code.replace(target2, rep2);

let target3 = `      } else if (spS < 80000) {
        if (spS >= 60000 && r < 0.15) forceSubIcy = true;
        let r2 = RND();`;
let rep3 = `      } else if (spS < 80000) {
        if (spS >= 60000 && r < 0.20) forceSubIcy = true;
        let r2 = RND();`;

code = code.replace(target3, rep3);

fs.writeFileSync('src/game.js', code);
