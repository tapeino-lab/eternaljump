const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

code = code.replace(
`      if (IMG.title && IMG.title.complete && IMG.title.naturalWidth > 0) {
        ctx.drawImage(IMG.title, FLR((config.gameWidth - IMG.title.naturalWidth) / 2), 95);
      }`,
`      if (IMG.title && IMG.title.complete && IMG.title.naturalWidth > 0) {
        ctx.drawImage(IMG.title, FLR((config.gameWidth - IMG.title.naturalWidth) / 2), 95);
        ctx.save();
        ctx.font = '6px "Press Start 2P", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'right';
        ctx.fillText(RankingAPI.version, config.gameWidth - 5, 205);
        ctx.restore();
      }`
);

fs.writeFileSync('src/game.js', code);
