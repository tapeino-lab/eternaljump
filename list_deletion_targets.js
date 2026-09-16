const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;
const LB_ALT = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID;
const LB_COIN = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID;

const targetPlayers = [
  "JPN 05", "USA JW", "SWE SD", "LTU RJ", "JPN SH", "LTU EE", "SPA Y9", "USA 27"
];

async function run() {
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "analyzer_del_" + Date.now(), game_version: "1.0.0.0" })
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

  console.log("=== LEADERBOARD ENTRIES FOR TARGET PLAYERS ===");
  
  for (let name of targetPlayers) {
    console.log(`\n--------------------------------------------------`);
    console.log(`PLAYER: ${name}`);
    console.log(`--------------------------------------------------`);

    // Group entries by member_id
    let memberMap = new Map();

    function record(lbName, items) {
      items.filter(i => i.player?.name === name).forEach(item => {
        let mId = item.member_id;
        if (!memberMap.has(mId)) memberMap.set(mId, []);
        let m = {};
        try { m = JSON.parse(item.metadata || '{}'); } catch(e) {}
        memberMap.get(mId).push({
          lb: lbName,
          rank: item.rank,
          score: item.score,
          meta: m
        });
      });
    }

    record("Time Attack", taScores);
    record("Altitude", altScores);
    record("Coins", coinScores);

    for (let [mId, records] of memberMap.entries()) {
      console.log(`  [Member ID: ${mId}]`);
      records.forEach(r => {
        let detail = "";
        if (r.lb === "Time Attack") {
          detail = `Time: ${(1000000000 - r.score) / 1000}s (Raw: ${r.score})`;
        } else if (r.lb === "Altitude") {
          detail = `Altitude: ${r.score}`;
        } else if (r.lb === "Coins") {
          detail = `Coins: ${r.score}`;
        }
        console.log(`    - Leaderboard: ${r.lb.padEnd(12)} | Rank: ${r.rank.toString().padStart(3)} | ${detail} | Metadata Coins: ${r.meta.coins || '-'}`);
      });
    }
  }
}
run();
