const fs = require('fs');
let code = fs.readFileSync('src/input.ts', 'utf8');
code = code.replace(
  /} else if \(e.target.id === 'pauseScreen'\) {\n            e.preventDefault\(\);\n            e.stopPropagation\(\);\n            togglePause\(\);\n          }/g,
  `} else if (e.target.id === 'pauseScreen') {\n            e.preventDefault();\n            e.stopPropagation();\n            togglePause(e);\n          }`
);
code = code.replace(
  /} else if \(e.target.closest\('#btnResumePause'\)\) {\n            e.preventDefault\(\);\n            e.stopPropagation\(\);\n            togglePause\(\);\n          }/g,
  `} else if (e.target.closest('#btnResumePause')) {\n            e.preventDefault();\n            e.stopPropagation();\n            togglePause(e);\n          }`
);
fs.writeFileSync('src/input.ts', code);
