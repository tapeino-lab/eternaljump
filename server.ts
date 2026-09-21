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
  isp?: string;
  geoFormatted?: string;
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
  isp?: string;
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
  const PUB_DB_FILE = path.join(process.cwd(), 'public', 'players.json');
  const PUB_LOGS_FILE = path.join(process.cwd(), 'public', 'play_logs.json');
  const MAX_LOGS = 3000; // Cap file size to ~300KB

  let playerMappings = {};
  let langCounters = {};
  const lastCoinSubmissions = new Map<string, { coins: number; time: number }>();
  
  // Storage for play logs and player summaries
  let playLogs: PlayLogEntry[] = [];
  let playerSummaries: Record<string, PlayerSummary> = {};
  const sessionToPlayerMap = new Map<string, { pid: string; playerIdentifier?: string }>();

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
      const content = JSON.stringify({ playerMappings, langCounters, playerSummaries });
      fsSync.writeFileSync(DB_FILE, content);
      fsSync.writeFileSync(PUB_DB_FILE, content);
    } catch(e) {}
  };

  const saveLogs = () => {
    try {
      if (playLogs.length > MAX_LOGS) {
        playLogs = playLogs.slice(playLogs.length - MAX_LOGS);
      }
      const content = JSON.stringify(playLogs);
      fsSync.writeFileSync(LOGS_FILE, content);
      fsSync.writeFileSync(PUB_LOGS_FILE, content);
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

  // Japanese prefecture mapping for JIS X 0401 and standard romanized names
  const JP_PREFECTURES: Record<string, string> = {
    '1': '北海道', '01': '北海道', 'Hokkaido': '北海道',
    '2': '青森県', '02': '青森県', 'Aomori': '青森県',
    '3': '岩手県', '03': '岩手県', 'Iwate': '岩手県',
    '4': '宮城県', '04': '宮城県', 'Miyagi': '宮城県',
    '5': '秋田県', '05': '秋田県', 'Akita': '秋田県',
    '6': '山形県', '06': '山形県', 'Yamagata': '山形県',
    '7': '福島県', '07': '福島県', 'Fukushima': '福島県',
    '8': '茨城県', '08': '茨城県', 'Ibaraki': '茨城県',
    '9': '栃木県', '09': '栃木県', 'Tochigi': '栃木県',
    '10': '群馬県', 'Gunma': '群馬県',
    '11': '埼玉県', 'Saitama': '埼玉県',
    '12': '千葉県', 'Chiba': '千葉県',
    '13': '東京都', 'Tokyo': '東京都',
    '14': '神奈川県', 'Kanagawa': '神奈川県',
    '15': '新潟県', 'Niigata': '新潟県',
    '16': '富山県', 'Toyama': '富山県',
    '17': '石川県', 'Ishikawa': '石川県',
    '18': '福井県', 'Fukui': '福井県',
    '19': '山梨県', 'Yamanashi': '山梨県',
    '20': '長野県', 'Nagano': '長野県',
    '21': '岐阜県', 'Gifu': '岐阜県',
    '22': '静岡県', 'Shizuoka': '静岡県',
    '23': '愛知県', 'Aichi': '愛知県',
    '24': '三重県', 'Mie': '三重県',
    '25': '滋賀県', 'Shiga': '滋賀県',
    '26': '京都府', 'Kyoto': '京都府',
    '27': '大阪府', 'Osaka': '大阪府',
    '28': '兵庫県', 'Hyogo': '兵庫県',
    '29': '奈良県', 'Nara': '奈良県',
    '30': '和歌山県', 'Wakayama': '和歌山県',
    '31': '鳥取県', 'Tottori': '鳥取県',
    '32': '島根県', 'Shimane': '島根県',
    '33': '岡山県', 'Okayama': '岡山県',
    '34': '広島県', 'Hiroshima': '広島県',
    '35': '山口県', 'Yamaguchi': '山口県',
    '36': '徳島県', 'Tokushima': '徳島県',
    '37': '香川県', 'Kagawa': '香川県',
    '38': '愛媛県', 'Ehime': '愛媛県',
    '39': '高知県', 'Kochi': '高知県',
    '40': '福岡県', 'Fukuoka': '福岡県',
    '41': '佐賀県', 'Saga': '佐賀県',
    '42': '長崎県', 'Nagasaki': '長崎県',
    '43': '熊本県', 'Kumamoto': '熊本県',
    '44': '大分県', 'Oita': '大分県',
    '45': '宮崎県', 'Miyazaki': '宮崎県',
    '46': '鹿児島県', 'Kagoshima': '鹿児島県',
    '47': '沖縄県', 'Okinawa': '沖縄県'
  };

  interface GeoDetails {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    isp?: string;
    formatted: string;
  }

  const geoCache = new Map<string, GeoDetails>();

  // Helper to format clean Japanese-readable geo descriptions purely from IP resolution
  const formatGeoText = (countryCode: string, countryName: string, region: string, city: string): string => {
    if (countryCode === 'LOC' || countryName === 'Local' || countryName === 'Localhost') {
      return '💻 ローカル開発環境 (127.0.0.1)';
    }
    let flag = '🌐';
    if (countryCode === 'JP' || countryName === 'Japan' || countryName === '日本') flag = '🇯🇵';
    else if (countryCode === 'US' || countryName === 'USA' || countryName === 'United States') flag = '🇺🇸';
    else if (countryCode === 'KR' || countryName === 'Korea' || countryName === 'South Korea') flag = '🇰🇷';
    else if (countryCode === 'TW' || countryName === 'Taiwan') flag = '🇹🇼';
    else if (countryCode === 'GB' || countryName === 'United Kingdom') flag = '🇬🇧';
    else if (countryCode === 'RU' || countryName === 'Russia') flag = '🇷🇺';
    else if (countryCode === 'DE' || countryName === 'Germany') flag = '🇩🇪';
    else if (countryCode === 'FR' || countryName === 'France') flag = '🇫🇷';
    else if (countryCode === 'CN' || countryName === 'China') flag = '🇨🇳';
    else if (countryCode === 'CA' || countryName === 'Canada') flag = '🇨🇦';
    else if (countryCode === 'AU' || countryName === 'Australia') flag = '🇦🇺';

    let prefOrRegion = region;
    if ((countryCode === 'JP' || countryName === 'Japan' || countryName === '日本') && JP_PREFECTURES[region]) {
      prefOrRegion = JP_PREFECTURES[region];
    }

    let text = '';
    if (flag === '🇯🇵') {
      text = `${flag} ${prefOrRegion && prefOrRegion !== '-' ? prefOrRegion : '日本'}`;
      if (city && city !== '-' && city !== prefOrRegion) {
        text += ` (${city})`;
      }
    } else {
      text = `${flag} ${countryName || countryCode}`;
      if (prefOrRegion && prefOrRegion !== '-') text += ` ${prefOrRegion}`;
      if (city && city !== '-' && city !== prefOrRegion) text += ` (${city})`;
    }
    return text.trim();
  };

  // Pure IP Geo resolver
  const resolveIpLocation = async (ip: string): Promise<GeoDetails> => {
    if (!ip || ip === 'Unknown') {
      return { country: 'Unknown', countryCode: '??', region: '-', city: '-', formatted: 'IP未取得' };
    }
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.') || ip.startsWith('172.31.')) {
      return { country: 'Local', countryCode: 'LOC', region: 'Local', city: 'Localhost', isp: 'Private', formatted: '💻 ローカル開発環境 (127.0.0.1)' };
    }

    if (geoCache.has(ip)) {
      return geoCache.get(ip)!;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const country = data.country || 'Global';
          const countryCode = data.country_code || '??';
          let region = data.region || '-';
          if (data.region_code && JP_PREFECTURES[data.region_code]) {
            region = JP_PREFECTURES[data.region_code];
          } else if (JP_PREFECTURES[region]) {
            region = JP_PREFECTURES[region];
          }
          const city = data.city || '-';
          const isp = data.connection?.isp || data.connection?.org;
          const formatted = formatGeoText(countryCode, country, region, city);
          const geo: GeoDetails = { country, countryCode, region, city, isp, formatted };
          geoCache.set(ip, geo);
          return geo;
        }
      }
    } catch(e) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            const country = data.country || 'Global';
            const countryCode = data.countryCode || '??';
            let region = data.regionName || '-';
            if (data.region && JP_PREFECTURES[data.region]) {
              region = JP_PREFECTURES[data.region];
            } else if (JP_PREFECTURES[region]) {
              region = JP_PREFECTURES[region];
            }
            const city = data.city || '-';
            const isp = data.isp;
            const formatted = formatGeoText(countryCode, country, region, city);
            const geo: GeoDetails = { country, countryCode, region, city, isp, formatted };
            geoCache.set(ip, geo);
            return geo;
          }
        }
      } catch(e2) {}
    }

    const fallback: GeoDetails = { country: 'Global', countryCode: 'GL', region: '-', city: '-', formatted: '🌐 接続地域未特定' };
    geoCache.set(ip, fallback);
    return fallback;
  };

  // Zero-dependency geo resolution using standard CDN/Cloud headers + Geo cache
  const resolveGeoInfo = (req: express.Request, ip: string): { country: string; region: string; city: string } => {
    const countryHeader = req.headers['x-client-geo-country'] || req.headers['cf-ipcountry'] || req.headers['x-appengine-country'];
    const regionHeader = req.headers['x-client-geo-region'] || req.headers['x-appengine-region'];
    const cityHeader = req.headers['x-client-geo-city'] || req.headers['x-appengine-city'];

    if (countryHeader) {
      const cCode = String(countryHeader).toUpperCase();
      let reg = regionHeader ? String(regionHeader) : '-';
      if (cCode === 'JP' && JP_PREFECTURES[reg]) reg = JP_PREFECTURES[reg];
      return {
        country: cCode,
        region: reg,
        city: cityHeader ? decodeURIComponent(String(cityHeader)) : '-'
      };
    }

    if (geoCache.has(ip)) {
      const g = geoCache.get(ip)!;
      return { country: g.countryCode, region: g.region, city: g.city };
    }

    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.')) {
      return { country: 'Local', region: 'Local', city: 'Localhost' };
    }

    return { country: 'Global', region: '-', city: '-' };
  };

  // Helper to record a play action
  const recordPlayAction = (
    req: express.Request,
    type: 'session_start' | 'score_submit' | 'coin_submit' | 'ta_submit',
    pid: string,
    name: string,
    extra?: { alt?: number; coins?: number; playTimeSec?: number; dev?: string; loc?: string; ip?: string; isp?: string }
  ) => {
    try {
      const ip = extra?.ip || getClientIp(req);
      let { country, region, city } = resolveGeoInfo(req, ip);
      let device = extra?.dev || parseDevice(req.headers['user-agent']);
      let isp = extra?.isp;

      if (extra?.loc && extra.loc.includes('(') && (country === 'Global' || country === '-')) {
        region = extra.loc;
      }
      
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
        isp,
        geoFormatted: formatGeoText(country, country, region, city),
        device,
        alt: extra?.alt,
        coins: extra?.coins,
        playTimeSec: extra?.playTimeSec
      };

      playLogs.push(entry);
      saveLogs();

      // Trigger asynchronous background GeoIP resolution if not already cached
      if (ip && ip !== 'Unknown' && !geoCache.has(ip) && ip !== '127.0.0.1' && ip !== '::1') {
        resolveIpLocation(ip).then(resolved => {
          entry.country = resolved.countryCode;
          entry.region = resolved.region;
          entry.city = resolved.city;
          entry.isp = resolved.isp;
          entry.geoFormatted = resolved.formatted;
          saveLogs();

          const playerKey = pid || name;
          if (playerKey && playerSummaries[playerKey]) {
            playerSummaries[playerKey].lastLocation = resolved.formatted;
            playerSummaries[playerKey].isp = resolved.isp;
            saveDB();
          }
        }).catch(() => {});
      }

      // Update Player Summary
      const playerKey = pid || name;
      if (playerKey && playerKey !== 'Unknown') {
        const cachedGeo = geoCache.get(ip);
        const locDesc = cachedGeo ? cachedGeo.formatted : formatGeoText(country, country, region, city);
        const existing = playerSummaries[playerKey] || {
          name: name || 'Anonymous',
          pid: pid || 'Unknown',
          lastIp: ip,
          lastLocation: locDesc,
          isp: cachedGeo?.isp || isp,
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
        existing.lastLocation = locDesc;
        if (cachedGeo?.isp || isp) existing.isp = cachedGeo?.isp || isp;
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
        if (data.session_token) {
          sessionToPlayerMap.set(data.session_token, { pid, playerIdentifier });
        }
        const playerName = (playerIdentifier && playerMappings[playerIdentifier]) || (pid && playerSummaries[pid]?.name) || 'Anonymous';
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

          if (metadata) {
            try {
              const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
              if (meta.alt !== undefined) altVal = Number(meta.alt);
              if (meta.coins !== undefined) coinsVal = Number(meta.coins);
              if (meta.t !== undefined) playTimeSec = Number(meta.t);
            } catch (e) {}
          }

          if (targetLeaderboardId === coinLeaderboardId) {
            coinsVal = Number(score);
          } else if (targetLeaderboardId === taLeaderboardId) {
            altVal = 144000;
            const numScore = Number(score);
            if (numScore > 500000000) {
              playTimeSec = Math.floor((1000000000 - numScore) / 1000);
            }
          }

          const sessionInfo = session_token ? sessionToPlayerMap.get(session_token) : undefined;
          const pid = member_id ? String(member_id) : (sessionInfo?.pid || 'Unknown');

          let playerName = (pid && playerSummaries[pid]?.name) ||
            (sessionInfo?.playerIdentifier && playerMappings[sessionInfo.playerIdentifier]) ||
            'Anonymous';
          if (metadata) {
            try {
              const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
              if (meta.name && (playerName === 'Anonymous' || !playerName)) {
                playerName = meta.name;
              }
            } catch (e) {}
          }

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
        const sessionInfo = session_token ? sessionToPlayerMap.get(session_token) : undefined;
        const pid = sessionInfo?.pid;
        if (sessionInfo?.playerIdentifier) {
          playerMappings[sessionInfo.playerIdentifier] = name;
        }
        if (pid) {
          if (playerSummaries[pid]) {
            playerSummaries[pid].name = name;
          } else {
            const ip = getClientIp(req);
            const cachedGeo = geoCache.get(ip);
            const dev = parseDevice(req.headers['user-agent']);
            playerSummaries[pid] = {
              name,
              pid,
              lastIp: ip,
              lastLocation: cachedGeo ? cachedGeo.formatted : 'IP未取得',
              isp: cachedGeo?.isp,
              device: dev,
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              playCount: 1,
              maxAlt: 0,
              maxCoins: 0,
              totalPlayTimeSec: 0
            };
          }
          playLogs.forEach(entry => {
            if (entry.pid === pid && (entry.name === 'Anonymous' || !entry.name)) {
              entry.name = name;
            }
          });
          saveLogs();
          saveDB();
        } else {
          // If no mapped pid, update any recent anonymous summary
          for (const key of Object.keys(playerSummaries)) {
            if (playerSummaries[key].name === 'Anonymous' || !playerSummaries[key].name) {
              playerSummaries[key].name = name;
            }
          }
          saveDB();
        }
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

  // Endpoint to resolve GeoIP details from IP address (callable by client and admin)
  app.get("/api/geoip", async (req, res) => {
    const targetIp = (req.query.ip as string) || getClientIp(req);
    const geo = await resolveIpLocation(targetIp);
    res.json({
      ip: targetIp,
      ...geo
    });
  });

  // API to fetch play logs and summaries (JSON)
  app.get("/admin/api/data", async (req, res) => {
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Resolve any pending unique IP addresses (batch resolve up to 15 unique IPs)
    const pendingIps = new Set<string>();
    playLogs.forEach(l => {
      if (l.ip && l.ip !== 'Unknown' && l.ip !== '127.0.0.1' && l.ip !== '::1' && (!geoCache.has(l.ip) || l.country === 'Global' || l.region === '-')) {
        pendingIps.add(l.ip);
      }
    });
    Object.values(playerSummaries).forEach(s => {
      if (s.lastIp && s.lastIp !== 'Unknown' && s.lastIp !== '127.0.0.1' && s.lastIp !== '::1' && !geoCache.has(s.lastIp)) {
        pendingIps.add(s.lastIp);
      }
    });

    if (pendingIps.size > 0) {
      const ipsToResolve = Array.from(pendingIps).slice(0, 15);
      await Promise.all(ipsToResolve.map(ip => resolveIpLocation(ip)));

      let updated = false;
      playLogs.forEach(l => {
        const g = geoCache.get(l.ip);
        if (g && g.countryCode !== 'GL') {
          l.country = g.countryCode;
          l.region = g.region;
          l.city = g.city;
          l.isp = g.isp;
          l.geoFormatted = g.formatted;
          updated = true;
        }
      });
      Object.values(playerSummaries).forEach(s => {
        const g = geoCache.get(s.lastIp);
        if (g && g.countryCode !== 'GL') {
          s.lastLocation = g.formatted;
          s.isp = g.isp;
          updated = true;
        }
      });
      if (updated) {
        saveLogs();
        saveDB();
      }
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
