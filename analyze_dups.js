const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;
const LB_ALT = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID;
const LB_COIN = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID;

async function run() {
  // 1. Auth
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "analyzer_" + Date.now(), game_version: "1.0.0.0" })
  });
  const authData = await authRes.json();
  const sessionToken = authData.session_token;

  async function fetchLB(lbId) {
    const res = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/leaderboards/${lbId}/list?count=200`, {
      headers: { 'x-session-token': sessionToken }
    });
    const data = await res.json();
    return data.items || [];
  }

  const taScores = await fetchLB(LB_TA);
  const altScores = await fetchLB(LB_ALT);
  const coinScores = await fetchLB(LB_COIN);

  function analyze(lbName, items) {
    console.log(`\n=== Analyzing ${lbName} ===`);
    let names = new Map();
    items.forEach(i => {
        let playerName = i.player?.name || '???';
        let meta = null;
        try { meta = JSON.parse(i.metadata); } catch(e) {}
        
        let coins = meta?.coins || 0;
        let t = meta?.t || 0;
        let alt = meta?.alt || 0;
        
        if (!names.has(playerName)) names.set(playerName, []);
        names.get(playerName).push({ score: i.score, coins, t, alt, raw: meta });
    });
    
    for (let [name, records] of names.entries()) {
        if (records.length > 1) {
            console.log(`Potential duplication for name: ${name}`);
            records.forEach(r => console.log(`  - Coins: ${r.coins}, Score/Time: ${r.score}`));
        }
    }
  }

  analyze('Time Attack', taScores);
  analyze('Altitude', altScores);
  analyze('Coins', coinScores);
}
run();
