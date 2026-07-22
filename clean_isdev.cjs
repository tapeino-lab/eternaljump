const fs = require('fs');

let entitiesTs = fs.readFileSync('src/entities.ts', 'utf-8');
entitiesTs = entitiesTs.replace(/, isDev/g, '');
entitiesTs = entitiesTs.replace(/        if \(isDev && game\.demoMode && this\.blacklisted\) \{\n          ctx\.fillStyle = 'rgba\(255,0,0,0\.5\)';\n          ctx\.fillRect\(this\.x, this\.y - game\.cameraY, this\.w, this\.h\);\n        \}\n/g, '');
fs.writeFileSync('src/entities.ts', entitiesTs);

let gameTs = fs.readFileSync('src/game.ts', 'utf-8');
gameTs = gameTs.replace(/    export const isDev = new URLSearchParams\(window\.location\.search\)\.get\('dev'\) === '1';\n/g, '');
fs.writeFileSync('src/game.ts', gameTs);

let rendererTs = fs.readFileSync('src/renderer.ts', 'utf-8');
rendererTs = rendererTs.replace(/, isDev/g, '');
rendererTs = rendererTs.replace(/  if \(isDev && game\.demoMode && game\.aiActive && game\.player\.aiPath && game\.player\.aiPath\.length > 0\) \{[\s\S]*?  \}\n/g, '');
rendererTs = rendererTs.replace(/  if \(isDev && game\.demoMode && game\.aiActive\) \{[\s\S]*?  \}\n/g, '');
fs.writeFileSync('src/renderer.ts', rendererTs);

let inputTs = fs.readFileSync('src/input.ts', 'utf-8');
inputTs = inputTs.replace(/isDev, /g, '');
fs.writeFileSync('src/input.ts', inputTs);

console.log("isDev cleanup done.");
