const fs = require('fs');
let code = fs.readFileSync('src/ranking.js', 'utf8');

code = code.replace(/let top10 = s\.slice\(0, 10\);/, 'let top10 = s.slice(0, 100);');
code = code.replace(/if \(!hl && pRank && pRank\.rank > 10\) \{/, 'if (!hl && pRank && pRank.rank > 100) {');

fs.writeFileSync('src/ranking.js', code);
