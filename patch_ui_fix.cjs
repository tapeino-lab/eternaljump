const fs = require('fs');
let code = fs.readFileSync('src/renderer/ui.ts', 'utf8');

code = code.replace(
  /const oldHeader = header\.cloneNode\(true\);/g,
  "const oldHeader = header.cloneNode(true) as HTMLElement;"
);
code = code.replace(
  /const oldTop3 = top3\.cloneNode\(true\);/g,
  "const oldTop3 = top3.cloneNode(true) as HTMLElement;"
);
code = code.replace(
  /const oldOthersWrapper = othersWrapper\.cloneNode\(true\);/g,
  "const oldOthersWrapper = othersWrapper.cloneNode(true) as HTMLElement;"
);

fs.writeFileSync('src/renderer/ui.ts', code);
