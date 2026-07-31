const fs = require('fs');
let code = fs.readFileSync('src/lootlocker.ts', 'utf8');
let newFn = `
  submitTimeAttackScore: async function(t, a, c, l) {
    if (!this.taLeaderboardId) {
      this.log('Time Attack submission skipped (no TA leaderboard ID)', 'info');
      return false;
    }
    c = Math.min(c || 0, 999);
    this.log(\`Attempting to submit TA score: time \${t}ms (Lang: \${l})\`, 'info');
    if (!await this.init()) {
      this.log('TA Score submission aborted (Init Failed)', 'error');
      return false;
    }
    // Convert time to a score where higher is better, e.g. 100,000,000 - Math.floor(t)
    let sc = 1000000000 - Math.floor(t);
    let sig = generateSignature(a, c, t, l);
    let meta = JSON.stringify({ alt: a, coins: c, lang: l, t: Math.floor(t / 1000), sig: sig });
    try {
      let r;
      if (this.isDirectMode) {
        let url = \`https://\${this.domainKey}.api.lootlocker.io/game/leaderboards/\${this.taLeaderboardId}/submit\`;
        r = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ score: sc, metadata: meta })
        });
      } else {
        r = await fetch('/api/lootlocker/leaderboards/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: sc,
            metadata: meta,
            session_token: this.sessionToken,
            leaderboard_id: this.taLeaderboardId
          })
        });
      }
      if (!r.ok) {
        this.log('TA Score submission error', 'error');
        return false;
      }
      this.log('TA Score successfully submitted.', 'success');
      return await r.json();
    } catch (e) {
      this.log(\`TA Score submission failed: \${e.message}\`, 'error');
      return false;
    }
  },
`;
code = code.replace("  getScores: async function(lm = 100) {", newFn + "\n  getScores: async function(lm = 100) {");
fs.writeFileSync('src/lootlocker.ts', code);
