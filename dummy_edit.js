const fs = require('fs');
const files = ['src/game.ts', 'src/renderer.ts', 'src/update.ts', 'src/entities/player.ts', 'vite.config.ts', 'AGENTS.md', '.github/workflows/deploy.yml'];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, content);
});
