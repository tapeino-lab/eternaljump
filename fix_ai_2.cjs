const fs = require('fs');
let code = fs.readFileSync('src/ai.ts', 'utf-8');

code = code.replace(
  `    if (entity.vy > 0) {
      if (target.collected !== undefined && py > target.y - 10) needsRecalc = true;
      else if (target.collected === undefined && py > target.y + 20) needsRecalc = true;
    }`,
  `    if (entity.vy > 0 && py > target.y + 20) needsRecalc = true;`
);

code = code.replace(
  `    if (pn.collected !== undefined) score += 2000;`,
  `    if (pn.collected !== undefined) score += 10000;`
);

fs.writeFileSync('src/ai.ts', code);
console.log("Fixed ai.ts again");
