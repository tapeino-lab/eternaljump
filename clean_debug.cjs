const fs = require('fs');

// 1. Clean index.html
let html = fs.readFileSync('index.html', 'utf-8');
html = html.replace(/<div id="autoBtn">🤖 ON<\/div>\n/g, '');
html = html.replace(/<div id="settingsBtn"[\s\S]*?<\/svg>\n\s*<\/div>\n/g, '');
fs.writeFileSync('index.html', html);

// 2. Clean src/game.ts
let gameTs = fs.readFileSync('src/game.ts', 'utf-8');
gameTs = gameTs.replace(/export const autoBtn = \$\('autoBtn'\);\n/g, '');
gameTs = gameTs.replace(/      \$\('autoBtn'\)\.innerText = isActive \? '🤖 ON' : '🤖 OFF';\n/g, '');
gameTs = gameTs.replace(/      \$\('autoBtn'\)\.style\.background = isActive \? 'rgba\(0,255,0,0\.5\)' : 'rgba\(255,0,0,0\.5\)';\n/g, '');
gameTs = gameTs.replace(/        autoBtn\.style\.display = 'none';\n/g, '');
gameTs = gameTs.replace(/      const sBtn = \$\('settingsBtn'\);\n/g, '');
gameTs = gameTs.replace(/      if \(sBtn\) sBtn\.style\.display = isAttractMode \? 'none' : 'flex';\n/g, '');

gameTs = gameTs.replace(/updateNPCs\(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode\)/g, 'updateNPCs(game, setIgnoreNextTap, pBtn, isAttractMode)');
gameTs = gameTs.replace(/updatePlayingState\(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode\)/g, 'updatePlayingState(game, setIgnoreNextTap, pBtn, isAttractMode)');
gameTs = gameTs.replace(/postUpdatePhysics\(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode, initGame, spawnPlatform\)/g, 'postUpdatePhysics(game, setIgnoreNextTap, pBtn, isAttractMode, initGame, spawnPlatform)');
fs.writeFileSync('src/game.ts', gameTs);

// 3. Clean src/input.ts
let inputTs = fs.readFileSync('src/input.ts', 'utf-8');
inputTs = inputTs.replace(/  const autoBtn = \$\('autoBtn'\);\n/g, '');
inputTs = inputTs.replace(/    autoBtn\.addEventListener\(ev, function\(e\) \{\n      e\.preventDefault\(\);\n      e\.stopPropagation\(\);\n      setAuto\(!game\.aiActive\);\n    \}, \{ passive: false \}\);\n/g, '');
inputTs = inputTs.replace(/      if \(e\.target\.closest\('#settingsBtn'\)\) return;\n/g, '');
inputTs = inputTs.replace(/    let settingsBtn = \$\('settingsBtn'\);\n    if \(settingsBtn\) \{\n      settingsBtn\.addEventListener\(ev, function\(e\) \{\n        e\.preventDefault\(\);\n        e\.stopPropagation\(\);\n        if \(isAttractMode\) \{\n          togglePause\(\);\n        \}\n      \}, \{ passive: false \}\);\n    \}\n/g, '');
fs.writeFileSync('src/input.ts', inputTs);

// 4. Clean src/update.ts
let updateTs = fs.readFileSync('src/update.ts', 'utf-8');
updateTs = updateTs.replace(/export function updateNPCs\(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode\) /g, 'export function updateNPCs(game, setIgnoreNextTap, pBtn, isAttractMode) ');
updateTs = updateTs.replace(/export function updatePlayingState\(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode\) /g, 'export function updatePlayingState(game, setIgnoreNextTap, pBtn, isAttractMode) ');
updateTs = updateTs.replace(/export function postUpdatePhysics\(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode, initGame, spawnPlatform\) /g, 'export function postUpdatePhysics(game, setIgnoreNextTap, pBtn, isAttractMode, initGame, spawnPlatform) ');
updateTs = updateTs.replace(/                autoBtn\.style\.display = 'none';\n/g, '');
updateTs = updateTs.replace(/            autoBtn\.style\.display = 'none';\n/g, '');
updateTs = updateTs.replace(/          autoBtn\.style\.display = 'none';\n/g, '');
updateTs = updateTs.replace(/      autoBtn\.style\.display = 'none';\n/g, '');

fs.writeFileSync('src/update.ts', updateTs);

console.log("Cleanup done.");
