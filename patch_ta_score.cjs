const fs = require('fs');
let code = fs.readFileSync('src/lootlocker.ts', 'utf8');

code = code.replace(
  "validItems.push({ id: i.member_id, _originalRank: i.rank, alt: m.alt, coins: m.coins, lang: m.lang, n: playerName, t: m.t * 1000 });",
  "validItems.push({ id: i.member_id, _originalRank: i.rank, alt: m.alt, coins: m.coins, lang: m.lang, n: playerName, t: 1000000000 - i.score });"
);
fs.writeFileSync('src/lootlocker.ts', code);
