const fs = require('fs');
const content = fs.readFileSync('src/update.ts', 'utf8');
const lines = content.split('\n');
const entitiesFns = ['updateBirds', 'updateMeteors', 'updateParticles', 'updateFlyingCoins', 'updateNPCs'];
const stateFns = ['updatePlayingState', 'postUpdatePhysics', 'updateStateAnimations', 'updateIntroState'];

let entitiesLines = [];
let statesLines = [];
let mainLines = [];

let currentType = 'header';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let isNewFn = false;
  
  if (line.startsWith('export function updateBirds') || 
      line.startsWith('export function updateMeteors') || 
      line.startsWith('export function updateParticles') || 
      line.startsWith('export function updateFlyingCoins') || 
      line.startsWith('export function updateNPCs')) {
    currentType = 'entities';
  } else if (line.startsWith('export function updatePlayingState') || 
             line.startsWith('export function postUpdatePhysics') || 
             line.match(/export function updateStateAnimations/)) {
    currentType = 'states';
  } else if (line.match(/export function updateIntroState/)) {
    currentType = 'states';
  } else if (line.match(/export function updatePhysicsMain/)) {
    currentType = 'main';
  }

  if (currentType === 'header') {
    entitiesLines.push(line);
    statesLines.push(line);
    mainLines.push(line);
  } else if (currentType === 'entities') {
    entitiesLines.push(line);
  } else if (currentType === 'states') {
    statesLines.push(line);
  } else if (currentType === 'main') {
    mainLines.push(line);
  }
}

fs.writeFileSync('src/update-entities.ts', entitiesLines.join('\n'));
fs.writeFileSync('src/update-states.ts', statesLines.join('\n'));
fs.writeFileSync('src/update-main.ts', mainLines.join('\n'));
