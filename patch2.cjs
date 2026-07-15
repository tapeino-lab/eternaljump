const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

code = code.replace(
`        if (LootLockerAPI.apiKey !== 'YOUR_API_KEY_HERE') {
          await LootLockerAPI.submitScore(game.lastScoreObj.alt, c, l);
        } else {
          try {
            let s = await this.getScores();
            let ex = s.findIndex(x => x.id === pid);
            if (ex !== -1) {
              let ca = s[ex].alt, cc = s[ex].coins;
              if (a > ca || (a === ca && c > cc)) s[ex] = game.lastScoreObj;
            } else {
              s.push(game.lastScoreObj);
            }
            s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
            game.lastRank = s.findIndex(x => x.id === pid) + 1;
            s = s.slice(0, 100);
            localStorage.setItem(this.key, JSON.stringify(s));
          } catch (e) {}
        }`,
`        if (game.isNewRecord) {
          if (LootLockerAPI.apiKey !== 'YOUR_API_KEY_HERE') {
            await LootLockerAPI.submitScore(game.lastScoreObj.alt, c, l);
          } else {
            try {
              let s = await this.getScores();
              let ex = s.findIndex(x => x.id === pid);
              if (ex !== -1) {
                let ca = s[ex].alt, cc = s[ex].coins;
                if (a > ca || (a === ca && c > cc)) s[ex] = game.lastScoreObj;
              } else {
                s.push(game.lastScoreObj);
              }
              s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
              game.lastRank = s.findIndex(x => x.id === pid) + 1;
              s = s.slice(0, 100);
              localStorage.setItem(this.key, JSON.stringify(s));
            } catch (e) {}
          }
        }`
);

fs.writeFileSync('src/game.js', code);
