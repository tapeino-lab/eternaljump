const fs = require('fs');
let rankingJs = fs.readFileSync('src/ranking.js', 'utf8');

const regex = /            if \(\!scores\) \{[\s\S]*?            \} \/\/ Merge pending offline scores/g;

const replacement = `            if (!scores) {
              scores = await LootLockerAPI.getScores(100);
              if (scores && scores.length > 0) {
                localStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
                localStorage.setItem('LL_LAST_FETCH', now.toString());
              } else {
                try {
                  let cached = localStorage.getItem('LL_CACHED_LEADERBOARD');
                  if (cached) scores = JSON.parse(cached);
                } catch(e) {}
              }
            }
            
            // Merge pending offline scores`;

rankingJs = rankingJs.replace(/            if \(\!scores\) \{[\s\S]*?\/\/ Merge pending offline scores/, replacement);

fs.writeFileSync('src/ranking.js', rankingJs);
