import express from "express";
import path from "path";
import fsSync from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import geoip from "geoip-lite";

dotenv.config();

// ISO 3166-2:JP prefecture code mapping
const JP_PREFECTURES: Record<string, string> = {
  "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県",
  "06": "山形県", "07": "福島県", "08": "茨城県", "09": "栃木県", "10": "群馬県",
  "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県", "15": "新潟県",
  "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県",
  "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県",
  "26": "京都府", "27": "大阪府", "28": "兵庫県", "29": "奈良県", "30": "和歌山県",
  "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県",
  "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県",
  "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県", "45": "宮崎県",
  "46": "鹿児島県", "47": "沖縄県"
};

interface AdminRecord {
  id: string;
  timestamp: string;
  timeJst: string;
  playerName: string;
  score: number;
  alt: number;
  coins: number;
  leaderboardId: string;
  leaderboardType: string;
  ip: string;
  country: string;
  regionCode: string;
  prefecture: string;
  city: string;
  timezone: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to get client real IP behind proxies (Cloud Run, reverse proxies)
  function getClientIp(req: express.Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  // Persistent storage for Admin Records
  const ADMIN_RECORDS_FILE = path.join(process.cwd(), 'admin_records.json');
  const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'jump_admin_secret_777';
  let adminRecords: AdminRecord[] = [];

  try {
    if (fsSync.existsSync(ADMIN_RECORDS_FILE)) {
      const raw = fsSync.readFileSync(ADMIN_RECORDS_FILE, 'utf-8');
      adminRecords = JSON.parse(raw) || [];
    }
  } catch (e) {
    console.error("Failed to load admin_records.json:", e);
  }

  const saveAdminRecords = () => {
    try {
      fsSync.writeFileSync(ADMIN_RECORDS_FILE, JSON.stringify(adminRecords.slice(0, 1000), null, 2));
    } catch (e) {
      console.error("Failed to save admin_records.json:", e);
    }
  };

  // Map session token to player name
  const sessionToNameMap = new Map<string, string>();

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });


  const DB_FILE = path.join(process.cwd(), 'players.json');
  let playerMappings = {};
  let langCounters = {};
  try {
    if (fsSync.existsSync(DB_FILE)) {
      const data = JSON.parse(fsSync.readFileSync(DB_FILE, 'utf-8'));
      playerMappings = data.playerMappings || {};
      langCounters = data.langCounters || {};
    }
  } catch(e) {}

  const saveDB = () => {
    try {
      fsSync.writeFileSync(DB_FILE, JSON.stringify({ playerMappings, langCounters }));
    } catch(e) {}
  };

  app.post('/api/assign-name', (req, res) => {
    const { lang, pid } = req.body;
    if (!pid || !lang) return res.json({ name: '???' });
    
    // Use the last 5 digits of LootLocker Player ID (pid) as suffix to generate a unique stateless ID
    const suffix = String(pid).substring(Math.max(0, String(pid).length - 5));
    const name = `${lang}${suffix}`;
    res.json({ name });
  });

  // Proxy routes for LootLocker
  // Proxy routes for fetching a specific member's score from LootLocker Leaderboard
  app.get("/api/lootlocker/leaderboards/member", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const defaultLeaderboardId = process.env.LOOTLOCKER_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2';
    const memberId = req.query.member_id as string;
    const sessionToken = req.query.session_token as string;
    const leaderboardId = (req.query.leaderboard_id as string) || defaultLeaderboardId;

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/leaderboards/${leaderboardId}/member/${memberId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy member fetch fail:', error);
      res.status(500).json({ error: 'Failed to proxy member score request' });
    }
  });

  // Proxy routes for LootLocker Guest Session
  // Proxy routes for LootLocker Guest Session
  app.post("/api/lootlocker/session/guest", async (req, res) => {
    const apiKey = process.env.LOOTLOCKER_API_KEY || process.env.VITE_LOOTLOCKER_API_KEY || 'YOUR_API_KEY_HERE';
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const playerIdentifier = req.body.player_identifier;
    const gameVersion = req.body.game_version || '1.37.11';

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/v2/session/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_key: apiKey,
          player_identifier: playerIdentifier,
          game_version: gameVersion
        })
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy session/guest fail:', error);
      res.status(500).json({ error: 'Failed to proxy session/guest request' });
    }
  });

  // Proxy routes for submitting scores to LootLocker Leaderboard
  app.post("/api/lootlocker/leaderboards/submit", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const defaultLeaderboardId = process.env.LOOTLOCKER_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2';
    const { member_id, score, metadata, session_token, leaderboard_id } = req.body;
    const targetLeaderboardId = leaderboard_id || defaultLeaderboardId;

    // --- Validation Logic ---
    try {
      if (metadata) {
        const metaObj = JSON.parse(metadata);
        if (metaObj.sig) {
          let playTime = 0;
          if (metaObj.t !== undefined) {
             playTime = metaObj.t * 1000;
          }
          let alt = metaObj.alt || 0;
          let coins = metaObj.coins || 0;
          let lang = metaObj.lang || "";
          
          const salt = "E7eRn4L_JumP_Pr0t3ct10n";
          let str = alt + "_" + (coins || 0) + "_" + Math.floor(playTime / 1000) + "_" + lang + "_" + salt;
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
              let char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
          }
          let expectedSig = hash.toString(36);
          
          if (expectedSig !== metaObj.sig) {
             console.log("Invalid signature detected:", metaObj);
             return res.status(400).json({ error: "Invalid score signature" });
          }
          
          // Impossible speed check
          if (metaObj.t && metaObj.t > 0) {
            if (metaObj.alt / metaObj.t > 6000) {
               console.log("Impossible speed detected:", metaObj);
               return res.status(400).json({ error: "Impossible score speed detected" });
            }
          }
          
          // Extreme score check (e.g. alt > 150000 m)
          if (metaObj.alt > 150000) {
             console.log("Extreme score detected:", metaObj);
             return res.status(400).json({ error: "Score too high" });
          }
        }
      }
    } catch (e) {
      console.log("Error parsing metadata for validation", e);
    }
    // --- End Validation ---

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/leaderboards/${targetLeaderboardId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': session_token
        },
        body: JSON.stringify({
          member_id,
          score,
          metadata
        })
      });
      const data = await response.json();

      // Log player location and score if submit was successful
      if (response.ok) {
        try {
          const clientIp = getClientIp(req);
          const geo = geoip.lookup(clientIp);
          const country = geo?.country || (clientIp === '127.0.0.1' || clientIp === '::1' ? 'Local' : '不明');
          const regionCode = geo?.region || '';
          const prefecture = (country === 'JP' && JP_PREFECTURES[regionCode])
            ? JP_PREFECTURES[regionCode]
            : (regionCode || (country === 'Local' ? 'ローカル' : '不明'));
          const city = geo?.city || (country === 'Local' ? 'ローカル' : '不明');
          const timezone = geo?.timezone || '-';

          let altVal = 0;
          let coinsVal = 0;
          let metaName = '';
          if (metadata) {
            try {
              const m = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
              if (m.alt !== undefined) altVal = Number(m.alt);
              if (m.coins !== undefined) coinsVal = Number(m.coins);
              if (m.name) metaName = String(m.name);
            } catch (e) {}
          }

          // Determine leaderboard label
          let lbType = '通常';
          const taId = process.env.LOOTLOCKER_TA_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID || 'tatk';
          const coinId = process.env.LOOTLOCKER_COIN_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID || 'cointtl';
          if (targetLeaderboardId === taId) {
            lbType = 'タイムアタック';
          } else if (targetLeaderboardId === coinId) {
            lbType = 'コイン合計';
          }

          const finalPlayerName =
            metaName ||
            data?.player?.name ||
            (session_token ? sessionToNameMap.get(session_token) : '') ||
            (member_id ? `ID:${member_id}` : '名無しプレイヤー');

          const now = new Date();
          const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });

          const newRecord: AdminRecord = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: now.toISOString(),
            timeJst: jstFormatter.format(now),
            playerName: finalPlayerName,
            score: Number(score) || 0,
            alt: altVal || (lbType === '通常' ? Math.floor(Number(score) / 1000) : altVal),
            coins: coinsVal,
            leaderboardId: targetLeaderboardId,
            leaderboardType: lbType,
            ip: clientIp,
            country,
            regionCode,
            prefecture,
            city,
            timezone
          };

          adminRecords.unshift(newRecord);
          if (adminRecords.length > 1000) {
            adminRecords = adminRecords.slice(0, 1000);
          }
          saveAdminRecords();
        } catch (logErr) {
          console.error("Error logging player record:", logErr);
        }
      }

      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy submit fail:', error);
      res.status(500).json({ error: 'Failed to proxy submit request' });
    }
  });

  // Proxy routes for fetching scores from LootLocker Leaderboard
  app.get("/api/lootlocker/leaderboards/list", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const defaultLeaderboardId = process.env.LOOTLOCKER_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2';
    const count = req.query.count || 2000;
    const after = req.query.after ? `&after=${encodeURIComponent(req.query.after as string)}` : '';
    const sessionToken = req.query.session_token as string;
    const leaderboardId = req.query.leaderboard_id as string || defaultLeaderboardId;

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/leaderboards/${leaderboardId}/list?count=${count}${after}`, {
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
  });


  // Proxy routes for setting LootLocker Player Name
  app.patch("/api/lootlocker/player/name", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const { name, session_token } = req.body;

    if (name && session_token) {
      sessionToNameMap.set(session_token, String(name));
    }

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/player/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': session_token
        },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to proxy player name request' });
    }
  });

  // Endpoint to check if LootLocker setup is fully configured on the server
  app.get("/api/lootlocker/config-check", (req, res) => {
    const apiKey = process.env.LOOTLOCKER_API_KEY || process.env.VITE_LOOTLOCKER_API_KEY;
    const hasKey = !!(apiKey && apiKey !== 'YOUR_API_KEY_HERE' && apiKey.trim() !== '');
    res.json({ hasLootLocker: hasKey });
  });

  // ==========================================
  // ADMIN DASHBOARD & LOCATION MONITOR ROUTES
  // ==========================================

  // API to fetch recorded player location data (Protected by key)
  app.get("/admin/api/records", (req, res) => {
    const key = req.query.key as string;
    if (!key || key !== ADMIN_SECRET_KEY) {
      return res.status(404).json({ error: "Not Found" });
    }
    res.json({
      records: adminRecords,
      total: adminRecords.length,
      serverTime: new Date().toISOString()
    });
  });

  // API to clear recorded player location data (Protected by key)
  app.post("/admin/api/clear", (req, res) => {
    const key = req.query.key as string;
    if (!key || key !== ADMIN_SECRET_KEY) {
      return res.status(404).json({ error: "Not Found" });
    }
    adminRecords = [];
    saveAdminRecords();
    res.json({ success: true, message: "Records cleared" });
  });

  // HTML Dashboard View (Protected by key)
  app.get("/admin/records", (req, res) => {
    const key = req.query.key as string;
    if (!key || key !== ADMIN_SECRET_KEY) {
      return res.status(404).send(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body></html>`);
    }

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FOLLOW ME! - アクセス地域・スコア記録コンソール</title>
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-hover: #0ea5e9;
      --badge-bg: #0f172a;
      --success: #34d399;
      --warn: #fbbf24;
      --danger: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      gap: 16px;
    }
    .title-area h1 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-area p {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .notice-box {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 0.88rem;
      color: #cbd5e1;
      margin-bottom: 24px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .stat-card .label {
      font-size: 0.82rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-card .value {
      font-size: 1.8rem;
      font-weight: 700;
      margin-top: 4px;
      color: #fff;
    }
    .stat-card .sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .controls {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .filter-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    input[type="text"], select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus, select:focus {
      border-color: var(--accent);
    }
    input[type="text"] {
      min-width: 240px;
      flex: 1;
      max-width: 380px;
    }
    .btn-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    button {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    button:hover {
      background: #334155;
      border-color: #475569;
    }
    button.primary {
      background: var(--accent);
      color: #0f172a;
      border-color: var(--accent);
    }
    button.primary:hover {
      background: var(--accent-hover);
    }
    button.danger {
      color: var(--danger);
      border-color: rgba(248, 113, 113, 0.4);
    }
    button.danger:hover {
      background: rgba(248, 113, 113, 0.15);
    }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }
    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    th {
      background: rgba(15, 23, 42, 0.6);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .tag-pref {
      background: rgba(56, 189, 248, 0.15);
      color: #7dd3fc;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .tag-type {
      background: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
    }
    .tag-type.ta {
      background: rgba(251, 191, 36, 0.15);
      color: #fde047;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }
    .tag-type.coin {
      background: rgba(52, 211, 153, 0.15);
      color: #6ee7b7;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .score-highlight {
      font-weight: 700;
      color: #38bdf8;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-area">
        <h1>🎮 FOLLOW ME! 地域・スコア記録 <span class="badge">DEVELOPER CONSOLE</span></h1>
        <p>プレイヤー名・到達スコア・通信元IPによる地域判定ログ（サーバー専用）</p>
      </div>
      <div>
        <span class="badge" style="background: rgba(52, 211, 153, 0.15); color: #34d399; border-color: rgba(52, 211, 153, 0.3);">
          ● サーバー稼働中
        </span>
      </div>
    </header>

    <div class="notice-box">
      <div>ℹ️</div>
      <div>
        <strong>IPアドレス推定に関する仕様:</strong>
        表示されている「都道府県 / 地域」および「市区町村」は、プレイヤーのスコア送信時IPアドレスに基づく地理的推定値です。
        モバイル通信（4G/5G/LTE回線）の場合は通信事業者の集約中継局（東京都や大阪府など）として判定される場合があります。
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">総スコア送信数</div>
        <div class="value" id="stat-total">0</div>
        <div class="sub">最新最大1,000件保持</div>
      </div>
      <div class="stat-card">
        <div class="label">ユニークプレイヤー数</div>
        <div class="value" id="stat-players">0</div>
        <div class="sub">記録内のユニーク名</div>
      </div>
      <div class="stat-card">
        <div class="label">最多アクセス地域</div>
        <div class="value" id="stat-top-region" style="font-size: 1.4rem; padding-top: 4px;">-</div>
        <div class="sub" id="stat-top-region-sub">データ蓄積中</div>
      </div>
      <div class="stat-card">
        <div class="label">最新記録時刻</div>
        <div class="value" id="stat-latest-time" style="font-size: 1.15rem; padding-top: 8px;">-</div>
        <div class="sub" id="stat-latest-sub">待機中</div>
      </div>
    </div>

    <div class="controls">
      <div class="filter-group">
        <input type="text" id="search-input" placeholder="🔍 名前, 都道府県, 市, IPで絞り込み..." oninput="filterRecords()">
        <select id="type-select" onchange="filterRecords()">
          <option value="">種別: すべて</option>
          <option value="通常">通常</option>
          <option value="タイムアタック">タイムアタック</option>
          <option value="コイン合計">コイン合計</option>
        </select>
        <select id="auto-refresh" onchange="setupAutoRefresh()">
          <option value="0">自動更新: OFF</option>
          <option value="10" selected>自動更新: 10秒毎</option>
          <option value="30">自動更新: 30秒毎</option>
          <option value="60">自動更新: 60秒毎</option>
        </select>
      </div>
      <div class="btn-group">
        <button onclick="fetchData()" class="primary">🔄 今すぐ更新</button>
        <button onclick="downloadCSV()">📥 CSVエクスポート</button>
        <button onclick="clearRecords()" class="danger">🗑️ 履歴クリア</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>受信日時 (JST)</th>
            <th>プレイヤー名</th>
            <th>スコア / 高度</th>
            <th>コイン</th>
            <th>都道府県 / エリア</th>
            <th>市区町村</th>
            <th>国</th>
            <th>IPアドレス</th>
            <th>種別</th>
          </tr>
        </thead>
        <tbody id="records-tbody">
          <tr>
            <td colspan="10" class="empty-state">データを読み込み中...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const accessKey = ${JSON.stringify(key)};
    let allRecords = [];
    let refreshTimer = null;

    async function fetchData() {
      try {
        const res = await fetch('/admin/api/records?key=' + encodeURIComponent(accessKey));
        if (!res.ok) throw new Error('Failed to load data');
        const data = await res.json();
        allRecords = data.records || [];
        updateKPIs(allRecords);
        filterRecords();
      } catch (e) {
        console.error('Fetch error:', e);
      }
    }

    function updateKPIs(records) {
      document.getElementById('stat-total').innerText = records.length.toLocaleString();
      
      const uniqueNames = new Set(records.map(r => r.playerName).filter(Boolean));
      document.getElementById('stat-players').innerText = uniqueNames.size.toLocaleString();

      if (records.length > 0) {
        // Find top prefecture/region
        const counts = {};
        for (const r of records) {
          const area = r.prefecture || r.country || '不明';
          counts[area] = (counts[area] || 0) + 1;
        }
        let topArea = '-';
        let maxCount = 0;
        for (const [area, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            topArea = area;
          }
        }
        document.getElementById('stat-top-region').innerText = topArea;
        document.getElementById('stat-top-region-sub').innerText = maxCount + ' 回送信';

        const latest = records[0];
        document.getElementById('stat-latest-time').innerText = latest.timeJst ? latest.timeJst.split(' ')[1] : '-';
        document.getElementById('stat-latest-sub').innerText = (latest.timeJst ? latest.timeJst.split(' ')[0] : '') + ' (' + latest.playerName + ')';
      } else {
        document.getElementById('stat-top-region').innerText = '-';
        document.getElementById('stat-top-region-sub').innerText = 'データなし';
        document.getElementById('stat-latest-time').innerText = '-';
        document.getElementById('stat-latest-sub').innerText = 'データなし';
      }
    }

    function filterRecords() {
      const search = (document.getElementById('search-input').value || '').toLowerCase().trim();
      const typeFilter = document.getElementById('type-select').value;

      const filtered = allRecords.filter(r => {
        if (typeFilter && r.leaderboardType !== typeFilter) return false;
        if (!search) return true;
        return (
          (r.playerName && r.playerName.toLowerCase().includes(search)) ||
          (r.prefecture && r.prefecture.toLowerCase().includes(search)) ||
          (r.city && r.city.toLowerCase().includes(search)) ||
          (r.country && r.country.toLowerCase().includes(search)) ||
          (r.ip && r.ip.toLowerCase().includes(search))
        );
      });

      renderTable(filtered);
    }

    function renderTable(records) {
      const tbody = document.getElementById('records-tbody');
      if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">条件に一致する記録はありません。</td></tr>';
        return;
      }

      let html = '';
      records.forEach((r, idx) => {
        const typeClass = r.leaderboardType === 'タイムアタック' ? 'tag-type ta' : (r.leaderboardType === 'コイン合計' ? 'tag-type coin' : 'tag-type');
        const scoreDisplay = r.leaderboardType === 'コイン合計'
          ? (r.score || 0) + ' 枚'
          : (r.alt || 0) + ' m (' + (r.score || 0) + ' pt)';

        html += '<tr>' +
          '<td style="color:var(--text-muted);">' + (idx + 1) + '</td>' +
          '<td>' + escapeHtml(r.timeJst || '-') + '</td>' +
          '<td style="font-weight:600;">' + escapeHtml(r.playerName || '名無し') + '</td>' +
          '<td class="score-highlight">' + escapeHtml(scoreDisplay) + '</td>' +
          '<td>🪙 ' + (r.coins || 0) + '</td>' +
          '<td><span class="tag tag-pref">' + escapeHtml(r.prefecture || '-') + '</span></td>' +
          '<td>' + escapeHtml(r.city || '-') + '</td>' +
          '<td>' + escapeHtml(r.country || '-') + '</td>' +
          '<td style="font-family:monospace; color:var(--text-muted);">' + escapeHtml(r.ip || '-') + '</td>' +
          '<td><span class="tag ' + typeClass + '">' + escapeHtml(r.leaderboardType || '通常') + '</span></td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function setupAutoRefresh() {
      if (refreshTimer) clearInterval(refreshTimer);
      const intervalSec = parseInt(document.getElementById('auto-refresh').value, 10);
      if (intervalSec > 0) {
        refreshTimer = setInterval(fetchData, intervalSec * 1000);
      }
    }

    async function clearRecords() {
      if (!confirm('蓄積されたスコア・位置情報ログをすべて削除しますか？')) return;
      try {
        const res = await fetch('/admin/api/clear?key=' + encodeURIComponent(accessKey), { method: 'POST' });
        if (res.ok) {
          allRecords = [];
          updateKPIs([]);
          renderTable([]);
        } else {
          alert('削除に失敗しました。');
        }
      } catch (e) {
        alert('削除エラーが発生しました。');
      }
    }

    function downloadCSV() {
      if (!allRecords || allRecords.length === 0) {
        alert('出力対象のレコードがありません。');
        return;
      }
      const headers = ['No', '日時(JST)', 'プレイヤー名', 'スコア', '高度(m)', 'コイン', '都道府県/地域', '市区町村', '国', 'IPアドレス', '種別'];
      const rows = allRecords.map((r, i) => [
        i + 1,
        '"' + (r.timeJst || '').replace(/"/g, '""') + '"',
        '"' + (r.playerName || '').replace(/"/g, '""') + '"',
        r.score || 0,
        r.alt || 0,
        r.coins || 0,
        '"' + (r.prefecture || '').replace(/"/g, '""') + '"',
        '"' + (r.city || '').replace(/"/g, '""') + '"',
        '"' + (r.country || '').replace(/"/g, '""') + '"',
        '"' + (r.ip || '').replace(/"/g, '""') + '"',
        '"' + (r.leaderboardType || '').replace(/"/g, '""') + '"'
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\\r\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      a.download = 'follow_me_player_locations_' + dateStr + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    fetchData();
    setupAutoRefresh();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  // Vite middleware for development or serving compiled client files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use((req, res, next) => {
      if (req.path === '/' || req.path === '/index.html' || req.path === '/sw.js') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
