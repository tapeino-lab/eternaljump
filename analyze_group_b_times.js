const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;
const LB_ALT = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID;
const LB_COIN = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID;

const targets = ["JPN WT", "USA JW", "USA XK", "USA WZ", "LTU RJ", "JPN KA", "JPN SH", "ENG MK"];

async function run() {
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "analyzer_bt_" + Date.now(), game_version: "1.0.0.0" })
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
    
    // Aggregate by Member ID to track activity
    let memberData = new Map();
    const allRecords = [...taScores, ...altScores, ...coinScores];
    
    allRecords.forEach(i => {
        if (i.player?.name === name) {
            let mId = i.member_id;
            if (!memberData.has(mId)) {
                memberData.set(mId, { coins: 0, highestAlt: 0, lastUpdate: null });
            }
            
            let m = JSON.parse(i.metadata || '{}');
            let data = memberData.get(mId);
            
            // Try to figure out progression logic. Larger coin counts generally mean more playtime.
            if (m.coins && m.coins > data.coins) data.coins = m.coins;
            if (m.alt && m.alt > data.highestAlt) data.highestAlt = m.alt;
        }
    });

    for (let [mId, data] of memberData.entries()) {
        console.log(`--- Member ID: ${mId} ---`);
        console.log(`  Max Coins Recorded: ${data.coins}`);
        console.log(`  Highest Alt Recorded: ${data.highestAlt}`);
    }
  }

  targets.forEach(analyzeTarget);
}
run();
