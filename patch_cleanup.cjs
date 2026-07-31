const fs = require('fs');
let code = fs.readFileSync('src/demo-ranking.ts', 'utf8');

const replacement = `
export async function startDemoRankingScroll(isAttractMode: boolean, mode: 'ta' | 'height' = 'height', isTransition: boolean = false) {
  if (!isTransition) {
      const oldHeader = document.getElementById('demoHeaderOld');
      if (oldHeader) oldHeader.remove();
      const oldTop3 = document.getElementById('demoTop3Old');
      if (oldTop3) oldTop3.remove();
      const oldOthers = document.getElementById('demoOthersWrapperOld');
      if (oldOthers) oldOthers.remove();
  }
`;

code = code.replace(/export async function startDemoRankingScroll\([^)]+\) \{/, replacement.trim());
fs.writeFileSync('src/demo-ranking.ts', code);
