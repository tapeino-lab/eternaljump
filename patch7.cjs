const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

if (!code.includes("forceSubIcy && t !==")) {
  code = code.replace(
    '      if (genSub) {\\n        let np2 = getPl(y, subT, false, null, null, null, subC, subIcy);',
    \`      if (forceSubIcy && t !== 'super') {
        genSub = true;
        subIcy = true;
      }
      
      if (genSub) {
        let np2 = getPl(y, subT, false, null, null, null, subC, subIcy);\`
  );
  fs.writeFileSync('src/game.js', code);
  console.log('Patched forceSubIcy logic');
} else {
  console.log('Already patched');
}
