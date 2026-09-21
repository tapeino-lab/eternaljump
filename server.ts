import express from "express";
import path from "path";
import fsSync from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
dotenv.config();

// Simple in-memory & JSON file store for play logs and player directory
interface PlayLogEntry {
  id: string;
  time: string; // ISO string
  hour: number; // 0 - 23 JST
  type: 'session_start' | 'score_submit' | 'coin_submit' | 'ta_submit';
  name: string;
  pid: string;
  ip: string;
  country: string;
  region: string;
  city: string;
  device: string;
  alt?: number;
  coins?: number;
  playTimeSec?: number;
}

interface PlayerSummary {
  name: string;
  pid: string;
  lastIp: string;
  lastLocation: string;
  device: string;
  firstSeen: string;
  lastSeen: string;
  playCount: number;
  maxAlt: number;
  maxCoins: number;
  totalPlayTimeSec: number;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const DB_FILE = path.join(process.cwd(), 'players.json');
  const LOGS_FILE = path.join(process.cwd(), 'play_logs.json');
  const MAX_LOGS = 3000; // Cap file size to ~300KB

  let playerMappings = {};
  let langCounters = {};
  const lastCoinSubmissions = new Map<string, { coins: number; time: number }>();
  
  // Storage for play logs and player summaries
  let playLogs: PlayLogEntry[] = [];
  let playerSummaries: Record<string, PlayerSummary> = {};

  try {
    if (fsSync.existsSync(DB_FILE)) {
      const data = JSON.parse(fsSync.readFileSync(DB_FILE, 'utf-8'));
      playerMappings = data.playerMappings || {};
      langCounters = data.langCounters || {};
      playerSummaries = data.playerSummaries || {};
    }
    if (fsSync.existsSync(LOGS_FILE)) {
      playLogs = JSON.parse(fsSync.readFileSync(LOGS_FILE, 'utf-8'));
    }
  } catch(e) {}

  const saveDB = () => {
    try {
      fsSync.writeFileSync(DB_FILE, JSON.stringify({ playerMappings, langCounters, playerSummaries }));
    } catch(e) {}
  };

  const saveLogs = () => {
    try {
      if (playLogs.length > MAX_LOGS) {
        playLogs = playLogs.slice(playLogs.length - MAX_LOGS);
      }
      fsSync.writeFileSync(LOGS_FILE, JSON.stringify(playLogs));
    } catch(e) {}
  };

