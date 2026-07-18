const fs = require('fs');
let content = fs.readFileSync('src/ranking.js', 'utf8');

const target1 = `      prefetchScores: function() {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            return await LootLockerAPI.getScores(100);
          } else {`;
const replace1 = `      prefetchScores: function() {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            let scores = await LootLockerAPI.getScores(100);
            if (scores && scores.length > 0) {
              localStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
            } else {
              try {
                let cached = localStorage.getItem('LL_CACHED_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {}
            }
            
            // Merge pending offline scores
            try {
              let pending = JSON.parse(localStorage.getItem('LL_PENDING_SCORES') || '[]');
              if (pending.length > 0) {
                let pid = LootLockerAPI.playerIdentifier;
                let playerName = getPlayerName();
                pending.forEach(p => {
                  scores.push({ id: pid, alt: p.alt, coins: p.coins, lang: p.lang, n: playerName, t: p.t });
                });
                scores.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.t - B.t);
                
                // Deduplicate by ID to keep only best score per player (if they appear multiple times)
                let uniqueScores = [];
                let seen = new Set();
                scores.forEach(s => {
                  let id = String(s.id);
                  if (!seen.has(id)) {
                    seen.add(id);
                    uniqueScores.push(s);
                  }
                });
                scores = uniqueScores.slice(0, 100);
                scores.forEach((s, i) => s.rank = i + 1);
              }
            } catch(e) {}
            
            return scores;
          } else {`;

content = content.replace(target1, replace1);
fs.writeFileSync('src/ranking.js', content);
console.log('ranking.js updated for offline support');
