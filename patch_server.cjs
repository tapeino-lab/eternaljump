const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const listRe = /app\.get\("\/api\/lootlocker\/leaderboards\/list", async \(req, res\) => \{[\s\S]*?\}\);/;

code = code.replace(listRe, `app.get("/api/lootlocker/leaderboards/list", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const leaderboardId = process.env.LOOTLOCKER_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2';
    const count = req.query.count || 100;
    const sessionToken = req.query.session_token as string;

    try {
      const response = await fetch(\`https://\${domainKey}.api.lootlocker.io/game/leaderboards/\${leaderboardId}/list?count=\${count}\`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken
        }
      });
      const data = await response.json();
      
      const crypto = await import('crypto');
      const eTag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
      
      if (req.headers['if-none-match'] === eTag) {
        return res.status(304).end();
      }

      res.setHeader('ETag', eTag);
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy list fail:', error);
      res.status(500).json({ error: 'Failed to proxy list request' });
    }
  });`);

fs.writeFileSync('server.ts', code);
