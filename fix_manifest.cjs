const fs = require('fs');

// Fix vite.config.ts
let viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
viteConfig = viteConfig.replace("name: 'Lunar Lander'", "name: 'Eternal Jumper'");
viteConfig = viteConfig.replace("short_name: 'LunarLander'", "short_name: 'Eternal Jumper'");
viteConfig = viteConfig.replace("description: 'A 2D space landing game'", "description: 'An endless jumping game'");
fs.writeFileSync('vite.config.ts', viteConfig);

// Fix pwa.js
let pwaJs = fs.readFileSync('src/pwa.js', 'utf8');
if (!pwaJs.includes("beforeinstallprompt")) {
  pwaJs += `
// Prevent the "Install PWA" prompt from appearing
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});
`;
  fs.writeFileSync('src/pwa.js', pwaJs);
}

console.log('Fixed manifest and suppressed install prompt');
