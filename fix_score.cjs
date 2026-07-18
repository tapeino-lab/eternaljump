const fs = require('fs');
let updateJs = fs.readFileSync('src/update.js', 'utf8');

updateJs = updateJs.replace(/let fA = MAX\(game\.startScore, FLR\(\(game\.baseScoreY - game\.highestPlayerY\) \* config\.scoreMultiplier\)\);/g, 'let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));');
updateJs = updateJs.replace(/game\.score = MAX\(game\.startScore, FLR\(\(game\.baseScoreY - game\.highestPlayerY\) \* config\.scoreMultiplier\)\);/g, 'game.score = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));');

fs.writeFileSync('src/update.js', updateJs);
console.log('Score fixed');
