const fs = require('fs');
let code = fs.readFileSync('src/lifecycle.ts', 'utf8');

const replacement = `
  } else {
    $('tapToStartMsg').style.display = isAttractMode ? 'block' : 'none';
    if (isAttractMode) {
        $('tapToStartMsg').innerText = 'TAP TO START';
        resetAttractTimer();
    }
    setIgnoreNextTap(true);
    setTimeout(() => setIgnoreNextTap(false), 50);
  }
`;
code = code.replace(
  /  \} else \{\n    \$\('tapToStartMsg'\)\.style\.display = isAttractMode \? 'block' : 'none';\n    if \(isAttractMode\) \{\n        \$\('tapToStartMsg'\)\.innerText = 'TAP TO START';\n        resetAttractTimer\(\);\n    \}\n  \}/g,
  replacement.trim()
);
fs.writeFileSync('src/lifecycle.ts', code);
