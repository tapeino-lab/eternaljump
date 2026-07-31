const fs = require('fs');
let code = fs.readFileSync('src/ranking/core.ts', 'utf8');

const prefetchTAScores = `
      export const prefetchTAScores = function(forceNetwork = false) {
        RankingAPI.prefetchedTAScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            let scores = null;
            let now = Date.now();
            let lastFetch = parseInt(safeStorage.getItem('LL_LAST_TA_FETCH') || '0');
            
            // Cache for 60 seconds during play, or 10 minutes in demo mode
            let cacheDuration = (game && game.state === 'demo') ? 600000 : 60000;
            if (!forceNetwork && (now - lastFetch) < cacheDuration) {
              try {
                let cached = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {
                safeStorage.removeItem('LL_CACHED_TA_LEADERBOARD');
              }
            }
            
            if (!scores) {
              scores = await LootLockerAPI.getTimeAttackScores(100);
              if (scores && scores.length > 0) {
                safeStorage.setItem('LL_CACHED_TA_LEADERBOARD', JSON.stringify(scores));
                safeStorage.setItem('LL_LAST_TA_FETCH', now.toString());
              } else {
                try {
                  let cached = safeStorage.getItem('LL_CACHED_TA_LEADERBOARD');
                  if (cached) scores = JSON.parse(cached);
                } catch(e) {
                  safeStorage.removeItem('LL_CACHED_TA_LEADERBOARD');
                }
              }
            }
            
            return scores;
          }
          return [];
        })();
      }
`;

code = code.replace("export const getTimeAttackScores = async function(bypassCache = false) {", prefetchTAScores + "\n      export const getTimeAttackScores = async function(bypassCache = false) {\n        if (bypassCache || !RankingAPI.prefetchedTAScoresPromise) {\n          RankingAPI.prefetchTAScores(bypassCache);\n        }\n        const s = await RankingAPI.prefetchedTAScoresPromise;\n        RankingAPI.prefetchedTAScoresPromise = null;\n        return s;\n      }\n/* REPLACE_ME */");

code = code.replace("/* REPLACE_ME */", "");

// Actually we need to remove the old getTimeAttackScores body.
code = fs.readFileSync('src/ranking/core.ts', 'utf8');

code = code.replace(/export const getTimeAttackScores = async function\(bypassCache = false\) \{[\s\S]*?return s;\n      \}/, prefetchTAScores + `
      export const getTimeAttackScores = async function(bypassCache = false) {
        if (bypassCache || !RankingAPI.prefetchedTAScoresPromise) {
          RankingAPI.prefetchTAScores(bypassCache);
        }
        const s = await RankingAPI.prefetchedTAScoresPromise;
        RankingAPI.prefetchedTAScoresPromise = null;
        return s;
      }`);

fs.writeFileSync('src/ranking/core.ts', code);
