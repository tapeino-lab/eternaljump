const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<div id="prodControls"[\s\S]*?<\/div>\s*<\/div>/, '');
fs.writeFileSync('index.html', html);
console.log('Removed prodControls from index.html');
