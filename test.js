const DOMAIN_KEY = process.env.VITE_LOOTLOCKER_DOMAIN_KEY;
const API_KEY = process.env.VITE_LOOTLOCKER_API_KEY;
const LB_TA = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID;

async function run() {
  const authRes = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/v2/session/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_key: API_KEY, player_identifier: "analyzer_ts_" + Date.now(), game_version: "1.0.0.0" })
  });
  const sessionToken = (await authRes.json()).session_token;

  const res = await fetch(`https://${DOMAIN_KEY}.api.lootlocker.io/game/leaderboards/${LB_TA}/list?count=200`, {
    headers: { 'x-session-token': sessionToken }
  });
  const data = await res.json();
  // Find USA JW or JPN WT to check timestamps or other fields
  let items = data.items.filter(i => i.player?.name === 'USA JW' || i.player?.name === 'JPN WT');
  console.log(JSON.stringify(items, null, 2));
}
run();
