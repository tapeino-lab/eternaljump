const fs = require('fs');
let code = fs.readFileSync('src/input.ts', 'utf8');

code = code.replace(
`    if (game.isPaused) {
      if (!e.target.closest('#pauseBtn') && 
          !e.target.closest('#pauseScreen') && 
          !e.target.closest('#nameEditModal') && 
          !e.target.closest('#rankingModal')) {
        e.stopPropagation();
        togglePause();
      }
      return true;
    }`,
`    if (game.isPaused) {
      if (!e.target.closest('#pauseBtn') && 
          !e.target.closest('#pauseScreen') && 
          !e.target.closest('#nameEditModal') && 
          !e.target.closest('#rankingModal')) {
        e.preventDefault();
        e.stopPropagation();
        togglePause(e);
      }
      return true;
    }`
);

fs.writeFileSync('src/input.ts', code);
