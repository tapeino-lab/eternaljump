const fs = require('fs');
function updateFile(path, from, to) {
    let content = fs.readFileSync(path, 'utf-8');
    content = content.replace(from, to);
    fs.writeFileSync(path, content);
}
updateFile('src/ranking.js', /v1\.38\.\d+ - \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/g, 'v1.38.3 - 2026/07/17 22:23');
updateFile('src/lootlocker.js', /v1\.38\.\d+/g, 'v1.38.3');
console.log('Versions updated successfully to v1.38.3');
