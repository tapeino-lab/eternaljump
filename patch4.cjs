const fs = require('fs');
let code = fs.readFileSync('src/game.js', 'utf8');

code = code.replace(
`        else if (t.id === 'db_rank_reset') RankingAPI.reset();`,
`        else if (t.id === 'db_rank_reset') RankingAPI.reset();
        else if (t.id === 'db_title') { $('debugModal').style.display = 'none'; startAttractCycle(); }`
);

fs.writeFileSync('src/game.js', code);
