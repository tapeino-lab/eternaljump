const fs = require('fs');
let code = fs.readFileSync('src/main.ts', 'utf8');
code = "import { syncTAScores } from './sync-ta.js';\n(window as any).syncTAScores = syncTAScores;\n" + code;
fs.writeFileSync('src/main.ts', code);