  // Helper to extract clean client IP
  const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return req.socket.remoteAddress || req.ip || '127.0.0.1';
  };

  // Helper to format simplified device info from User-Agent
  const parseDevice = (ua: string | undefined): string => {
    if (!ua) return 'Unknown';
    let os = 'Other';
    if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';
    else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';

    return `${os} / ${browser}`;
  };

  // Zero-dependency geo resolution using standard CDN/Cloud headers
  const resolveGeoInfo = (req: express.Request, ip: string): { country: string; region: string; city: string } => {
    const countryHeader = req.headers['x-client-geo-country'] || req.headers['cf-ipcountry'] || req.headers['x-appengine-country'];
    const regionHeader = req.headers['x-client-geo-region'] || req.headers['x-appengine-region'];
    const cityHeader = req.headers['x-client-geo-city'] || req.headers['x-appengine-city'];

    if (countryHeader) {
      return {
        country: String(countryHeader).toUpperCase(),
        region: regionHeader ? String(regionHeader) : '-',
        city: cityHeader ? decodeURIComponent(String(cityHeader)) : '-'
      };
    }

    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.')) {
      return { country: 'Local', region: 'Private', city: 'Localhost' };
    }

    return { country: 'Global', region: '-', city: '-' };
  };

  // Helper to record a play action
  const recordPlayAction = (
    req: express.Request,
    type: 'session_start' | 'score_submit' | 'coin_submit' | 'ta_submit',
    pid: string,
    name: string,
    extra?: { alt?: number; coins?: number; playTimeSec?: number }
  ) => {
    try {
      const ip = getClientIp(req);
      const { country, region, city } = resolveGeoInfo(req, ip);
      const device = parseDevice(req.headers['user-agent']);
      
      const now = new Date();
      // Calculate JST hour (UTC+9)
      const jstHour = (now.getUTCHours() + 9) % 24;
      const timeStr = now.toISOString();

      const logId = Math.random().toString(36).substring(2, 9);
      const entry: PlayLogEntry = {
        id: logId,
        time: timeStr,
        hour: jstHour,
        type,
        name: name || 'Anonymous',
        pid: pid || 'Unknown',
        ip,
        country,
        region,
        city,
        device,
        alt: extra?.alt,
        coins: extra?.coins,
        playTimeSec: extra?.playTimeSec
      };

      playLogs.push(entry);
      saveLogs();

      // Update Player Summary
      const playerKey = pid || name;
      if (playerKey && playerKey !== 'Unknown') {
        const existing = playerSummaries[playerKey] || {
          name: name || 'Anonymous',
          pid: pid || 'Unknown',
          lastIp: ip,
          lastLocation: `${country} / ${city !== '-' ? city : region}`,
          device,
          firstSeen: timeStr,
          lastSeen: timeStr,
          playCount: 0,
          maxAlt: 0,
          maxCoins: 0,
          totalPlayTimeSec: 0
        };

        if (name && name !== 'Anonymous') existing.name = name;
        existing.lastIp = ip;
        existing.lastLocation = `${country} / ${city !== '-' ? city : region}`;
        existing.device = device;
        existing.lastSeen = timeStr;
        existing.playCount += 1;
        if (extra?.alt && extra.alt > existing.maxAlt) existing.maxAlt = extra.alt;
        if (extra?.coins && extra.coins > existing.maxCoins) existing.maxCoins = extra.coins;
        if (extra?.playTimeSec) existing.totalPlayTimeSec += extra.playTimeSec;

        playerSummaries[playerKey] = existing;
        saveDB();
      }
    } catch(err) {
      console.warn("Failed to record play action:", err);
    }
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
      
      if (response.ok && data) {
        // Record session start play action
        const pid = String(data.player_id || playerIdentifier || '');
        const playerName = (playerIdentifier && playerMappings[playerIdentifier]) || 'Anonymous';
        recordPlayAction(req, 'session_start', pid || playerIdentifier, playerName);
      }

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

          // Coin Leaderboard specific validation
          const coinLeaderboardId = process.env.LOOTLOCKER_COIN_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID || 'cointtl';
          if (targetLeaderboardId === coinLeaderboardId) {
            const submittedCoins = Number(score || metaObj.coins || 0);
            // Hard ceiling check (500,000 coins max conceivable even with extreme play)
            if (submittedCoins > 500000 || submittedCoins < 0) {
              console.log("Abnormal coin total rejected:", submittedCoins);
              return res.status(400).json({ error: "Coin total exceeds allowable limit" });
            }

            // Incremental rate check against previous submission if member_id is present
            if (member_id) {
              const memIdStr = String(member_id);
              const now = Date.now();
              const prev = lastCoinSubmissions.get(memIdStr);
              if (prev) {
                const coinDelta = submittedCoins - prev.coins;
                const timeDiffSeconds = Math.max(1, (now - prev.time) / 1000);
                // Maximum 1,000 coins per submission, or rate cannot exceed 50 coins/second
                if (coinDelta > 1500 || (coinDelta > 100 && (coinDelta / timeDiffSeconds) > 50)) {
                  console.log(`Suspicious coin surge detected for ${memIdStr}: +${coinDelta} coins in ${timeDiffSeconds.toFixed(1)}s`);
                  return res.status(400).json({ error: "Abnormal coin increment rate detected" });
                }
              }
              lastCoinSubmissions.set(memIdStr, { coins: submittedCoins, time: now });
            }
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
      
      if (response.ok) {
        try {
          const coinLeaderboardId = process.env.LOOTLOCKER_COIN_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID || 'cointtl';
          const taLeaderboardId = process.env.LOOTLOCKER_TA_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID || 'time_attack_leaderboard_id';
          
          let actionType: 'score_submit' | 'coin_submit' | 'ta_submit' = 'score_submit';
          if (targetLeaderboardId === coinLeaderboardId) actionType = 'coin_submit';
          else if (targetLeaderboardId === taLeaderboardId) actionType = 'ta_submit';

          let altVal: number | undefined;
          let coinsVal: number | undefined;
          let playTimeSec: number | undefined;
          let playerName = 'Anonymous';

          if (metadata) {
            const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            altVal = meta.alt;
            coinsVal = meta.coins;
            if (meta.t) playTimeSec = Number(meta.t);
            if (meta.name) playerName = meta.name;
          }

          const pid = member_id ? String(member_id) : 'Unknown';
          recordPlayAction(req, actionType, pid, playerName, {
            alt: altVal,
            coins: coinsVal,
            playTimeSec: playTimeSec
          });
        } catch(logErr) {
          console.warn("Failed recording submit action:", logErr);
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
      
      if (response.ok && name) {
        // If there's an existing summary that matches this player, update the display name
        for (const key of Object.keys(playerSummaries)) {
          if (playerSummaries[key].name === 'Anonymous' || !playerSummaries[key].name) {
            playerSummaries[key].name = name;
          }
        }
        saveDB();
      }

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
  // ADMIN DASHBOARD & ACTIVITY AUDIT ENDPOINTS
  // ==========================================
  // Middleware to verify admin password via Bearer token, query param, or Authorization header
  const verifyAdmin = (req: express.Request): boolean => {
    const adminPass = process.env.ADMIN_PASSWORD || 'admin';
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === adminPass) return true;
      }
      // Check Basic auth
      if (authHeader.startsWith('Basic ')) {
        const creds = Buffer.from(authHeader.substring(6), 'base64').toString('ascii');
        const [, pass] = creds.split(':');
        if (pass === adminPass) return true;
      }
    }
    const queryPass = req.query.pass || req.headers['x-admin-key'];
    if (queryPass && queryPass === adminPass) return true;
    return false;
  };

  // API to fetch play logs and summaries (JSON)
  app.get("/admin/api/data", (req, res) => {
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Calculate hourly play distribution (0-23 JST)
    const hourlyCounts = new Array(24).fill(0);
    playLogs.forEach(log => {
      if (log.hour !== undefined && log.hour >= 0 && log.hour < 24) {
        hourlyCounts[log.hour]++;
      }
    });

    res.json({
      totalLogs: playLogs.length,
      hourlyCounts,
      summaries: Object.values(playerSummaries).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()),
      recentLogs: playLogs.slice(-200).reverse() // Latest 200 items for table display
    });
  });

  // Single-Page Admin HTML Dashboard (Styled cleanly without external dependencies)
  app.get("/admin", (req, res) => {
    const adminHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Play Activity Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .login-box { max-width: 360px; margin: 80px auto; background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155; }
    .login-box input { width: 100%; padding: 10px 12px; margin: 12px 0; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; font-size: 14px; }
    .login-box button { width: 100%; padding: 10px; background: #0284c7; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .login-box button:hover { background: #0369a1; }
    .hidden { display: none !important; }
    
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .stat-label { font-size: 12px; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; }
    .stat-val { font-size: 24px; font-weight: 700; color: #38bdf8; }
    
    .chart-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .chart-title { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 16px; }
    .bar-chart { display: flex; align-items: flex-end; height: 120px; gap: 4px; padding-top: 10px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .bar-fill { width: 100%; background: #38bdf8; border-radius: 2px 2px 0 0; min-height: 2px; transition: height 0.3s; position: relative; }
    .bar-label { font-size: 9px; color: #64748b; margin-top: 6px; }
    .bar-count { font-size: 9px; color: #94a3b8; margin-bottom: 3px; }

    .nav-tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    .tab-btn { background: none; border: none; color: #94a3b8; font-size: 14px; font-weight: 600; padding: 8px 16px; cursor: pointer; border-radius: 4px; }
    .tab-btn.active { background: #334155; color: #38bdf8; }
    
    .table-container { background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    th { background: #0f172a; color: #94a3b8; padding: 12px 14px; font-weight: 600; border-bottom: 1px solid #334155; }
    td { padding: 12px 14px; border-bottom: 1px solid #243248; color: #cbd5e1; }
    tr:hover td { background: #26354a; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge-start { background: #1e3a5f; color: #60a5fa; }
    .badge-score { background: #064e3b; color: #34d399; }
    .badge-coin { background: #713f12; color: #facc15; }
    .badge-ta { background: #581c87; color: #c084fc; }
    .search-input { padding: 8px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff; font-size: 13px; width: 240px; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .btn-refresh { padding: 8px 12px; background: #334155; border: none; border-radius: 6px; color: #f8fafc; cursor: pointer; font-size: 12px; }
    .btn-refresh:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div id="loginView" class="login-box">
      <h2 style="font-size:16px; margin-bottom:4px;">管理者ログイン</h2>
      <p style="font-size:12px; color:#94a3b8; margin-bottom:12px;">パスワードを入力してください</p>
      <input type="password" id="passInput" placeholder="Password" autofocus onkeydown="if(event.key==='Enter')login()">
      <button onclick="login()">ログイン</button>
      <div id="loginErr" style="color:#f87171; font-size:12px; margin-top:8px;" class="hidden">パスワードが違います</div>
    </div>

    <div id="dashView" class="hidden">
      <h1>
        <span>プレイ状況・アクセス時間帯ダッシュボード</span>
        <button class="btn-refresh" onclick="fetchData()">更新</button>
      </h1>
      <div class="subtitle">プレイヤーのアクセス時間帯・プレイ頻度・地域分布の概要</div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">総プレイ記録数</div>
          <div class="stat-val" id="statTotalLogs">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">登録プレイヤー数</div>
          <div class="stat-val" id="statUniquePlayers">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">最高到達高度</div>
          <div class="stat-val" id="statMaxAlt">-</div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title">時間帯別アクセス分布 (JST 日本時間 0時〜23時)</div>
        <div id="barChart" class="bar-chart"></div>
      </div>

      <div class="toolbar">
        <div class="nav-tabs">
          <button id="tabLogs" class="tab-btn active" onclick="switchTab('logs')">最新のプレイ履歴</button>
          <button id="tabPlayers" class="tab-btn" onclick="switchTab('players')">プレイヤー別集約一覧</button>
        </div>
        <input type="text" id="searchInput" class="search-input" placeholder="名前 / IP / 地域で検索..." oninput="renderTables()">
      </div>

      <div id="logsTableView" class="table-container">
        <table>
          <thead>
            <tr>
              <th>日時 (JST)</th>
              <th>アクション</th>
              <th>プレイヤー名</th>
              <th>ID</th>
              <th>地域 (IP)</th>
              <th>端末</th>
              <th>プレイ内容</th>
            </tr>
          </thead>
          <tbody id="logsTableBody"></tbody>
        </table>
      </div>

      <div id="playersTableView" class="table-container hidden">
        <table>
          <thead>
            <tr>
              <th>プレイヤー名</th>
              <th>ID</th>
              <th>最新地域 (IP)</th>
              <th>端末</th>
              <th>初回 / 最終アクセス</th>
              <th>プレイ回数</th>
              <th>最高高度 / コイン</th>
            </tr>
          </thead>
          <tbody id="playersTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let currentData = null;
    let currentTab = 'logs';

    function getSavedPass() {
      return sessionStorage.getItem('ADMIN_KEY') || '';
    }

    async function login() {
      const p = document.getElementById('passInput').value;
      sessionStorage.setItem('ADMIN_KEY', p);
      const ok = await fetchData();
      if (!ok) {
        document.getElementById('loginErr').classList.remove('hidden');
      }
    }

    async function fetchData() {
      const pass = getSavedPass();
      if (!pass) return false;
      try {
        const res = await fetch('/admin/api/data', {
          headers: { 'Authorization': 'Bearer ' + pass }
        });
        if (!res.ok) return false;
        currentData = await res.json();
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('dashView').classList.remove('hidden');
        renderDashboard();
        return true;
      } catch(e) {
        return false;
      }
    }

    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tabLogs').classList.toggle('active', tab === 'logs');
      document.getElementById('tabPlayers').classList.toggle('active', tab === 'players');
      document.getElementById('logsTableView').classList.toggle('hidden', tab !== 'logs');
      document.getElementById('playersTableView').classList.toggle('hidden', tab !== 'players');
      renderTables();
    }

    function renderDashboard() {
      if (!currentData) return;
      document.getElementById('statTotalLogs').innerText = currentData.totalLogs.toLocaleString();
      document.getElementById('statUniquePlayers').innerText = currentData.summaries.length.toLocaleString();
      
      let maxAlt = 0;
      currentData.summaries.forEach(s => { if (s.maxAlt > maxAlt) maxAlt = s.maxAlt; });
      document.getElementById('statMaxAlt').innerText = maxAlt > 0 ? (maxAlt.toLocaleString() + ' m') : '-';

      // Render Bar Chart
      const chartEl = document.getElementById('barChart');
      chartEl.innerHTML = '';
      const counts = currentData.hourlyCounts;
      const maxCount = Math.max(...counts, 1);

      for (let h = 0; h < 24; h++) {
        const col = document.createElement('div');
        col.className = 'bar-col';
        const pct = (counts[h] / maxCount) * 100;
        col.innerHTML = \`
          <div class="bar-count">\${counts[h] > 0 ? counts[h] : ''}</div>
          <div class="bar-fill" style="height: \${Math.max(pct, 2)}%;"></div>
          <div class="bar-label">\${h}h</div>
        \`;
        chartEl.appendChild(col);
      }

      renderTables();
    }

    function formatJST(iso) {
      if (!iso) return '-';
      const d = new Date(iso);
      return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function renderTables() {
      if (!currentData) return;
      const q = (document.getElementById('searchInput').value || '').toLowerCase();

      // Render Logs
      const logBody = document.getElementById('logsTableBody');
      logBody.innerHTML = '';
      const filteredLogs = currentData.recentLogs.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.pid && l.pid.toLowerCase().includes(q)) ||
        (l.ip && l.ip.includes(q)) ||
        (l.country && l.country.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q))
      );

      filteredLogs.forEach(l => {
        let badgeClass = 'badge-start';
        let badgeText = 'セッション開始';
        if (l.type === 'score_submit') { badgeClass = 'badge-score'; badgeText = 'スコア送信'; }
        else if (l.type === 'coin_submit') { badgeClass = 'badge-coin'; badgeText = 'コイン送信'; }
        else if (l.type === 'ta_submit') { badgeClass = 'badge-ta'; badgeText = 'TA送信'; }

        let playDetail = '-';
        if (l.alt !== undefined || l.coins !== undefined) {
          const parts = [];
          if (l.alt !== undefined) parts.push(l.alt.toLocaleString() + 'm');
          if (l.coins !== undefined) parts.push(l.coins + 'コイン');
          if (l.playTimeSec !== undefined) parts.push(Math.floor(l.playTimeSec / 60) + '分' + (l.playTimeSec % 60) + '秒');
          playDetail = parts.join(' / ');
        }

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${formatJST(l.time)}</td>
          <td><span class="badge \${badgeClass}">\${badgeText}</span></td>
          <td style="font-weight:600; color:#fff;">\${escapeHtml(l.name)}</td>
          <td style="font-family:monospace; color:#94a3b8;">\${escapeHtml(l.pid.substring(0, 10))}...</td>
          <td>\${escapeHtml(l.country)} / \${escapeHtml(l.city !== '-' ? l.city : l.region)} <span style="color:#64748b; font-size:10px;">(\${l.ip})</span></td>
          <td>\${escapeHtml(l.device)}</td>
          <td>\${playDetail}</td>
        \`;
        logBody.appendChild(tr);
      });

      // Render Players
      const pBody = document.getElementById('playersTableBody');
      pBody.innerHTML = '';
      const filteredPlayers = currentData.summaries.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.pid && s.pid.toLowerCase().includes(q)) ||
        (s.lastIp && s.lastIp.includes(q)) ||
        (s.lastLocation && s.lastLocation.toLowerCase().includes(q))
      );

      filteredPlayers.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td style="font-weight:600; color:#fff;">\${escapeHtml(s.name)}</td>
          <td style="font-family:monospace; color:#94a3b8;">\${escapeHtml(s.pid.substring(0, 10))}...</td>
          <td>\${escapeHtml(s.lastLocation)} <span style="color:#64748b; font-size:10px;">(\${s.lastIp})</span></td>
          <td>\${escapeHtml(s.device)}</td>
          <td>\${formatJST(s.firstSeen)} <br><span style="color:#94a3b8;">最終: \${formatJST(s.lastSeen)}</span></td>
          <td style="font-weight:600; color:#38bdf8;">\${s.playCount}回</td>
          <td>\${s.maxAlt > 0 ? s.maxAlt.toLocaleString() + 'm' : '-'} / \${s.maxCoins > 0 ? s.maxCoins + '枚' : '-'}</td>
        \`;
        pBody.appendChild(tr);
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    // Auto login if key is present
    if (getSavedPass()) {
      fetchData();
    }
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(adminHtml);
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
