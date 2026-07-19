const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/      const data = await response\.json\(\);\n      res\.status\(response\.status\)\.json\(data\);\n    \} catch \(error\) \{\n      console\.error\('Server proxy list fail:', error\);\n      res\.status\(500\)\.json\(\{ error: 'Failed to proxy list request' \}\);\n    \}\n  \}\);/, '');

fs.writeFileSync('server.ts', code);
