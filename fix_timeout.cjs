const fs = require('fs');
let content = fs.readFileSync('src/update.js', 'utf8');
content = content.replace(/}, 400\);/g, '}, 800);');
fs.writeFileSync('src/update.js', content);
console.log('update.js updated');
