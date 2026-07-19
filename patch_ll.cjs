const fs = require('fs');
let code = fs.readFileSync('src/lootlocker.js', 'utf8');

const getScoresRe = /getScores: async function\(lm = 100\) \{[\s\S]*?if \(!d\.items\) \{/;

code = code.replace(getScoresRe, `cachedLeaderboardEtag: null,
  cachedLeaderboardData: null,

  getScores: async function(lm = 100) {
    this.log(\`Attempting to fetch top \${lm} scores...\`, 'info');
    if (!await this.init()) {
      this.log('Score fetch aborted (Init Failed)', 'error');
      return [];
    }
    try {
      let r;
      let headers = {
        'Content-Type': 'application/json'
      };
      if (this.cachedLeaderboardEtag) {
        headers['If-None-Match'] = this.cachedLeaderboardEtag;
      }
      
      if (this.isDirectMode) {
        let url = \`https://\${this.domainKey}.api.lootlocker.io/game/leaderboards/\${this.leaderboardId}/list?count=\${lm}\`;
        this.log(\`Fetching scores directly from: \${url}\`, 'info');
        headers['x-session-token'] = this.sessionToken;
        r = await fetch(url, { headers });
      } else {
        this.log('Fetching scores via server proxy...', 'info');
        r = await fetch(\`/api/lootlocker/leaderboards/list?count=\${lm}&session_token=\${encodeURIComponent(this.sessionToken)}\`, { headers });
      }
      
      if (r.status === 304 && this.cachedLeaderboardData) {
        this.log('304 Not Modified: Using cached scores', 'success');
        return this.cachedLeaderboardData;
      }
      
      this.log(\`Score fetch response status: \${r.status}\`, 'info');
      let d = await r.json();
      if (!r.ok) {
        this.log(\`Score fetch error: \${JSON.stringify(d)}\`, 'error');
        return [];
      }
      
      if (r.headers.get('ETag')) {
        this.cachedLeaderboardEtag = r.headers.get('ETag');
      }
      
      if (!d.items) {`);

fs.writeFileSync('src/lootlocker.js', code);
