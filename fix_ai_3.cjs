const fs = require('fs');
let code = fs.readFileSync('src/ai.ts', 'utf-8');

code = code.replace(
  `    let nextMoves = [];
    for (let n of allNodes) {
      if (n !== currentNode && n.y < currentNode.y && n.y >= currentNode.y - 120) {
        nextMoves.push(n);
      }
    }`,
  `    let nextMoves = [];
    let limitY = currentNode.y - 120;
    if (currentNode.collected !== undefined || currentNode.isGlowing || currentNode.type === 'super') {
      limitY = currentNode.y - 350;
    }
    for (let n of allNodes) {
      if (n !== currentNode && n.y < currentNode.y && n.y >= limitY) {
        nextMoves.push(n);
      }
    }`
);

fs.writeFileSync('src/ai.ts', code);
console.log("Fixed ai.ts searchPaths");
