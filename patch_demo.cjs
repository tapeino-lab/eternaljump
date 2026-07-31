const fs = require('fs');
let code = fs.readFileSync('src/demo-ranking.ts', 'utf8');
code = code.replace(
  "export async function startDemoRankingScroll(isAttractMode: boolean, mode: 'ta' | 'height' = 'height') {",
  "export async function startDemoRankingScroll(isAttractMode: boolean, mode: 'ta' | 'height' = 'height', isTransition: boolean = false) {"
);

code = code.replace(
  "  $('demoRankingContainer').style.display = 'block';\n  $('demoRankingContainer').style.opacity = '1';\n  $('demoRankingContainer').style.transition = 'none';\n  $('demoRankingContainer').style.background = 'rgba(0,0,0,0.3)';\n  $('demoLoading').style.display = 'flex';\n",
  "  if (!isTransition) {\n    $('demoRankingContainer').style.display = 'block';\n    $('demoRankingContainer').style.opacity = '1';\n    $('demoRankingContainer').style.transition = 'none';\n    $('demoRankingContainer').style.background = 'rgba(0,0,0,0.3)';\n    $('demoLoading').style.display = 'flex';\n  }\n"
);

code = code.replace(
  "  if (!isAttractMode) {\n    $('demoLoading').style.display = 'none';\n    return;\n  }\n  $('demoLoading').style.display = 'none';\n",
  "  if (!isAttractMode) {\n    if (!isTransition) $('demoLoading').style.display = 'none';\n    return;\n  }\n  if (!isTransition) $('demoLoading').style.display = 'none';\n"
);
fs.writeFileSync('src/demo-ranking.ts', code);
