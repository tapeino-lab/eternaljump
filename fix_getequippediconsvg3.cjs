const fs = require('fs');
let code = fs.readFileSync('src/renderer/ui.ts', 'utf-8');
code = code.replace(/  \}\n    \} else if \(id === 'autocruise'\) \{/g, "  } else if (id === 'autocruise') {");
fs.writeFileSync('src/renderer/ui.ts', code);
