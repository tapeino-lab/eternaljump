const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

code = code.replace(
`        } else if (state === 'gameover') {
          title = '<h1 style="color:#fff;margin:0 0 10px 0;font-size:12px;text-align:center;">TRY AGAIN!</h1>';
        }`,
`        } else if (state === 'gameover') {
          if (game.isNewRecord) {
            title = '<h1 style="color:#f0f;margin:0 0 10px 0;font-size:12px;text-align:center;animation:superBlink 0.3s steps(1) infinite;">★ NEW RECORD! ★</h1>';
          } else {
            title = '<h1 style="color:#fff;margin:0 0 10px 0;font-size:12px;text-align:center;">TRY AGAIN!</h1>';
          }
        }`
);

fs.writeFileSync('src/game.js', code);
