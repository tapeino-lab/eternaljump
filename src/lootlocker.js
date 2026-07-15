import { FLR } from './utils.js';

export const LootLockerAPI = {
  apiKey: 'YOUR_API_KEY_HERE',
  domainKey: '83ib54ok',
  leaderboardId: 'hct2',
  playerIdentifier: localStorage.getItem('LL_PID'),
  sessionToken: null,
  playerId: null,
  version: 'v1.37.11',
  init: async function() {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') return false;
    if (!this.playerIdentifier) {
      this.playerIdentifier = 'p_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('LL_PID', this.playerIdentifier);
    }
    if (this.sessionToken) return true;
    try {
      let r = await fetch(`https://${this.domainKey}.api.lootlocker.io/game/v2/session/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_key: this.apiKey,
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
      let r = await fetch(`https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': this.sessionToken },
        body: JSON.stringify({ member_id: String(this.playerId), score: sc, metadata: meta })
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
      let r = await fetch(`https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/list?count=${lm}`, {
        headers: { 'Content-Type': 'application/json', 'x-session-token': this.sessionToken }
      });
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
