const fs = require('fs');
const content = fs.readFileSync('src/shop.ts', 'utf8');
const regex = /id:\s*'rod'.*?iconSvg:\s*`(<svg.*?<\/svg>)`/s;
const match = content.match(regex);
if (match) {
  console.log(match[1]);
}
