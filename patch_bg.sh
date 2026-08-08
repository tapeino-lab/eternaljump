#!/bin/bash
cat src/renderer/bg.ts | sed -n '1,78p' > tmp_bg.ts
echo 'export function drawBG(ts) {' >> tmp_bg.ts
echo '  let scoreTop = (game.baseScoreY - game.cameraY) * config.scoreMultiplier;' >> tmp_bg.ts
echo '  let scoreBottom = (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier;' >> tmp_bg.ts
echo '  let grad = ctx.createLinearGradient(0, 0, 0, config.gameHeight);' >> tmp_bg.ts
echo '  for (let i = 0; i <= 4; i++) {' >> tmp_bg.ts
echo '    let ratio = i / 4;' >> tmp_bg.ts
echo '    let s = scoreTop - (scoreTop - scoreBottom) * ratio;' >> tmp_bg.ts
echo '    let c = getColorAtScore(s);' >> tmp_bg.ts
echo '    grad.addColorStop(ratio, "rgb(" + Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + ")");' >> tmp_bg.ts
echo '  }' >> tmp_bg.ts
echo '  ctx.fillStyle = grad;' >> tmp_bg.ts
echo '  ctx.fillRect(0, 0, config.gameWidth, config.gameHeight);' >> tmp_bg.ts
cat src/renderer/bg.ts | sed -n '93,$p' >> tmp_bg.ts
mv tmp_bg.ts src/renderer/bg.ts
