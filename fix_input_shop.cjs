const fs = require('fs');
let code = fs.readFileSync('src/input.ts', 'utf-8');
const search = `        if (t.id === 'btnShopCancel' || t.id === 'btnShopOk') {
          startAttractCycle();
        }`;
code = code.replace(search, "");
fs.writeFileSync('src/input.ts', code);
