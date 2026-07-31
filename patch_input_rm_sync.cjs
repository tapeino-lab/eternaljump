const fs = require('fs');
let code = fs.readFileSync('src/input.ts', 'utf8');
code = code.replace(
  `} else if (e.target.closest('#btnSyncTA')) {
            e.preventDefault();
            e.stopPropagation();
            (window as any).syncTAScores();
          } else if (e.target.closest('#btnResumePause')) {`,
  `} else if (e.target.closest('#btnResumePause')) {`
);
fs.writeFileSync('src/input.ts', code);
