import { FLR, getPlayerName, escapeHTML, getLang } from './utils.js';
import { game } from './state.js';


function generateSignature(alt, coins, playTime, lang) {
  const salt = "E7eRn4L_JumP_Pr0t3ct10n";
  let str = alt + "_" + (coins || 0) + "_" + Math.floor(playTime / 1000) + "_" + lang + "_" + salt;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
      let char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
  }
  return hash.toString(36);
}

export const LootLockerAPI = {
  hasLootLockerConfig: null,
  isDirectMode: false,
  apiKey: import.meta.env.VITE_LOOTLOCKER_API_KEY || '',
  domainKey: import.meta.env.VITE_LOOTLOCKER_DOMAIN_KEY || '',
  leaderboardId: import.meta.env.VITE_LOOTLOCKER_LEADERBOARD_ID || '',
  playerIdentifier: localStorage.getItem('LL_PID'),
  
  sessionToken: null,
  playerId: null,
  version: `v${__APP_VERSION__}`,
  logs: [],

  log: function(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push({ timestamp, msg, type });
    console.log(`[LootLocker ${type.toUpperCase()}] ${msg}`);
    
    
  },


  checkConfig: async function() {
    if (this.hasLootLockerConfig !== null) return this.hasLootLockerConfig;
    
    this.log('Checking LootLocker configuration...', 'info');
    
    // 1. Try Express Proxy backend check first
    try {
      this.log('Checking Express Server proxy availability...', 'info');
      let r = await fetch('/api/lootlocker/config-check');
      if (r.ok) {
        let contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          let d = await r.json();
          if (d.hasLootLocker) {
            this.hasLootLockerConfig = true;
            this.isDirectMode = false;
            this.log('Server proxy active (hasLootLocker = true)', 'success');
            return d;
          } else {
            this.log('Server proxy reported that LOOTLOCKER_API_KEY is not set on server side.', 'warning');
          }
        }
      } else {
        this.log(`Server configuration check returned status: ${r.status}`, 'warning');
      }
    } catch (e) {
      this.log(`Server check failed/unavailable: ${e.message} (Possibly static hosting)`, 'info');
    }

    // 2. Fallback to direct client-side requests if Express is missing but VITE env vars are available
    const clientKey = this.apiKey;
    const clientDomain = this.domainKey;
    if (clientKey && clientKey !== 'YOUR_API_KEY_HERE' && clientKey.trim() !== '' && clientDomain) {
      this.hasLootLockerConfig = true;
      this.isDirectMode = true;
      this.log(`Static hosting mode active. Direct connection via Domain: ${clientDomain}`, 'success');
      return true;
    }

    this.log('No LootLocker credentials found on server or compiled client-side. Leaderboards disabled.', 'error');
    this.hasLootLockerConfig = false;
    return false;
  },

  submitPendingScores: async function() {
    try {
      let pending = JSON.parse(localStorage.getItem('LL_PENDING_SCORES') || '[]');
      if (pending && pending.length > 0) {
        this.log(`Found ${pending.length} pending scores, attempting to submit...`, 'info');
        let remaining = [];
        for (let s of pending) {
           let success = await this.submitScore(s.alt, s.coins, s.t, s.lang, true);
           if (!success) remaining.push(s);
        }
        localStorage.setItem('LL_PENDING_SCORES', JSON.stringify(remaining));
      }
    } catch(e) {
      localStorage.removeItem('LL_PENDING_SCORES');
    }
  },
  init: async function() {
    const isConfigured = await this.checkConfig();
    if (!isConfigured) {
      this.log('Initialization aborted (Not Configured)', 'error');
      return false;
    }

    
    if (!this.playerIdentifier) {
      this.playerIdentifier = 'p_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('LL_PID', this.playerIdentifier);
      this.log(`Generated new Player Identifier: ${this.playerIdentifier}`, 'info');
      
    } else {
      this.log(`Loaded existing Player Identifier: ${this.playerIdentifier}`, 'info');
    }
    
    if (this.sessionToken) {
      this.log('Active session token already loaded.', 'success');
      return true;
    }

    try {
      let r;
      let url = '';
      if (this.isDirectMode) {
        url = `https://${this.domainKey}.api.lootlocker.io/game/v2/session/guest`;
        this.log(`POSTing to Direct API: ${url}`, 'info');
        r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_key: this.apiKey,
            player_identifier: this.playerIdentifier,
            game_version: this.version.replace('v', '')
          })
        });
      } else {
        url = '/api/lootlocker/session/guest';
        this.log(`POSTing to Server Proxy: ${url}`, 'info');
        r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_identifier: this.playerIdentifier,
            game_version: this.version.replace('v', '')
          })
        });
      }

      this.log(`Session response status: ${r.status}`, 'info');
      let d = await r.json();
      
      if (!r.ok) {
        this.log(`Session initialization error: ${JSON.stringify(d)}`, 'error');
        return false;
      }
      
      if (d.session_token) {
        this.sessionToken = d.session_token;
        setTimeout(() => this.submitPendingScores(), 2000);
        this.playerId = d.player_id;
        localStorage.setItem('LL_SYS_PLAYER_ID', this.playerId);
        this.log(`Session connected successfully! Player ID: ${this.playerId}`, 'success');
        
        // Use client-generated or loaded customizable player name (e.g., "JPN XY")
        try {
          let localName = getPlayerName();
          let tn = document.getElementById('gamePlayerName');
          if (tn) tn.innerText = 'ID: ' + localName;
          this.setPlayerName(localName);
        } catch(e) {}

        return d;
      }
      this.log('No session token in response data.', 'error');
      return false;
    } catch (e) {
      this.log(`Session guest login failed: ${e.message}`, 'error');
      return false;
    }
  },

  getMemberScore: async function() {
    if (!await this.init()) return null;
    try {
      let r;
      if (this.isDirectMode) {
        let url = `https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/member/${this.playerId}`;
        r = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          }
        });
      } else {
        r = await fetch(`/api/lootlocker/leaderboards/member?member_id=${this.playerId}&session_token=${encodeURIComponent(this.sessionToken)}`);
      }
      if (r.ok) {
        let d = await r.json();
        if (d && typeof d.score === 'number') {
          let score = d.score;
          let alt = Math.floor(score / 1000);
          let coins = score % 1000;
          let time = 0;
          let rank = d.rank || null;
          try {
            if (d.metadata) {
              let m = JSON.parse(d.metadata);
              time = m.t ? m.t * 1000 : 0;
            }
          } catch(e) {}
          return { alt, coins, time, rank };
        } else {
          return { notFound: true };
        }
      } else if (r.status === 404 || r.status === 400) {
        return { notFound: true };
      }
    } catch(e) {
      this.log(`Failed to fetch member score: ${e.message}`, 'error');
    }
    return null;
  },

  setPlayerName: async function(name) {
    if (!await this.init()) return;
    try {
      if (this.isDirectMode) {
        let url = `https://${this.domainKey}.api.lootlocker.io/game/player/name`;
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ name: name })
        });
      } else {
        fetch('/api/lootlocker/player/name', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: name, session_token: this.sessionToken })
        });
      }
    } catch(e) {}
  },
  submitScore: async function(a, c, t, l, isRetry = false) {
    c = Math.min(c || 0, 999);
    this.log(`Attempting to submit score: ${a}m (Coins: ${c}, Lang: ${l})`, 'info');
    if (!await this.init()) {
      this.log('Score submission aborted (Init Failed)', 'error');
      return false;
    }
    let sc = a * 1000 + c;
    let sig = generateSignature(a, c, t, l);
    let meta = JSON.stringify({ alt: a, coins: c, lang: l, t: Math.floor(t / 1000), sig: sig });
    try {
      let r;
      if (this.isDirectMode) {
        let url = `https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/submit`;
        this.log(`Submitting score directly to: ${url}`, 'info');
        r = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ score: sc, metadata: meta })
        });
      } else {
        this.log('Submitting score via server proxy...', 'info');
        r = await fetch('/api/lootlocker/leaderboards/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: sc,
            metadata: meta,
            session_token: this.sessionToken
          })
        });
      }

      this.log(`Score submit response status: ${r.status}`, 'info');
      let d = await r.json();
      if (!r.ok) {
        this.log(`Score submission error: ${JSON.stringify(d)}`, 'error');
        if (isRetry && r.status >= 400 && r.status < 500 && r.status !== 429) {
           this.log('Permanent error during retry. Dropping score from pending queue.', 'error');
           return true; 
        }
        return false;
      }
      this.log('Score successfully registered on LootLocker!', 'success');
      return d;
    } catch (e) {
      this.log(`Score submission failed (offline?): ${e.message}`, 'error');
      if (!isRetry) {
        try {
          let pending = JSON.parse(localStorage.getItem('LL_PENDING_SCORES') || '[]');
          pending.push({ alt: a, coins: c, lang: l, t: t, timestamp: Date.now() });
          pending.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.t - B.t);
          pending = pending.slice(0, 1);
          localStorage.setItem('LL_PENDING_SCORES', JSON.stringify(pending));
          this.log('Score saved locally for offline queue (PB only).', 'warning');
        } catch (err) {
          localStorage.removeItem('LL_PENDING_SCORES');
        }
      }
      return false;
    }
  },

  cachedLeaderboardEtag: null,
  cachedLeaderboardData: null,

  getScores: async function(lm = 100) {
    this.log(`Attempting to fetch top ${lm} scores...`, 'info');
    if (!await this.init()) {
      this.log('Score fetch aborted (Init Failed)', 'error');
      return [];
    }
    try {
      let r;
      let headers = {
        'Content-Type': 'application/json'
      };
      if (this.cachedLeaderboardEtag) {
        headers['If-None-Match'] = this.cachedLeaderboardEtag;
      }
      
      if (this.isDirectMode) {
        let url = `https://${this.domainKey}.api.lootlocker.io/game/leaderboards/${this.leaderboardId}/list?count=${lm}`;
        this.log(`Fetching scores directly from: ${url}`, 'info');
        headers['x-session-token'] = this.sessionToken;
        r = await fetch(url, { headers });
      } else {
        this.log('Fetching scores via server proxy...', 'info');
        r = await fetch(`/api/lootlocker/leaderboards/list?count=${lm}&session_token=${encodeURIComponent(this.sessionToken)}`, { headers });
      }
      
      if (r.status === 304 && this.cachedLeaderboardData) {
        this.log('304 Not Modified: Using cached scores', 'success');
        return this.cachedLeaderboardData;
      }
      
      this.log(`Score fetch response status: ${r.status}`, 'info');
      let d = await r.json();
      if (!r.ok) {
        this.log(`Score fetch error: ${JSON.stringify(d)}`, 'error');
        return [];
      }
      
      if (r.headers.get('ETag')) {
        this.cachedLeaderboardEtag = r.headers.get('ETag');
      }
      
      if (!d.items) {
        this.log('No items returned in score list.', 'warning');
        return [];
      }
      this.log(`Successfully fetched ${d.items.length} records!`, 'success');
      
      let validItems = [];
      d.items.forEach(i => {
        let m = { alt: FLR(i.score / 1000), coins: i.score % 1000, lang: '---', t: 0, sig: '' };
        try {
          if (i.metadata) m = JSON.parse(i.metadata);
        } catch (e) {}
        
        let isValid = true;
        if (m.sig) {
            let expectedSig = generateSignature(m.alt, m.coins, (m.t || 0) * 1000, m.lang);
            if (expectedSig !== m.sig) isValid = false;
        } else {
            isValid = false;
        }
        
        // Impossible speed check (max theoretical speed is ~3600m/s)
        if (m.t && m.t > 0) {
            if (m.alt / m.t > 6000) isValid = false;
        }
        
        if (isValid) {
            let playerName = (i.player && i.player.name) ? i.player.name : '???';
            validItems.push({ id: i.member_id, _originalRank: i.rank, alt: m.alt, coins: m.coins, lang: m.lang, n: playerName });
        }
      });
      
      // Re-assign ranks based on filtered list
      validItems.forEach((v, idx) => {
         v.rank = idx + 1;
      });
      
      this.cachedLeaderboardData = validItems;
      return validItems;

    } catch (e) {
      this.log(`Score fetch failed (offline?): ${e.message}`, 'error');
      return [];
    }
  },

  resetPlayerSession: function() {
    this.log('Resetting player identifier and session...', 'warning');
    localStorage.removeItem('LL_PID');
    localStorage.removeItem('LL_SYS_PLAYER_ID');
    this.playerIdentifier = null;
    this.sessionToken = null;
    this.playerId = null;
    
    this.init();
  }
};

// Auto generate pid if missing
if (!LootLockerAPI.playerIdentifier) {
  LootLockerAPI.playerIdentifier = 'p_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('LL_PID', LootLockerAPI.playerIdentifier);
  
}

