const fs = require('fs');
let rankingJs = fs.readFileSync('src/ranking.js', 'utf8');

rankingJs = rankingJs.replace(/\s+\/\/ Start background prefetch of scores immediately for latest values\s+this\.prefetchScores\(\);/g, "\n        // Start background prefetch of scores immediately for latest values\n        this.prefetchScores(game.isNewRecord);");

fs.writeFileSync('src/ranking.js', rankingJs);
