const fs = require('fs');
let code = fs.readFileSync('src/ranking/ui.ts', 'utf8');
code = code.replace(
  /Array\.from\(document\.querySelectorAll\('\.ranking-th-coin'\)\)\.forEach\(el \=\> el\.style\.opacity \= '0'\)\;/g,
  "Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => (el as HTMLElement).style.opacity = '0');"
);
code = code.replace(
  /Array\.from\(document\.querySelectorAll\('\.ranking-th-coin'\)\)\.forEach\(el \=\> el\.style\.opacity \= '1'\)\;/g,
  "Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => (el as HTMLElement).style.opacity = '1');"
);
fs.writeFileSync('src/ranking/ui.ts', code);
