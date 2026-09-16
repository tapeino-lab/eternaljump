const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;
const LB_ALT = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID;
const LB_COIN = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID;

async function run() {
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "inspect_rus_jw_" + Date.now(), game_version: "1.0.0.0" })
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

  console.log("=== ALL RECORDS FOR 'RUS JW' ===");

  function check(lbName, items) {
    console.log(`\n--- ${lbName} ---`);
    let matches = items.filter(i => i.player?.name === 'RUS JW');
    if (matches.length === 0) {
      console.log("  (No entries found)");
    } else {
      matches.forEach(m => {
        let meta = {};
        try { meta = JSON.parse(m.metadata || '{}'); } catch(e) {}
        console.log(`  Member ID: ${m.member_id} | Rank: ${m.rank} | Score: ${m.score} | Metadata:`, JSON.stringify(meta));
      });
    }
  }

  check("Time Attack", taScores);
  check("Altitude", altScores);
  check("Coins", coinScores);
}
run();
