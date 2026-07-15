const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

code = code.replace(
`          if (!hl && game.lastScoreId && game.lastRank > 10) {
            h += \`<tr><td colspan="4" style="text-align:center;padding:5px 0;color:#888;">...</td></tr>\`;
            let r = game.lastScoreObj;`,
`          if (!hl && game.lastScoreId && game.lastRank > 10) {
            h += \`<tr><td colspan="4" style="text-align:center;padding:5px 0;color:#888;">...</td></tr>\`;
            let r = pRank || game.lastScoreObj;`
);

fs.writeFileSync('src/game.js', code);
