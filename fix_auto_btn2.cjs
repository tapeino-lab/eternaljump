const fs = require('fs');
let code = fs.readFileSync('src/lifecycle.ts', 'utf-8');
code = code.replace(/autoCruiseBtn\.style\.color = '#fff';\n\s*autoCruiseBtn\.style\.borderColor = '#fff';\n/g, "");
fs.writeFileSync('src/lifecycle.ts', code);
