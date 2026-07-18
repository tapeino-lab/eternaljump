const fs = require('fs');
let rankingJs = fs.readFileSync('src/ranking.js', 'utf8');

// 1. Change prefetchScores to use a 5-minute cache
const prefetchStart = `      prefetchScores: function() {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            let scores = await LootLockerAPI.getScores(100);
            if (scores && scores.length > 0) {
              localStorage.setItem('LL_CACHED_LEADERBOARD', JSON.stringify(scores));
            } else {`;
const prefetchReplace = `      prefetchScores: function(forceNetwork = false) {
        this.prefetchedScoresPromise = (async () => {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            let scores = null;
            let now = Date.now();
            let lastFetch = parseInt(localStorage.getItem('LL_LAST_FETCH') || '0');
            
            if (!forceNetwork && (now - lastFetch) < 300000) {
              try {
                let cached = localStorage.getItem('LL_CACHED_LEADERBOARD');
                if (cached) scores = JSON.parse(cached);
              } catch(e) {}
            }
            
            if (!scores) {
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
            }`;

rankingJs = rankingJs.replace(prefetchStart, prefetchReplace);

// 2. Do not submitScore if it's not a new record (remove the block that submits on every play)
const alwaysSubmit = `        // オンラインLootLockerにはプレイ毎に毎回送信し、LootLocker側の「Keep Best」仕様に判断を委ねることで、端末間の同期不一致を完全に防ぐ
        const isConfigured = await LootLockerAPI.checkConfig();
        if (isConfigured) {
          await LootLockerAPI.submitScore(game.lastScoreObj.alt, c, l, game.lastScoreObj.time);
        }`;
rankingJs = rankingJs.replace(alwaysSubmit, "");

// 3. Inside the `if (game.isNewRecord)` block, submit score and force network fetch
const newRecordStart = `        if (game.isNewRecord) {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (!isConfigured) {`;
const newRecordReplace = `        if (game.isNewRecord) {
          const isConfigured = await LootLockerAPI.checkConfig();
          if (isConfigured) {
            let res = await LootLockerAPI.submitScore(a, c, l, t);
            if (res) localStorage.setItem('LL_LAST_FETCH', '0'); // Force fetch next time
          }
          if (!isConfigured) {`;
rankingJs = rankingJs.replace(newRecordStart, newRecordReplace);

// 4. Update the call to prefetchScores inside saveScore
rankingJs = rankingJs.replace(`this.prefetchScores();`, `this.prefetchScores(game.isNewRecord);`);

fs.writeFileSync('src/ranking.js', rankingJs);
console.log('ranking.js optimized for bandwidth');
