const fs = require('fs');
let code = fs.readFileSync('src/ranking.js', 'utf8');

const prefetchRe = /prefetchScores: function\(forceNetwork = false\) \{[\s\S]*?if \(!scores\) \{/;
code = code.replace(prefetchRe, `prefetchScores: function(forceNetwork = false) {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            await this.syncPersonalBest();
            let scores = null;
            let now = Date.now();
            let lastFetch = parseInt(localStorage.getItem('LL_LAST_FETCH') || '0');
            
            if (!forceNetwork && (now - lastFetch) < 1000) {
              try {
                let cached = localStorage.getItem('LL_CACHED_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {}
            }
            
            if (!scores) {`);

fs.writeFileSync('src/ranking.js', code);
