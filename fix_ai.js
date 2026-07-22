const fs = require('fs');
let code = fs.readFileSync('src/ai.ts', 'utf-8');

code = code.replace(
  `    let target = entity.aiPath[0];
    if (target.broken || target.y > py + config.gameHeight + 100 || target.blacklisted) needsRecalc = true;
    if (entity.vy > 0 && py > target.y + 20) needsRecalc = true;
    if (entity.vy < 0 && py < target.y - 100) needsRecalc = true;
  }`,
  `    let target = entity.aiPath[0];
    if (target.broken || target.y > py + config.gameHeight + 100 || target.blacklisted) needsRecalc = true;
    if (entity.vy > 0) {
      if (target.collected !== undefined && py > target.y - 10) needsRecalc = true;
      else if (py > target.y + 20) needsRecalc = true;
    }
    if (entity.vy < 0 && py < target.y - 100) needsRecalc = true;
  }`
);

code = code.replace(
  `    for (let n of validNodes) {
      let isSup = (n.type === 'super' || n.isGlowing || n.collected !== undefined);
      let minReqY = isSup ? peakY - 30 : peakY + 14;
      if (n.y >= minReqY && n.y <= py + 300) firstMoves.push(n);
    }`,
  `    for (let n of validNodes) {
      let isItem = (n.collected !== undefined);
      let isSup = (n.type === 'super' || n.isGlowing);
      let minReqY = isItem ? peakY - 10 : (isSup ? peakY - 30 : peakY + 14);
      if (n.y >= minReqY && n.y <= py + 300) firstMoves.push(n);
    }`
);

fs.writeFileSync('src/ai.ts', code);
console.log("Fixed ai.ts");
