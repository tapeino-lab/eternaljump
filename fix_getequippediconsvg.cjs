const fs = require('fs');
let code = fs.readFileSync('src/renderer/ui.ts', 'utf-8');
const search = "return '';\n}";
const replace = `  } else if (id === 'autocruise') {
    return \`<svg viewBox="0 0 16 16" width="12" height="12" shape-rendering="crispEdges">
      <rect x="2" y="3" width="12" height="10" fill="#222" />
      <rect x="3" y="4" width="10" height="8" fill="#4af" />
      <rect x="5" y="6" width="2" height="2" fill="#fff" />
      <rect x="9" y="6" width="2" height="2" fill="#fff" />
      <rect x="6" y="9" width="4" height="1" fill="#fff" />
    </svg>\`;
  }
  return '';
}`;
code = code.replace(search, replace);
fs.writeFileSync('src/renderer/ui.ts', code);
