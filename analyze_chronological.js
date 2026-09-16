const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;
const LB_ALT = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID;
const LB_COIN = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID;

const targets = ["RUS JW","JPN 05","JPN WT","LTU TT","SWE SD","BRA HS","JPN KA","USA XK","USA JW","LTU RJ","ENG MK","JPN SH","LTU EE","USA WZ","SPA Y9","USA 27"];

async function run() {
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "analyzer_chrono_" + Date.now(), game_version: "1.0.0.0" })
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
  const allRecords = [...taScores, ...altScores, ...coinScores];

  console.log("=== Chronological Coin Progression Analysis ===");

  targets.forEach(name => {
    let memberData = new Map(); // member_id -> max_coins
    
    allRecords.forEach(i => {
        if (i.player?.name === name) {
            let mId = parseInt(i.member_id, 10);
            if (!memberData.has(mId)) {
                memberData.set(mId, 0);
            }
            
            let m = JSON.parse(i.metadata || '{}');
            if (m.coins && m.coins > memberData.get(mId)) {
                memberData.set(mId, m.coins);
            }
        }
    });

    if (memberData.size > 1) {
        // Sort by Member ID (which increments over time)
        let sortedMembers = Array.from(memberData.entries()).sort((a, b) => a[0] - b[0]);
        
        console.log(`\nPlayer: ${name}`);
        let isValid = true;
        let previousCoins = -1;
        
        sortedMembers.forEach(([mId, coins], index) => {
            let symbol = "";
            if (index > 0) {
                if (coins >= previousCoins) {
                    symbol = "✅ (Increased/Maintained)";
                } else {
                    symbol = "❌ (Decreased - Fails Condition)";
                    isValid = false;
                }
            }
            console.log(`  ID: ${mId} | Max Coins: ${coins} ${symbol}`);
            previousCoins = coins;
        });
        
        console.log(`  Result: ${isValid ? "PASS - Consistent with ID Reset Theory" : "FAIL - Likely Different Players"}`);
    }
  });
}
run();
