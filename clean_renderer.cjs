const fs = require('fs');

let rendererTs = fs.readFileSync('src/renderer.ts', 'utf-8');
rendererTs = rendererTs.replace(/export function drawAIDevPath\(\) \{[\s\S]*?\}\n/g, '');
rendererTs = rendererTs.replace(/  drawAIDevPath\(\);\n/g, '');
fs.writeFileSync('src/renderer.ts', rendererTs);
console.log("Renderer cleaned.");
