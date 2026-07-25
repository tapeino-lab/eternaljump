const fs = require('fs');

let main = fs.readFileSync('src/update-main.ts', 'utf8');
main = `
import { updateParticles, updateFlyingCoins, updateNPCs, updateBirds, updateMeteors } from "./update-entities.js";
import { updatePlayingState, postUpdatePhysics, updateStateAnimations, updateIntroState } from "./update-states.js";
` + main;
fs.writeFileSync('src/update-main.ts', main);

let srcUpdate = `
export * from './update-entities.js';
export * from './update-states.js';
export * from './update-main.js';
`;
fs.writeFileSync('src/update.ts', srcUpdate);
