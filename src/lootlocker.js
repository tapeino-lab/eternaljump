import { FLR } from './utils.js';

export const LootLockerAPI = {
  hasLootLockerConfig: null,
  isDirectMode: false,
  apiKey: import.meta.env.VITE_LOOTLOCKER_API_KEY || '',
  domainKey: import.meta.env.VITE_LOOTLOCKER_DOMAIN_KEY || '83ib54ok',
  leaderboardId: import.meta.env.VITE_LOOTLOCKER_LEADERBOARD_ID || 'hct2',

  checkConfig: async function() {
    if (this.hasLootLockerConfig !== null) return this.hasLootLockerConfig;
    
    // 1. Try Express Proxy backend check first
    try {
      let r = await fetch('/api/lootlocker/config-check');
      if (r.ok) {
        let contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          let d = await r.json();
          if (d.hasLootLocker) {
            this.hasLootLockerConfig = true;
            this.isDirectMode = false;
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Server config check failed (possibly running on static hosting like github.io):', e);
    }

    // 2. Fallback to direct client-side requests if Express is missing but VITE env vars are available
    const clientKey = this.apiKey;
    const clientDomain = this.domainKey;
    if (clientKey && clientKey !== 'YOUR_API_KEY_HERE' && clientKey.trim() !== '' && clientDomain) {
      this.hasLootLockerConfig = true;
      this.isDirectMode = true;
      console.log('LootLocker active in Direct Client-to-API mode (Static Hosting Fallback)');
      return true;
    }

    this.hasLootLockerConfig = false;
    return false;
  },

  playerIdentifier: localStorage.getItem('LL_PID'),
  sessionToken: null,
  playerId: null,
  version: 'v1.37.11',

  init: async function() {
    const isConfigured = await this.checkConfig();
    if (!isConfigured) return false;

    if (!this.playerIdentifier) {
      this.playerIdentifier = 'p_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('LL_PID', this.playerIdentifier);
    }
    if (this.sessionToken) return true;

    try {
      let r;
      if (this.isDirectMode) {
        r = await fetch(`https://${this.domainKey}.api.lootlocker.io/game/v2/session/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_key: this.apiKey,
            player_identifier: this.playerIdentifier,
            game_version: this.version.replace('v', '')
          })
        });
      } else {
        r = await fetch('/api/lootlocker/session/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_identifier: this.playerIdentifier,
            game_version: this.version.replace('v', '')
          })
        });
      }

      let d = await r.json();
      if (!r.ok) {
        console.error('LL_Init_Error:', d);
        return false;
      }
      if (d.session_token) {
        this.sessionToken = d.session_token;
        this.playerId = d.player_id;
        return true;
      }
      return false;
    } catch (e) {
      console.error('LL_Init_Fail:', e);
      return false;
    }
  },

  submitScore: async function(a, c, l) {
    if (!await this.init()) return false;
    let sc = a * 1000 + (c || 0);
    let meta = JSON.stringify({ alt: a, coins: c, lang: l });
    try {
      let r;
      if (this.isDirectMode) {
        r = await fetch(`https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ member_id: String(this.playerId), score: sc, metadata: meta })
        });
      } else {
        r = await fetch('/api/lootlocker/leaderboards/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: String(this.playerId),
            score: sc,
            metadata: meta,
            session_token: this.sessionToken
          })
        });
      }

      let d = await r.json();
      if (!r.ok) {
        console.error('LL_Submit_Error:', d);
        return false;
      }
      return true;
    } catch (e) {
      console.error('LL_Submit_Fail:', e);
      return false;
    }
  },

  getScores: async function(lm = 100) {
    if (!await this.init()) return [];
    try {
      let r;
      if (this.isDirectMode) {
        r = await fetch(`https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/list?count=${lm}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          }
        });
      } else {
        r = await fetch(`/api/lootlocker/leaderboards/list?count=${lm}&session_token=${encodeURIComponent(this.sessionToken)}`);
      }

      let d = await r.json();
      if (!r.ok) {
        console.error('LL_Get_Error:', d);
        return [];
      }
      if (!d.items) return [];
      return d.items.map(i => {
        let m = { alt: FLR(i.score / 1000), coins: i.score % 1000, lang: '---' };
        try {
          if (i.metadata) m = JSON.parse(i.metadata);
        } catch (e) {}
        return { id: i.member_id, rank: i.rank, alt: m.alt, coins: m.coins, lang: m.lang };
      });
    } catch (e) {
      console.error('LL_Get_Fail:', e);
      return [];
    }
  }
};

if (!LootLockerAPI.playerIdentifier) {
  LootLockerAPI.playerIdentifier = 'p_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('LL_PID', LootLockerAPI.playerIdentifier);
}
