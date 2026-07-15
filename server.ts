import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy session/guest fail:', error);
      res.status(500).json({ error: 'Failed to proxy session/guest request' });
    }
  });

  // Proxy routes for submitting scores to LootLocker Leaderboard
  app.post("/api/lootlocker/leaderboards/submit", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const leaderboardId = process.env.LOOTLOCKER_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2';
    const { member_id, score, metadata, session_token } = req.body;

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/leaderboards/${leaderboardId}/submit`, {
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
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy submit fail:', error);
      res.status(500).json({ error: 'Failed to proxy submit request' });
    }
  });

  // Proxy routes for fetching scores from LootLocker Leaderboard
  app.get("/api/lootlocker/leaderboards/list", async (req, res) => {
    const domainKey = process.env.LOOTLOCKER_DOMAIN_KEY || process.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok';
    const leaderboardId = process.env.LOOTLOCKER_LEADERBOARD_ID || process.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2';
    const count = req.query.count || 100;
    const sessionToken = req.query.session_token as string;

    try {
      const response = await fetch(`https://${domainKey}.api.lootlocker.io/game/leaderboards/${leaderboardId}/list?count=${count}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Server proxy list fail:', error);
      res.status(500).json({ error: 'Failed to proxy list request' });
    }
  });

  // Endpoint to check if LootLocker setup is fully configured on the server
  app.get("/api/lootlocker/config-check", (req, res) => {
    const apiKey = process.env.LOOTLOCKER_API_KEY || process.env.VITE_LOOTLOCKER_API_KEY;
    const hasKey = !!(apiKey && apiKey !== 'YOUR_API_KEY_HERE' && apiKey.trim() !== '');
    res.json({ hasLootLocker: hasKey });
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
