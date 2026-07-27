const fs = require('fs');
let code = fs.readFileSync('src/renderer/ui.ts', 'utf-8');
code = code.replace(/    \}<\/svg>\`;\n  \}\n    \} else if/g, "    </svg>\`;\n  } else if");
fs.writeFileSync('src/renderer/ui.ts', code);
