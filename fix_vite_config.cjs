const fs = require('fs');
let config = fs.readFileSync('vite.config.ts', 'utf8');
config = config.replace(/registerType: 'autoUpdate',/g, "registerType: 'prompt',");
fs.writeFileSync('vite.config.ts', config);
console.log('Fixed vite config');
