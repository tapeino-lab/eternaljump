import express from "express";
import path from "path";
import fsSync from "fs";
import crypto from "crypto";
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

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key, x-session-token");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

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
    const { member_id, score, metadata, leaderboard_id } = req.body;
    const session_token = req.body.session_token || (req.headers['x-session-token'] as string);
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
          
          const saltV1 = "E7eRn4L_JumP_Pr0t3ct10n";
          const saltV2 = "E7eRn4L_JumP_Pr0t3ct10n_v2";
          const str1 = alt + "_" + (coins || 0) + "_" + Math.floor(playTime / 1000) + "_" + lang + "_" + saltV1;
          const str2 = Math.floor(alt) + "_" + Math.floor(coins || 0) + "_" + Math.floor(playTime / 1000) + "_" + lang + "_" + saltV2;
          
          let h1 = 0, h2 = 0;
          for (let i = 0; i < str1.length; i++) {
            h1 = ((h1 << 5) - h1) + str1.charCodeAt(i);
            h1 = h1 & h1;
          }
          for (let i = 0; i < str2.length; i++) {
            h2 = ((h2 << 5) - h2) + str2.charCodeAt(i);
            h2 = h2 & h2;
          }

          const validSigs = new Set([
            h1.toString(36),
            Math.abs(h1).toString(36),
            h2.toString(36),
            Math.abs(h2).toString(36)
          ]);
          
          if (!validSigs.has(metaObj.sig)) {
             console.log("Invalid signature detected:", metaObj, "valid options:", Array.from(validSigs));
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
          const taLeaderboardId = process.env.LOOTLOCKER_TA_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID || 'tatk';
          
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

  // Lightweight activity telemetry endpoint (callable from both server and static hosts like GitHub Pages)
  app.post("/api/activity/log", (req, res) => {
    try {
      const { type, pid, name, extra } = req.body || {};
      recordPlayAction(req, type || 'session_start', pid || 'Unknown', name || 'Anonymous', extra);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to record activity' });
    }
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

    const reversedLogs = playLogs.slice(-200).reverse();
    res.json({
      totalLogs: playLogs.length,
      hourlyCounts,
      summaries: Object.values(playerSummaries).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()),
      logs: reversedLogs,
      recentLogs: reversedLogs
    });
  });

  // Single-Page Admin HTML Dashboard
  app.get(["/admin", "/admin/", "/admin.html"], (req, res) => {
    const adminPath = path.join(process.cwd(), "public", "admin.html");
    if (fsSync.existsSync(adminPath)) {
      let content = fsSync.readFileSync(adminPath, "utf-8");
      const currentPass = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '';
      const defaultHash = '05e9824f196ce156b8dc7c618f989a87d58ebf32881de8eda2e5fb9ce123a91d'; // hash of zxcv0987
      const adminHash = currentPass ? crypto.createHash('sha256').update(currentPass.trim()).digest('hex') : defaultHash;

      const apiKey = process.env.VITE_LOOTLOCKER_API_KEY || process.env.LOOTLOCKER_API_KEY || 'dev_a30dce847162445799eac173326a4f9d';
      const domainKey = process.env.VITE_LOOTLOCKER_DOMAIN_KEY || process.env.LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
      const lbId = process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || process.env.LOOTLOCKER_LEADERBOARD_ID || 'hct2';
      const taId = process.env.VITE_LOOTLOCKER_TA_LEADERBOARD_ID || 'tatk';
      const coinId = process.env.VITE_LOOTLOCKER_COIN_LEADERBOARD_ID || 'cointtl';

      content = content
        .replace(/__ADMIN_PASSWORD_HASH__/g, adminHash)
        .replace(/__LL_API_KEY__/g, apiKey)
        .replace(/__LL_DOMAIN__/g, domainKey)
        .replace(/__LL_ALT_ID__/g, lbId)
        .replace(/__LL_TA_ID__/g, taId)
        .replace(/__LL_COIN_ID__/g, coinId);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(content);
    }
    res.status(404).send("admin.html not found");
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
