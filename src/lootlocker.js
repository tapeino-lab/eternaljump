import { FLR } from './utils.js';

export const LootLockerAPI = {
  hasLootLockerConfig: null,

  checkConfig: async function() {
    if (this.hasLootLockerConfig !== null) return this.hasLootLockerConfig;
    try {
      let r = await fetch('/api/lootlocker/config-check');
      let d = await r.json();
      this.hasLootLockerConfig = !!d.hasLootLocker;
      return this.hasLootLockerConfig;
    } catch (e) {
      console.error('LL_Config_Check_Fail:', e);
      return false;
    }
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
      let r = await fetch('/api/lootlocker/session/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_identifier: this.playerIdentifier,
          game_version: this.version.replace('v', '')
        })
      });
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
      let r = await fetch('/api/lootlocker/leaderboards/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: String(this.playerId),
          score: sc,
          metadata: meta,
          session_token: this.sessionToken
        })
      });
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
      let r = await fetch(`/api/lootlocker/leaderboards/list?count=${lm}&session_token=${encodeURIComponent(this.sessionToken)}`);
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
