const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;
const LB_ALT = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID;
const LB_COIN = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID;

const targets = ["JPN WT", "USA JW", "USA XK", "USA WZ", "LTU RJ"];

async function run() {
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "analyzer_b_" + Date.now(), game_version: "1.0.0.0" })
  });
  const sessionToken = (await authRes.json()).session_token;

  async function fetchLB(lbId) {
    const res = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/leaderboards/${lbId}/list?count=200`, {
      headers: { 'x-session-token': sessionToken }
    });
    return (await res.json()).items || [];
  }

  const taScores = await fetchLB(LB_TA);
  const altScores = await fetchLB(LB_ALT);
  const coinScores = await fetchLB(LB_COIN);

  function analyzeTarget(name) {
    console.log(`\n============================`);
    console.log(`Analyzing: ${name}`);
    console.log(`============================`);
    
    // Find all member IDs associated with this name across all boards
    let memberIds = new Set();
    const allRecords = [...taScores, ...altScores, ...coinScores];
    
    allRecords.forEach(i => {
        if (i.player?.name === name) memberIds.add(i.member_id);
    });

    for (let mId of memberIds) {
        console.log(`\n--- Member ID: ${mId} ---`);
        
        let ta = taScores.find(i => i.member_id === mId);
        let alt = altScores.find(i => i.member_id === mId);
        let coin = coinScores.find(i => i.member_id === mId);
        
        if (ta) {
            let m = JSON.parse(ta.metadata || '{}');
            console.log(`  [Time Attack] Time: ${m.t}ms | Alt: ${m.alt} | Coins: ${m.coins}`);
        }
        if (alt) {
            let m = JSON.parse(alt.metadata || '{}');
            console.log(`  [Altitude]    Alt: ${m.alt} | Coins: ${m.coins}`);
        }
        if (coin) {
            let m = JSON.parse(coin.metadata || '{}');
            console.log(`  [Coins]       Coins: ${m.coins}`);
        }
    }
  }

  targets.forEach(analyzeTarget);
}
run();
