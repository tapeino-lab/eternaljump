const fs = require('fs');
let code = fs.readFileSync('src/ranking.js', 'utf8');

// 1. Add syncPersonalBest to RankingAPI
code = code.replace("prefetchScores: function(forceNetwork = false) {", `syncPersonalBestPromise: null,
      syncPersonalBest: function() {
        if (this.syncPersonalBestPromise) return this.syncPersonalBestPromise;
        this.syncPersonalBestPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (!isConfigured) return;
          let onlinePB = await LootLockerAPI.getMemberScore();
          if (onlinePB && typeof onlinePB.alt === 'number') {
            let pbKey = this.pbKey;
            let storedPB = localStorage.getItem(pbKey);
            let localPB = storedPB ? JSON.parse(storedPB) : null;
            if (!localPB || onlinePB.alt > localPB.alt || (onlinePB.alt === localPB.alt && onlinePB.coins > localPB.coins) || (onlinePB.alt === localPB.alt && onlinePB.coins === localPB.coins && onlinePB.time < localPB.time)) {
              localStorage.setItem(pbKey, JSON.stringify(onlinePB));
            } else if (localPB && (localPB.alt > onlinePB.alt || (localPB.alt === onlinePB.alt && localPB.coins > onlinePB.coins) || (localPB.alt === onlinePB.alt && localPB.coins === onlinePB.coins && localPB.time < onlinePB.time))) {
              LootLockerAPI.submitScore(localPB.alt, localPB.coins, getLang(), localPB.time);
            }
          }
        })();
        return this.syncPersonalBestPromise;
      },
      prefetchScores: function(forceNetwork = false) {`);

// 2. Call syncPersonalBest in prefetchScores (or when app starts)
code = code.replace("if (isConfigured) {", "if (isConfigured) {\n            await this.syncPersonalBest();");

fs.writeFileSync('src/ranking.js', code);
