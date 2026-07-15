import { B64 } from './assets.js';
import { config } from './config.js';
import { LootLockerAPI } from "./lootlocker.js";
import { RND, FLR, ABS, MAX, MIN, SIN, POW, PI, getLang } from "./utils.js";
    
        
    const IMG = {};
    for (let k in B64) {
      IMG[k] = new Image();
      IMG[k].src = B64[k];
    }
    let isFirstPlay = true;
    const $ = i => document.getElementById(i);
    const cvs = $('gameCanvas');
    const ctx = cvs.getContext('2d');
    const ui = $('ui');
    const btnL = $('btnLeft');
    const btnR = $('btnRight');
    const wrap = $('canvasWrapper');
    const dbgModal = $('debugModal');
    const pBtn = $('pauseBtn');
    const autoBtn = $('autoBtn');
    const pScreen = $('pauseScreen');
    
    [btnL, btnR].forEach(b => {
      for (let i = 0; i < 4; i++) {
        let w = document.createElement('div');
        w.className = 's-wrap s' + i;
        let s = document.createElement('div');
        s.className = 'screw';
        let sl = document.createElement('div');
        sl.className = 'screw-slot';
        sl.style.transform = 'rotate(' + FLR(RND() * 360) + 'deg)';
        s.appendChild(sl);
        w.appendChild(s);
        b.appendChild(w);
      }
    });
    
    const isDev = new URLSearchParams(window.location.search).get('dev') === '1';
    let isAttractMode = false;
    let attractTimer = null;
    let ignoreNextTap = false;
    
    const groundCache = document.createElement('canvas');
    groundCache.width = config.gameWidth;
    groundCache.height = 400;
    const gCtx = groundCache.getContext('2d', { alpha: false });
    let groundCached = false;
    
    function drawGroundCache() {
      if (IMG.gnd.complete && IMG.gnd.naturalWidth > 0) {
        let p = gCtx.createPattern(IMG.gnd, 'repeat');
        gCtx.fillStyle = p;
        gCtx.fillRect(0, 0, config.gameWidth, 400);
        groundCached = true;
      }
    }
    
    IMG.gnd.onload = drawGroundCache;
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        drawGroundCache();
        lastBGScore = -1;
      }
    });
    
    window.gameScale = 1;
    let ctrlCenterX = 0;
    
    function resize() {
      let winW = window.innerWidth, winH = window.innerHeight;
      let ratio = config.gameWidth / config.gameHeight;
      let tW = winW, tH = tW / ratio;
      if (tH > winH * 0.85) {
        tH = winH * 0.85;
        tW = tH * ratio;
      }
      let cH = winH - tH;
      let gc = $('gameContainer'), ca = $('controlArea');
      gc.style.width = tW + 'px';
      gc.style.height = tH + 'px';
      ca.style.width = tW + 'px';
      ca.style.height = cH + 'px';
      window.gameScale = tW / config.gameWidth;
      wrap.style.width = config.gameWidth + 'px';
      wrap.style.height = config.gameHeight + 'px';
      wrap.style.transform = `scale(${window.gameScale})`;
      wrap.style.transformOrigin = 'center center';
      cvs.width = config.gameWidth;
      cvs.height = config.gameHeight;
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      $('tapToStartMsg').style.fontSize = MAX(10, FLR(10 * window.gameScale)) + 'px';
      let r = ca.getBoundingClientRect();
      ctrlCenterX = r.left + r.width / 2;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    function dR(x, y, w, h, c) {
      if (c !== null) ctx.fillStyle = c;
      ctx.fillRect(FLR(x), FLR(y), FLR(w), FLR(h));
    }
    
    
    const RankingAPI = {
      key: '8bitJump_Rankings',
      version: 'v1.37.11',
      isShowingResult: false,
      getScores: async function() {
        if (LootLockerAPI.apiKey !== 'YOUR_API_KEY_HERE') return await LootLockerAPI.getScores(100);
        try {
          let d = localStorage.getItem(this.key);
          if (!d) return [];
          let s = JSON.parse(d);
          s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
          return s.map((r, i) => ({ ...r, rank: i + 1 }));
        } catch (e) {
          return [];
        }
      },
      saveScore: async function(a, t, c, r) {
        if (game.isBenchmarking) return;
        if (game.demoMode && !game.allowAutoRank) return;
        let l = getLang(), pid = LootLockerAPI.playerIdentifier;
        game.lastScoreObj = { id: pid, alt: MIN(a, 144000), time: t, coins: c, reason: r, lang: l };
        game.lastScoreId = pid;
        let pbKey = '8bitJump_PB', storedPB = localStorage.getItem(pbKey);
        game.isNewRecord = false;
        game.personalBest = null;
        let cObj = { alt: game.lastScoreObj.alt, coins: game.lastScoreObj.coins, time: game.lastScoreObj.time };
        if (storedPB) {
          let pb = JSON.parse(storedPB);
          game.personalBest = pb;
          if (cObj.alt > pb.alt || (cObj.alt === pb.alt && cObj.coins > pb.coins) || (cObj.alt === pb.alt && cObj.coins === pb.coins && cObj.time < pb.time)) {
            game.isNewRecord = true;
            localStorage.setItem(pbKey, JSON.stringify(cObj));
          }
        } else {
          game.isNewRecord = true;
          localStorage.setItem(pbKey, JSON.stringify(cObj));
        }
        if (game.isNewRecord) {
          if (LootLockerAPI.apiKey !== 'YOUR_API_KEY_HERE') {
            await LootLockerAPI.submitScore(game.lastScoreObj.alt, c, l);
          } else {
            try {
              let s = await this.getScores();
              let ex = s.findIndex(x => x.id === pid);
              if (ex !== -1) {
                let ca = s[ex].alt, cc = s[ex].coins;
                if (a > ca || (a === ca && c > cc)) s[ex] = game.lastScoreObj;
              } else {
                s.push(game.lastScoreObj);
              }
              s.sort((A, B) => B.alt - A.alt || (B.coins || 0) - (A.coins || 0) || A.time - B.time);
              game.lastRank = s.findIndex(x => x.id === pid) + 1;
              s = s.slice(0, 100);
              localStorage.setItem(this.key, JSON.stringify(s));
            } catch (e) {}
          }
        }
      },
      show: async function(state) {
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        if (isEnd) {
          await this.showResult(state);
        } else {
          await this.showRanking(state);
        }
      },
      showResult: async function(state) {
        this.isShowingResult = true;
        $('rankingModal').innerHTML = '<h1 style="color:#fff;font-size:12px;text-align:center;">LOADING...</h1>';
        $('rankingModal').style.display = 'flex';
        $('tapToStartMsg').style.display = 'none';
        ignoreNextTap = true;
        
        let title = '';
        if (state === 'clear') {
          title = '<h1 style="animation:superBlink 0.1s steps(1) infinite;margin:0 0 10px 0;font-size:12px;text-align:center;">CONGRATULATIONS!</h1>';
        } else if (state === 'gameover') {
          if (game.isNewRecord) {
            title = '<h1 style="color:#f0f;margin:0 0 10px 0;font-size:12px;text-align:center;animation:superBlink 0.3s steps(1) infinite;">★ NEW RECORD! ★</h1>';
          } else {
            title = '<h1 style="color:#fff;margin:0 0 10px 0;font-size:12px;text-align:center;">TRY AGAIN!</h1>';
          }
        }
        
        let h = title;
        if (game.lastScoreObj) {
          let pbHTML = (game.isNewRecord && state === 'clear') ? '<div style="color:#f0f;font-size:10px;margin-bottom:6px;animation:superBlink 0.3s steps(1) infinite;">★ NEW RECORD! ★</div>' : '';
          
          h += '<div style="background:#222;padding:10px;margin-bottom:10px;border:2px solid #fff;border-radius:6px;width:90%;max-width:400px;box-sizing:border-box;text-align:center;">' + pbHTML + '<h2 style="color:#ff0;margin:0 0 8px 0;font-size:12px;">RESULT</h2>';
          h += '<div style="display:flex;flex-direction:column;gap:12px;font-size:10px;color:#ddd;margin-top:10px;">';
          h += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #444;padding-bottom:4px;"><span>HEIGHT</span><span style="color:#fff;font-size:12px;">' + game.lastScoreObj.alt + 'm</span></div>';
          h += '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;"><span>COINS</span><span style="color:#ffb;font-size:12px;">' + (game.lastScoreObj.coins || 0) + '</span></div>';
          h += '</div>';

          if (!game.isNewRecord && game.personalBest) {
            h += '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #555;text-align:center;">';
            h += '<h2 style="color:#aaa;margin:0 0 8px 0;font-size:10px;">YOUR BEST</h2>';
            h += '<div style="display:flex;flex-direction:column;gap:8px;font-size:9px;color:#aaa;">';
            h += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #444;padding-bottom:4px;"><span>HEIGHT</span><span style="color:#ddd;font-size:10px;">' + game.personalBest.alt + 'm</span></div>';
            h += '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;"><span>COINS</span><span style="color:#dd8;font-size:10px;">' + (game.personalBest.coins || 0) + '</span></div>';
            h += '</div></div>';
          }
          h += '</div>';
        }
        
        $('rankingModal').innerHTML = h;
        $('rankingModal').style.display = 'flex';
        
        setTimeout(() => {
          ignoreNextTap = false;
          $('tapToStartMsg').innerText = 'TAP TO SHOW RANKING';
          $('tapToStartMsg').style.display = 'block';
        }, 500);
      },
      showRanking: async function(state) {
        this.isShowingResult = false;
        $('rankingModal').innerHTML = '<h1 style="color:#fff;font-size:12px;text-align:center;">LOADING RANKING...</h1>';
        ignoreNextTap = true;
        let s = await this.getScores();
        let pid = LootLockerAPI.playerIdentifier;
        let pRank = s.find(x => x.id === pid);
        if (pRank) game.lastRank = pRank.rank;
        
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        let h = '<h1 style="color:#0f0;margin:0 0 10px 0;font-size:12px;text-align:center;">RANKING</h1>';
        
        h += '<div style="background:#111;padding:10px;border:2px solid #fff;border-radius:6px;width:90%;max-width:400px;box-sizing:border-box;text-align:center;">';
        h += '<h2 style="color:#0f0;margin:0 0 8px 0;font-size:12px;">TOP 10</h2>';
        h += '<table style="width:100%;table-layout:fixed;font-size:9px;border-collapse:collapse;"><tr style="color:#fff;"><th style="text-align:left;padding-bottom:4px;width:20%;">RANK</th><th style="text-align:center;padding-bottom:4px;width:20%;">LANG</th><th style="text-align:center;padding-bottom:4px;width:40%;">HEIGHT</th><th style="text-align:right;padding-bottom:4px;width:20%;">COIN</th></tr>';
        
        let curLen = s.length;
        for (let i = 0; i < 10 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2500, coins: 0, lang: '---' });

        let top10 = s.slice(0, 10);
        let hl = false;
        top10.forEach((r, i) => {
            let isC = (r.id === pid);
            if (isC) hl = true;
            let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:bold;' : '';
            let m = '';
            if (i === 0) m = '<span class="mdl mdl-1"></span>';
            else if (i === 1) m = '<span class="mdl mdl-2"></span>';
            else if (i === 2) m = '<span class="mdl mdl-3"></span>';
            h += `<tr style="border-bottom:1px dashed #333;${bg}"><td style="padding:4px 0;text-align:left;width:20%;white-space:nowrap;overflow:hidden;">${m}${i + 1}</td><td style="text-align:center;width:20%;white-space:nowrap;overflow:hidden;">${r.lang || '---'}</td><td style="text-align:center;width:40%;white-space:nowrap;overflow:hidden;">${r.alt}m</td><td style="text-align:right;width:20%;color:#ffb;white-space:nowrap;overflow:hidden;">${r.coins || 0}</td></tr>`;
          });
          if (!hl && game.lastScoreId && game.lastRank > 10) {
            h += `<tr><td colspan="4" style="text-align:center;padding:5px 0;color:#888;">...</td></tr>`;
            let r = pRank || game.lastScoreObj;
            let m = '';
            if (game.lastRank === 1) m = '<span class="mdl mdl-1"></span>';
            else if (game.lastRank === 2) m = '<span class="mdl mdl-2"></span>';
            else if (game.lastRank === 3) m = '<span class="mdl mdl-3"></span>';
            h += `<tr style="animation:rowBlink 1s infinite;font-weight:bold;border-top:1px solid #fff;"><td style="padding:4px 0;text-align:left;width:20%;white-space:nowrap;overflow:hidden;">${m}${game.lastRank}</td><td style="text-align:center;width:20%;white-space:nowrap;overflow:hidden;">${r.lang || '---'}</td><td style="text-align:center;width:40%;white-space:nowrap;overflow:hidden;">${r.alt}m</td><td style="text-align:right;width:20%;color:#ffb;white-space:nowrap;overflow:hidden;">${r.coins || 0}</td></tr>`;
          }
          h += '</table>';
        h += '</div>';
        if (!isEnd) {
          h += '<button id="closeRankBtn" class="dbg-btn" style="margin-top:10px;width:90%;max-width:400px;padding:6px;font-size:10px;pointer-events:auto;display:none;">CLOSE</button>';
        }
        $('rankingModal').innerHTML = h;
        setTimeout(() => {
          ignoreNextTap = false;
          if (isEnd) {
            $('tapToStartMsg').innerText = 'TAP TO START';
            $('tapToStartMsg').style.display = 'block';
          } else {
            let cb = $('closeRankBtn');
            if (cb) cb.style.display = 'block';
          }
        }, 500);
      },
      reset: function() {
        try {
          localStorage.removeItem(this.key);
          localStorage.removeItem('8bitJump_PB');
          alert('RANKING CLEARED!');
        } catch (e) {}
      }
    };
    function logAIEvent(type, detail) {
      if (!game.isBenchmarking) return;
      let alt = FLR((game.baseScoreY - game.player.y) * config.scoreMultiplier);
      game.eventLog.push('[Alt: ' + alt + 'm] ' + type.padEnd(12, ' ') + ' | ' + detail);
      if (type === 'ADV_START') game.loopCount++;
    }

    const P_PT = [], P_PL = [], P_CN = [], P_BD = [], P_MT = [], P_IT = [];

    function getPt(x, y, vx, vy, c, s, l, g = 0.2, sp = false) {
      let p = P_PT.length ? P_PT.pop() : new Particle();
      p.init(x, y, vx, vy, c, s, l, g, sp);
      return p;
    }

    function getPl(y, t = 'normal', ig = false, cx = null, cw = null, ch = null, c = 1, icy = false) {
      let p = P_PL.length ? P_PL.pop() : new Platform();
      p.init(y, t, ig, cx, cw, ch, c, icy);
      return p;
    }

    function getCn(x, y) {
      let c = P_CN.length ? P_CN.pop() : new Coin();
      c.init(x, y);
      return c;
    }

    function getBd(t, x, y, ip, p = null, ib = false) {
      let b = P_BD.length ? P_BD.pop() : new Bird();
      b.init(t, x, y, ip, p, ib);
      return b;
    }

    function getMt(x, y, vx, vy) {
      let m = P_MT.length ? P_MT.pop() : new Meteor();
      m.init(x, y, vx, vy);
      return m;
    }

    function getIt(y) {
      let i = P_IT.length ? P_IT.pop() : new Item();
      i.init(y);
      return i;
    }

    class Particle {
      init(x, y, vx, vy, color, size, life, g = 0.2, isSp = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.g = g;
        this.isSp = isSp;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.g;
        this.life--;
      }
      draw() {
        if (this.isSp === true) {
          let b = this.life % 6 < 3, s = b ? 4 : 2, c = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'][FLR(RND() * 7)];
          ctx.globalAlpha = 0.9;
          dR(this.x - 1, this.y - s, 2, s * 2, c);
          dR(this.x - s, this.y - 1, s * 2, 2, c);
          if (b) dR(this.x, this.y, 2, 2, '#fff');
        } else {
          ctx.globalAlpha = MAX(0, this.life / this.maxLife);
          dR(this.x, this.y, this.size, this.size, this.color);
        }
        ctx.globalAlpha = 1.0;
      }
    }

    function spawnParticles(x, y, color, count, speed = 4, effectType = 'burst') {
      for (let i = 0; i < count; i++) {
        let vx, vy;
        if (effectType === 'collapse') {
          vx = (RND() - 0.5) * (speed * 0.5);
          vy = RND() * speed;
        } else {
          vx = (RND() - 0.5) * speed;
          vy = (RND() - 1) * speed;
        }
        game.particles.push(getPt(x, y, vx, vy, color, 3 + RND() * 3, 10 + RND() * 15));
      }
    }

    function spawnDebris(x, y, w, h, color, count) {
      for (let i = 0; i < count; i++) {
        let px = x + RND() * w;
        let py = y + RND() * h;
        let vx = (RND() - 0.5) * 3;
        let vy = RND() * 1.5;
        let size = 6 + RND() * 10;
        let life = 60 + RND() * 30;
        let pt = getPt(px, py, vx, vy, color, size, life);
        pt.g = 0.15 + RND() * 0.1;
        game.particles.push(pt);
      }
    }

    function trySpawnBirdsOnPlatform(np, sc) {
      if (np.type === 'normal' && sc > game.startScore + 1000 && sc < 52000) {
        let prob = 0, maxB = 0;
        if (sc < 15000) { prob = 0.3; maxB = 2; }
        else if (sc < 40000) { prob = 0.15; maxB = 1; }
        else if (sc < 52000) { prob = 0.5; maxB = 5; }
        if (RND() < prob) {
          let bT = RND() < 0.8 ? 0 : 1;
          let platX = np.x, platW = np.w, bSp = bT === 0 ? 4 : 5;
          let mN = MAX(1, FLR((platW - 4) / bSp) + 1);
          let num = MIN(bT === 1 ? (RND() < 0.5 ? 1 : 2) : 2 + FLR(RND() * maxB), mN);
          let gW = (num - 1) * bSp + 4;
          let bx = RND() * MAX(0, platW - gW);
          for (let j = 0; j < num; j++) {
            game.birds.push(getBd(bT, platX + bx + j * bSp, np.y, true, np));
          }
        }
      }
    }

    class Bird {
      init(type, x, y, isPerched, platform = null, isTitleBird = false) {
        this.type = type;
        this.isPerched = isPerched;
        this.platform = platform;
        this.offsetX = platform ? x - platform.x : 0;
        this.offsetY = platform ? y - platform.y : 0;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isTitleBird = isTitleBird;
        this.alertDist = isTitleBird ? 0 : 30 + RND() * 50;
        this.animOffset = RND() * 1000;
        if (!isPerched) {
          if (type === 2) {
            this.vx = (x < config.gameWidth / 2 ? 1 : -1) * (0.4 + RND() * 0.3);
            this.baseY = y;
          } else {
            this.vx = (x < config.gameWidth / 2 ? 1 : -1) * (1 + RND());
            this.vy = (RND() - 0.5) * 0.5;
          }
        }
      }
      update() {
        if (this.isPerched) {
          if (this.platform) {
            if (this.platform.broken) {
              this.isPerched = false;
              this.vy = 1;
            } else {
              this.x = this.platform.x + this.offsetX;
              this.y = this.platform.y + this.offsetY;
            }
          }
          if (this.isTitleBird) {
            if (game.player.y < 150 && game.player.vy < -5) {
              this.isPerched = false;
              let escDir = (this.x < config.gameWidth / 2) ? -1 : 1;
              this.vx = escDir * (1.5 + RND() * 2);
              this.vy = -1.5 - RND() * 2;
            }
          } else {
            let ents = [game.player];
            let tr = false, tx = this.x;
            for (let e of ents) {
              let dx = (e.x + e.w / 2) - this.x;
              let dy = (e.y + e.h / 2) - this.y;
              if (dx * dx + dy * dy < this.alertDist * this.alertDist) {
                tr = true;
                tx = e.x + e.w / 2;
                break;
              }
            }
            if (tr) {
              this.isPerched = false;
              let escDir = (this.x > tx ? 1 : -1);
              if (this.type === 0) {
                this.vx = escDir * (1 + RND());
                this.vy = -1 - RND() * 2;
              } else {
                this.vx = escDir * (0.8 + RND() * 0.5);
                this.vy = -0.5 - RND();
              }
            }
          }
        } else {
          this.x += this.vx;
          this.y += this.vy;
          if (this.type === 0) this.x += SIN(performance.now() / 50 + this.animOffset) * 0.5;
          else if (this.type === 2) this.y = this.baseY + SIN(this.x * 0.05) * 10;
        }
      }
      draw(ts) {
        ctx.fillStyle = 'rgba(20,10,10,0.6)';
        let t = ts + this.animOffset;
        ctx.save();
        ctx.translate(FLR(this.x), FLR(this.y));
        if (this.vx < 0) ctx.scale(-1, 1);
        if (this.type === 0) {
          if (this.isPerched) ctx.fillRect(0, -2, 2, 2);
          else if ((t % 100) < 50) { ctx.fillRect(0, -1, 3, 1); ctx.fillRect(1, -2, 1, 1); }
          else { ctx.fillRect(0, -2, 2, 1); ctx.fillRect(1, -1, 1, 1); }
        } else if (this.type === 1) {
          if (this.isPerched) ctx.fillRect(0, -3, 3, 3);
          else if ((t % 200) < 100) { ctx.fillRect(-1, -1, 4, 1); ctx.fillRect(0, -2, 2, 1); }
          else { ctx.fillRect(-1, -2, 4, 1); ctx.fillRect(0, -1, 2, 1); }
        } else {
          if ((t % 1000) < 200) { ctx.fillRect(-2, -1, 6, 1); ctx.fillRect(-3, -3, 2, 2); ctx.fillRect(3, -3, 2, 2); }
          else { ctx.fillRect(-3, -1, 8, 1); ctx.fillRect(-1, -2, 4, 1); }
        }
        ctx.restore();
      }
    }

    class Meteor {
      init(x, y, vx, vy) {
        this.isLarge = RND() < 0.3;
        this.scale = this.isLarge ? 2 : 1;
        this.w = 16 * this.scale;
        this.h = 16 * this.scale;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.hitTimer = 0;
        this.ang = RND() * PI * 2;
        this.rot = (RND() - 0.5) * 0.06;
      }
      update() {
        if (this.hitTimer > 0) this.hitTimer--;
        this.x += this.vx;
        this.y += this.vy;
        this.ang += this.rot;
        let pc = this.isLarge ? 2 : 1;
        for (let i = 0; i < pc; i++) {
          for (let j = 0; j < 2; j++) {
            if (RND() < 0.45) {
              game.particles.push(getPt(
                this.x + RND() * 16 * this.scale,
                this.y - 4 * this.scale + RND() * 14 * this.scale,
                (RND() - 0.5) * 0.2 * this.scale,
                (RND() - 0.5) * 0.2 * this.scale,
                '#f80',
                3 + RND() * 4,
                (8 + RND() * 10) * this.scale,
                0
              ));
            }
          }
          if (RND() < 0.6) {
            let w = RND() < 0.1, c = w ? '#ddd' : '#333', s = w ? (2 + RND() * 1.5) : (4 + RND() * 3);
            game.particles.push(getPt(
              this.x + 2 * this.scale + RND() * 12 * this.scale,
              this.y - 2 * this.scale,
              (RND() - 0.5) * 0.3 * this.scale,
              (-0.2 + RND() * 0.2) * this.scale,
              c,
              s * this.scale,
              (15 + RND() * 15) * this.scale,
              0
            ));
          }
        }
      }
      draw() {
        ctx.save();
        ctx.translate(FLR(this.x + this.w / 2), FLR(this.y + this.h / 2));
        ctx.rotate(this.ang);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-8, -8);
        dR(4, 0, 8, 16, '#421');
        dR(2, 2, 12, 12, '#421');
        dR(0, 4, 16, 8, '#421');
        dR(6, 4, 4, 4, '#210');
        dR(10, 10, 2, 2, '#210');
        ctx.restore();
      }
    }

    class Player {
      constructor() {
        this.isNPC = false;
        this.reset();
      }
      reset() {
        this.w = this.h = config.playerSize;
        this.x = config.gameWidth / 2 - this.w / 2;
        this.y = config.gameHeight - 80;
        this.vx = this.vy = this.animTimer = this.baseY = 0;
        this.isFalling = this.isSuperJumping = this.isPoweredUp = this.isSparkleJumping = false;
        this.history = [];
        this.facingRight = true;
        this.squatTimer = 0;
        this.inputDir = 0;
        this.aiPath = [];
        this.visitedHistory = [];
        this.stagnationTimer = 0;
        this.adventureMode = false;
        this.lastPlatform = null;
        this.sameBounceCount = 0;
        this.apexRecalculated = false;
        this.highestReachedY = this.y;
        this.hitTimer = 0;
        this.savedIntroImg = null;
      }
      powerUp() {
        if (this.isPoweredUp) {
          if (this.isSuperJumping) this.jump(config.superJumpPower * config.glowingMovingJumpMultiplier);
          else this.jump(config.superJumpPower);
        } else {
          game.state = 'powerup_anim';
          this.animTimer = 48;
          this.baseY = this.y;
        }
      }
      update() {
        if (this.squatTimer > 0) this.squatTimer--;
        if (this.hitTimer > 0) this.hitTimer--;
        
        if (this.vx > 0.05) this.facingRight = true;
        else if (this.vx < -0.05) this.facingRight = false;
        
        this.history.unshift({ x: this.x, y: this.y, dir: this.facingRight });
        if (this.history.length > 4) this.history.pop();
        
        if (this.vy >= 0) {
          this.isSuperJumping = false;
          this.isSparkleJumping = false;
        }
        
        let mx = config.maxSpeedX, ax = config.accelX, tx = config.turnAccelX;
        if (this.isSuperJumping) {
          mx *= 1.2;
          ax *= 1.2;
        }
        
        let cDir = (this.hitTimer > 0) ? 0 : this.inputDir;
        if (cDir !== 0) {
          let turn = (this.vx > 0 && cDir < 0) || (this.vx < 0 && cDir > 0);
          this.vx += cDir * (turn ? tx : ax);
          this.vx = MAX(-mx, MIN(mx, this.vx));
        } else {
          this.vx *= (this.hitTimer > 0 ? 0.98 : config.frictionX);
          if (ABS(this.vx) < 0.05) this.vx = 0;
        }
        
        if (this.vy < 0) this.vy += config.jumpGravity;
        else {
          this.vy += config.fallGravity;
          this.vy *= config.fallFriction;
        }
        
        this.isFalling = (this.vy > 0);
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.isSparkleJumping && this.vy < -7.5 && RND() < -this.vy / 30) {
          game.particles.push(getPt(
            this.x + RND() * this.w,
            this.y + RND() * this.h,
            (RND() - 0.5) * 0.5,
            (RND() - 0.5) * 0.5,
            null, 1, 10 + RND() * 15, 0.02, true
          ));
        }
        
        if (game.state === 'intro' || this.isIntro) {
          if (this.x < 0) this.x = 0;
          if (this.x + this.w > 128) this.x = 128 - this.w;
          if (this.y > 225 && this.x < 96) this.x = 96;
        } else {
          if (this.x + this.w < 0) this.x = config.gameWidth;
          if (this.x > config.gameWidth) this.x = -this.w;
        }
        
        if (game.state === 'playing' && this.y > 208 && this.vy < 0 && game.highestPlayerY > 100) {
          if (this.x < 96) { this.x = 96; this.vx = 0; }
          if (this.x > 112) { this.x = 112; this.vx = 0; }
        }
      }
      draw() {
        let c = this.isFalling ? '#f99' : '#f00', dH = this.h, dY = this.y;
        let isPwr = this.isPoweredUp;
        if (game.state === 'powerup_anim' || game.state === 'powerdown_anim') {
          let s = FLR(this.animTimer / 6);
          let b = game.state === 'powerup_anim' ? (s % 2 === 0) : (s % 2 !== 0);
          dH = b ? config.playerSize * 2 : config.playerSize;
          dY = b ? this.baseY - config.playerSize : this.baseY;
          if (game.state === 'powerdown_anim') dY = b ? this.baseY : this.baseY + config.playerSize;
          isPwr = b;
        }
        
        let bA = MAX(0, MIN(1, (-this.vy - 10) / 5));
        let cImg = isPwr ? IMG.pwr : IMG.jmp;
        
        if (this.isNPC) {
          cImg = this.active ? IMG['n' + (this.npcIndex + 1) + 'j'] : IMG['n' + (this.npcIndex + 1) + 's'];
        } else if (!isPwr) {
          if (game.state === 'gameover') {
            cImg = IMG.fal;
          } else if (game.state === 'clear') {
            cImg = IMG.jmp;
          } else if (game.state === 'intro_anim') {
            cImg = this.savedIntroImg || IMG.wlk2;
          } else if (this.squatTimer > 0) {
            cImg = IMG.wlk3;
          } else if ((game.state === 'intro' || this.isIntro) && this.vy > 0) {
            if (this.y > 272) {
              cImg = IMG.fal;
            } else {
              let f = FLR(performance.now() / 100) % 3;
              cImg = f === 0 ? IMG.wlk1 : (f === 1 ? IMG.wlk2 : IMG.wlk3);
            }
          } else if (this.vy < 0 || (this.vy > 0 && this.vy < 4.68)) {
            cImg = IMG.jmp;
          } else if (this.vy >= 4.68) {
            cImg = IMG.fal;
          } else {
            if (ABS(this.vx) > 0) {
              let f = FLR(performance.now() / 100) % 3;
              cImg = f === 0 ? IMG.wlk1 : (f === 1 ? IMG.wlk2 : IMG.wlk3);
            } else {
              cImg = IMG.std;
            }
          }
        }
        
        let useSp = true;
        let vS = config.playerSpriteScale || 1, vOy = config.playerSpriteOffsetY || 0;
        let bAl = (this.hitTimer > 0 && FLR(performance.now() / 50) % 2 === 0) ? 0.2 : 1.0;
        ctx.globalAlpha = bAl;
        
        if (bA > 0 && game.state === 'playing') {
          this.history.forEach((pos, i) => {
            ctx.globalAlpha = MAX(0, 0.4 - i * 0.1) * bA * bAl;
            if (useSp && cImg.complete) {
              ctx.save();
              ctx.translate(FLR(pos.x + this.w / 2), FLR(pos.y + dH));
              if (!pos.dir) ctx.scale(-1, 1);
              if (this.hitTimer > 0 && this.isNPC) {
                ctx.translate(0, -dH / 2);
                ctx.rotate((performance.now() / 50) % (PI * 2));
                ctx.translate(0, dH / 2);
              }
              ctx.drawImage(cImg, FLR((-this.w / 2) * vS), FLR(-dH * vS + vOy), FLR(this.w * vS), FLR(dH * vS));
              ctx.restore();
            } else {
              dR(pos.x, pos.y, this.w, dH, c);
            }
          });
        }
        
        ctx.globalAlpha = bAl;
        if (useSp && cImg.complete) {
          ctx.save();
          ctx.translate(FLR(this.x + this.w / 2), FLR(dY + dH));
          if (!this.facingRight) ctx.scale(-1, 1);
          if (this.hitTimer > 0 && this.isNPC) {
            ctx.translate(0, -dH / 2);
            ctx.rotate((performance.now() / 50) % (PI * 2));
            ctx.translate(0, dH / 2);
          }
          ctx.drawImage(cImg, FLR((-this.w / 2) * vS), FLR(-dH * vS + vOy), FLR(this.w * vS), FLR(dH * vS));
          ctx.restore();
        } else {
          dR(this.x, dY, this.w, dH, c);
        }
        ctx.globalAlpha = 1.0;
      }
      jump(p) {
        let fp = p;
        if (this.isPoweredUp && p > config.superJumpPower) fp = p * config.powerJumpMultiplier;
        this.vy = fp;
        this.isSuperJumping = (fp < config.jumpPower);
        if (fp <= -20 && !this.isNPC) game.shakeAmount = (ABS(fp) - 15) * 1.5;
      }
    }

    class NPC extends Player {
      constructor(x, y, delayMs, idx) {
        super();
        this.x = x;
        this.y = y;
        this.facingRight = false;
        this.startDelayMs = delayMs;
        this.active = false;
        this.isNPC = true;
        this.isIntro = true;
        this.frameCount = FLR(RND() * 3);
        this.waitTimer = 0;
        this.npcIndex = idx;
      }
      update() {
        if (!this.active) {
          if (game.state === 'playing') {
            this.waitTimer += frameDuration;
            if (this.waitTimer >= this.startDelayMs) this.active = true;
          }
          return;
        }
        this.frameCount++;
        if (!(this.hitTimer > 0) && this.frameCount % 3 === 0) runAI(this);
        super.update();
      }
    }

    class Platform {
      init(y, t = 'normal', ig = false, cx = null, cw = null, ch = null, count = 1, isIcy = false) {
        this.isGround = ig;
        this.count = count;
        this.isIcy = isIcy;
        this.type = t;
        if (ch !== null) { this.h = ch; }
        else if (ig) { this.h = 32; }
        else { this.h = 30; }
        
        this.w = cw !== null ? cw : (ig ? config.gameWidth : config.platformW * count);
        this.y = this.startY = FLR(y);
        this.direction = RND() < 0.5 ? 1 : -1;
        this.squishTimers = new Array(count).fill(0);
        this.breakOnSquish = new Array(count).fill(false);
        this.isGlowing = ((t === 'h-slide' || t === 'v-slide') && !ig && RND() < config.glowingMovingProb);
        this.broken = false;
        this.blacklisted = false;
        this.noEffect = false;
        this.isOverlapping = false;
        
        if (cx !== null) {
          this.x = FLR(cx);
        } else if (ig) {
          this.x = 0;
        } else {
          let minX = 0, maxX = config.gameWidth - this.w;
          if (t === 'h-slide') {
            minX = config.gameWidth / 6;
            maxX = config.gameWidth - this.w - config.gameWidth / 6;
          } else if ((game.baseScoreY - this.y) * config.scoreMultiplier < 20000 && game.platforms.length > 0) {
            let lp = game.platforms[game.platforms.length - 1];
            minX = MAX(0, lp.x + lp.w / 2 - 90 - this.w / 2);
            maxX = MIN(config.gameWidth - this.w, lp.x + lp.w / 2 + 90 - this.w / 2);
            if (maxX < minX) maxX = minX;
          }
          
          let ol = true, at = 0, nx = 0;
          while (ol && at < 20) {
            nx = minX + RND() * (maxX - minX);
            ol = false;
            if (this.type !== 'goal' && !ig && this.y < 230 && this.y > -1500) {
              let avoidW = 28, cx = config.gameWidth / 2;
              if (nx + this.w > cx - avoidW && nx < cx + avoidW) ol = true;
            }
            if (!ol) {
              for (let p of game.platforms) {
                if (ABS(p.y - this.y) < this.h + 2) {
                  let px = p.x, pw = p.w;
                  if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
                  if (nx < px + pw + 2 && nx + this.w + 2 > px) { ol = true; break; }
                }
              }
              let pX = nx, pY = this.y, pW = this.w, pH = this.h;
              if (t === 'h-slide') { pX = nx - config.gameWidth / 6; pW = this.w + config.gameWidth / 3; }
              else if (t === 'v-slide') { pY = this.y - 50; pH = this.h + 100; }
              if (!ol) {
                for (let it of game.items) {
                  if (ABS(this.y - it.y) < this.h + 2 && nx < it.x + it.w + 2 && nx + this.w + 2 > it.x) { ol = true; break; }
                }
              }
              if (!ol) {
                for (let c of game.coins) {
                  if (ABS(this.y - c.y) < this.h + 2 && nx < c.x + c.w + 2 && nx + this.w + 2 > c.x) { ol = true; break; }
                }
              }
            }
            at++;
          }
          this.x = FLR(nx);
          this.isOverlapping = ol;
        }
        this.startX = this.x;
        this.isIntroCover = false;
        this.blink = false;
        this.isCrumbling = false;
      }
      update() {
        if (this.isCrumbling && this.h > 0) {
          let crumbleAmount = 15;
          let prevY = this.y;
          this.y += crumbleAmount;
          this.h -= crumbleAmount;
          if (this.h <= 0) {
            crumbleAmount += this.h; // adjust last step
            this.h = 0;
            this.broken = true;
            this.isCrumbling = false;
          }
          
          let weight = this.h / 400;
          let numRocks = Math.floor(1 + weight * 4 + RND() * 3);
          for (let j = 0; j < numRocks; j++) {
            let margin = 4;
            let px = this.x + margin + RND() * (this.w - margin * 2);
            let py = prevY + RND() * crumbleAmount;
            let vx = (RND() - 0.5) * 0.4;
            let vy = RND() * 1.5 + 0.5;
            let size = 3 + RND() * 6;
            let life = 60 + RND() * 40;
            let pt = getPt(px, py, vx, vy, '#8B4513', size, life);
            pt.g = 0.05 + RND() * 0.05;
            game.particles.push(pt);
          }
          
          let numDust = Math.floor(2 + weight * 6 + RND() * 4);
          let dC = ['#A0522D', '#D2B48C', '#DEB887', '#aaa'];
          for (let j = 0; j < numDust; j++) {
            let px = this.x + RND() * this.w;
            let py = prevY + RND() * crumbleAmount;
            let vx = (RND() - 0.5) * 2;
            let vy = (RND() - 0.5) * 1 + 0.5;
            let size = 2 + RND() * 4;
            let life = 40 + RND() * 40;
            let pt = getPt(px, py, vx, vy, dC[FLR(RND() * 4)], size, life);
            pt.g = 0.01;
            game.particles.push(pt);
          }
          return;
        }

        for (let i = 0; i < this.count; i++) {
          if (this.squishTimers[i] > 0) {
            this.squishTimers[i]--;
            if (this.squishTimers[i] === 0 && this.isIcy && !this.broken && this.breakOnSquish[i]) {
              this.broken = true;
              let cX = this.x + i * config.platformW + 8, cY = this.y + 15, iC = ['#fff', '#e0ffff', '#b0e0e6', '#f0ffff'];
              for (let p = 0; p < 8; p++) game.particles.push(getPt(cX + (RND() - 0.5) * 8, cY + (RND() - 0.5) * 8, (RND() - 0.5) * 6, (RND() - 0.5) * 4 - 1, '#fff', 2 + RND() * 2, 15 + RND() * 10, 0.2 + RND() * 0.1));
              for (let p = 0; p < 20; p++) game.particles.push(getPt(cX + (RND() - 0.5) * 12, cY + (RND() - 0.5) * 12, (RND() - 0.5) * 1.5, (RND() - 0.8) * 1, iC[FLR(RND() * 4)], RND() * 1.5, 30 + RND() * 45, 0.005 + RND() * 0.015));
            }
          }
        }
        if ((this.type === 'super' || this.isGlowing) && !this.broken && !this.noEffect) {
          let sV = this.isGlowing ? 0.3 : 0.15;
          sV *= this.count;
          while (RND() < sV) {
            game.particles.push(getPt(this.x + RND() * this.w, this.y - 12 + RND() * (this.h + 12), (RND() - 0.5) * 0.1, -0.16 - RND() * 0.17, null, 1, 15 + RND() * 20, 0, true));
            sV -= 1;
          }
        }
        if (this.type === 'h-slide') {
          this.x += config.hSlideSpeed * this.direction;
          let mr = config.gameWidth / 3;
          if (this.x <= this.startX - mr / 2 || this.x + this.w >= this.startX + mr / 2 || this.x <= 0 || this.x + this.w >= config.gameWidth) this.direction *= -1;
        } else if (this.type === 'v-slide') {
          this.y += config.vSlideSpeed * this.direction;
          if (ABS(this.y - this.startY) > 50) this.direction *= -1;
        }
      }
      draw() {
        if (this.broken) return;
        if (this.type === 'goal') {
          ctx.fillStyle = '#eef';
          ctx.fillRect(FLR(this.x), FLR(this.y), FLR(this.w), FLR(this.h));
          for (let i = 0; i <= this.w / 20; i++) {
            ctx.beginPath();
            ctx.arc(FLR(this.x + i * 20), FLR(this.y), 14, 0, PI * 2);
            ctx.fill();
          }
          return;
        }
        if (this.isGround) {
          if (this.isIntroCover && this.blink) ctx.globalAlpha = 0.3;
          if (groundCached) {
            ctx.drawImage(groundCache, this.x, 0, this.w, this.h, this.x, this.y, this.w, this.h);
          } else {
            dR(this.x, this.y, this.w, this.h, '#8B4513');
          }
          if (this.isIntroCover && this.blink) ctx.globalAlpha = 1.0;
          return;
        }
        for (let i = 0; i < this.count; i++) {
          let dY = this.y, dH = this.h, px = this.x + i * config.platformW;
          let cImg = this.isIcy ? IMG.i30 : IMG.p30;
          if (this.squishTimers[i] > 0) {
            let t = this.squishTimers[i];
            if (t >= 10) { dH = 22; cImg = this.isIcy ? IMG.i22 : IMG.p22; }
            else if (t >= 7) { dH = 14; cImg = this.isIcy ? IMG.i14 : IMG.p14; }
            else if (t >= 4) { dH = 22; cImg = this.isIcy ? IMG.i22 : IMG.p22; }
            dY += (this.h - dH);
          }
          if (cImg.complete && cImg.naturalWidth > 0) ctx.drawImage(cImg, FLR(px), FLR(dY), FLR(config.platformW), FLR(dH));
          else dR(px, dY, config.platformW, dH, '#8B4513');
        }
        if (isDev && game.demoMode && this.blacklisted) {
          ctx.strokeStyle = 'rgba(255,0,0,0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(FLR(this.x - 2), FLR(this.y - 2), FLR(this.w + 4), FLR(this.h + 4));
        }
      }
    }

    class Item {
      init(y) {
        this.w = 16;
        this.h = 16;
        this.y = FLR(y);
        this.collected = false;
        this.blacklisted = false;
        let ol = true, at = 0, nx = 0;
        while (ol && at < 20) {
          nx = RND() * (config.gameWidth - this.w);
          ol = false;
          if (this.y < 230 && this.y > -1500) {
            let avoidW = 28, cx = config.gameWidth / 2;
            if (nx + this.w > cx - avoidW && nx < cx + avoidW) ol = true;
          }
          if (!ol) {
            for (let p of game.platforms) {
              let px = p.x, py = p.y, pw = p.w, ph = p.h;
              if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
              else if (p.type === 'v-slide') { py = p.startY - 50; ph = p.h + 100; }
              if (ABS(p.y - this.y) < this.h + 2 && nx < px + pw + 2 && nx + this.w + 2 > px) { ol = true; break; }
            }
            if (!ol) {
              for (let c of game.coins) {
                if (ABS(this.y - c.y) < this.h + 2 && nx < c.x + c.w + 2 && nx + this.w + 2 > c.x) { ol = true; break; }
              }
            }
          }
          at++;
        }
        this.x = FLR(nx);
      }
      draw() {
        if (this.collected) return;
        dR(this.x + 4, this.y + 8, 8, 8, '#fcc');
        dR(this.x, this.y, 16, 8, '#f33');
        dR(this.x + 2, this.y + 2, 4, 4, '#fff');
        dR(this.x + 10, this.y + 2, 4, 4, '#fff');
        if (isDev && game.demoMode && this.blacklisted) {
          ctx.strokeStyle = 'rgba(255,0,0,0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(FLR(this.x - 2), FLR(this.y - 2), FLR(this.w + 4), FLR(this.h + 4));
        }
      }
    }

    class Coin {
      init(x, y) {
        this.w = 12;
        this.h = 12;
        this.hitW = 20;
        this.hitH = 16;
        this.x = FLR(x);
        this.y = FLR(y);
        this.collected = false;
        this.animTimer = 0;
        this.dead = false;
        this.vy = 0;
      }
      update() {
        if (this.collected && !this.dead) {
          this.animTimer--;
          this.y += this.vy;
          this.vy += 0.3;
          if (this.animTimer <= 0) {
            this.dead = true;
          }
        }
      }
      draw() {
        if (this.dead) return;
        if (!this.collected) {
          dR(this.x + 2, this.y, 8, 12, '#fd0');
          dR(this.x, this.y + 2, 12, 8, '#fd0');
          dR(this.x + 4, this.y + 2, 4, 8, '#ff9');
        } else {
          let p = FLR((30 - this.animTimer) / 3) % 4;
          if (p === 0) {
            dR(this.x + 2, this.y, 8, 12, '#fd0');
            dR(this.x, this.y + 2, 12, 8, '#fd0');
            dR(this.x + 4, this.y + 2, 4, 8, '#ff9');
          } else if (p === 1 || p === 3) {
            dR(this.x + 4, this.y, 4, 12, '#fd0');
            dR(this.x + 2, this.y + 2, 8, 8, '#fd0');
            dR(this.x + 4, this.y + 2, 2, 8, '#ff9');
          } else {
            dR(this.x + 5, this.y, 2, 12, '#fd0');
            dR(this.x + 5, this.y + 2, 2, 8, '#ff9');
          }
        }
      }
    }

    class BackgroundCloud {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = RND() < 0.5 ? 0.6 : 0.8;
        this.scale = this.speed === 0.6 ? 0.5 + RND() * 0.3 : 0.8 + RND() * 0.4;
        this.type = FLR(RND() * 3);
      }
    }

    export const game = {
      state: 'intro',
      isPaused: false,
      demoMode: false,
      aiActive: false,
      isConsecutive: false,
      isBenchmarking: false,
      playTime: 0,
      timerStarted: false,
      shakeAmount: 0,
      introAnimTimer: 0,
      particles: [],
      meteors: [],
      npcs: [],
      birds: [],
      player: new Player(),
      platforms: [],
      items: [],
      coins: [],
      clouds: [],
      stars: [],
      cameraY: 0,
      highestCameraY: 0,
      highestPlayerY: 0,
      score: 0,
      scoreCoin: 0,
      lastCoinY: 0,
      baseScoreY: 0,
      goalY: 0,
      startScore: 0,
      eventLog: [],
      loopCount: 0,
      endReason: null,
      lastScoreId: null,
      lastRank: null,
      lastScoreObj: null,
      allowAutoRank: false,
      clearTime: 0,
      lastUI: '',
      flockDir: 1,
      isNewRecord: false,
      personalBest: null
    };

    let demoState = {
      active: false,
      phase: 'none',
      startTime: 0,
      dist1: 0,
      dist2: 0,
      totalDist: 0,
      containerH: 0,
      fixedTop3Y: 0,
      t3H: 0,
      otH: 0,
      scrollDuration: 110000,
      calculated: false,
      gap: 8
    };

    let lastTime = performance.now();
    let acc = 0;
    let frameDuration = 1000 / config.targetFPS;
    let tM = 4, tS = 0, tDemo = false, loopRunning = false;

    let selMode = function(d, el) {
      tDemo = d;
      document.querySelectorAll('.mode-btn').forEach(b => b.style.borderColor = '#555');
      el.style.borderColor = '#0f0';
    };

    let selHgt = function(s, el) {
      tS = s;
      document.querySelectorAll('.hgt-btn').forEach(b => b.style.borderColor = '#555');
      el.style.borderColor = '#0f0';
    };

    let startWithSettings = function() {
      config.scoreMultiplier = tM;
      game.startScore = tS;
      game.demoMode = tDemo;
      game.isBenchmarking = false;
      $('debugModal').style.display = 'none';
      initGame(false);
      if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(loop);
      }
    };

    async function startBenchmark(runs) {
      $('debugModal').style.display = 'none';
      loopRunning = false;
      ui.style.justifyContent = 'center';
      ui.style.alignItems = 'center';
      ui.style.width = '100%';
      ui.style.height = '100%';
      ui.style.top = '0';
      ui.style.left = '0';
      ui.style.backgroundColor = 'rgba(0,0,0,0.9)';
      ui.style.pointerEvents = 'auto';
      
      let scores = [];
      let fullLogHTML = '';
      let clearTimes = [];
      let endReasons = { CLEAR: 0, TIME_UP: 0, DEATH_FALL: 0 };
      
      game.isBenchmarking = true;
      config.scoreMultiplier = tM;
      game.startScore = tS;
      let clears = 0;
      let totalLoops = 0;
      
      for (let i = 0; i < runs; i++) {
        ui.innerHTML = '<div style="text-align:center;"><h2 style="color:#0f0;font-size:16px;margin-bottom:5px;">BENCHMARKING...</h2><p style="font-size:12px;color:#fff;">RUN ' + (i + 1) + ' / ' + runs + '</p><p style="font-size:10px;color:#aaa;margin-top:10px;">* Skipping rendering for high-speed AI testing</p></div>';
        await new Promise(r => setTimeout(r, 10));
        
        initGame(false);
        game.eventLog = [];
        game.demoMode = true;
        setAuto(true);
        
        let timeout = 0;
        while (game.state !== 'gameover' && game.state !== 'clear' && timeout < 300000) {
          if (game.state === 'playing' || game.state === 'powerup_anim' || game.state === 'powerdown_anim') {
            if (game.timerStarted) game.playTime += frameDuration;
          }
          updatePhysics();
          timeout++;
        }
        
        let sc = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
        scores.push(sc);
        if (sc >= config.goalScore) clears++;
        totalLoops += game.loopCount;
        
        let reason = game.endReason || 'UNKNOWN';
        endReasons[reason] = (endReasons[reason] || 0) + 1;
        if (reason === 'CLEAR') clearTimes.push(game.playTime);
        
        let color = '#aaa';
        if (sc >= config.goalScore) color = '#ff0';
        else if (sc >= 100000) color = '#0ff';
        else if (sc >= 50000) color = '#0f0';
        
        if (sc < 20000 || reason === 'TIME_UP') {
          fullLogHTML += '<div style="color:' + color + '; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;"><b>[Run ' + (i + 1) + '] ' + sc + 'm (' + reason + ')</b><br>' + game.eventLog.join('<br>') + '</div>';
        }
      }
      
      let sum = scores.reduce((a, b) => a + b, 0);
      let avg = FLR(sum / runs);
      let max = MAX(...scores);
      let min = MIN(...scores);
      
      let avgTimeStr = 'N/A';
      if (clearTimes.length > 0) {
        let avgMs = clearTimes.reduce((a, b) => a + b, 0) / clearTimes.length;
        let m = FLR(avgMs / 60000), s = FLR((avgMs % 60000) / 1000);
        avgTimeStr = m + ':' + s.toString().padStart(2, '0');
      }
      
      let summaryText = '[BENCHMARK SUMMARY]<br>Runs: ' + runs + '<br>Avg/Max/Min: ' + avg + 'm / ' + max + 'm / ' + min + 'm<br>Clear Rate: ' + (clears / runs * 100).toFixed(1) + '%<br><span style="color:#0ff">Avg Clear Time: ' + avgTimeStr + '</span><br>End Reasons: CLEAR(' + (endReasons.CLEAR || 0) + ') FALL(' + (endReasons.DEATH_FALL || 0) + ') TIME(' + (endReasons.TIME_UP || 0) + ')<br><br>';
      
      ui.innerHTML = '<div style="text-align:center;background:#111;padding:10px;border:2px solid #fff;border-radius:6px;width:90%;max-width:400px;display:flex;flex-direction:column;gap:5px;"><h2 style="color:#0f0;margin:0;font-size:16px;">BENCHMARK RESULTS</h2><p style="font-size:10px;color:#ddd;margin:0;">Runs: ' + runs + '</p><p style="font-size:16px;color:#ff0;margin:3px 0;font-weight:bold;">Avg: ' + avg + 'm</p><div style="font-size:10px;color:#ccc;display:flex;justify-content:space-around;"><span>Max: ' + max + 'm</span><span>Min: ' + min + 'm</span></div><div style="font-size:10px;color:#0ff;display:flex;justify-content:space-around;margin-top:3px;"><span>Clear Rate: ' + (clears / runs * 100).toFixed(1) + '%</span><span>Loops: ' + totalLoops + '</span></div><div style="width:100%;height:75px;background:#222;font-family:monospace;font-size:8px;border:1px solid #555;padding:3px;box-sizing:border-box;overflow-y:auto;text-align:left; cursor:pointer;" onclick="this.select()" contenteditable="true"><div style="color:#fff;">' + summaryText + '</div>' + fullLogHTML + '</div><button id="db_reload" class="dbg-btn" style="padding:5px;font-size:10px;background:#e60012;border-color:#faa;width:100%;">RELOAD</button></div>';
    }

    function setAuto(isActive) {
      if (!game.demoMode) return;
      game.aiActive = isActive;
      autoBtn.innerText = isActive ? '🤖 ON' : '🤖 OFF';
      autoBtn.style.background = isActive ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)';
      if (isActive) {
        game.player.aiPath = [];
        game.player.visitedHistory = [];
        game.player.stagnationTimer = 0;
        game.player.adventureMode = false;
        game.player.lastPlatform = null;
        inputHandler.active.clear();
        game.player.inputDir = 0;
      }
    }

    function initGame(isConsecutive = false) {
      document.body.classList.remove('game-ended');
      $('tapToStartMsg').style.display = 'none';
      $('tapToStartMsg').innerText = 'TAP TO START';
      game.isConsecutive = isConsecutive;
      game.state = 'intro';
      game.isPaused = false;
      game.playTime = 0;
      game.timerStarted = isConsecutive;
      pScreen.style.display = 'none';
      $('rankingModal').style.display = 'none';
      game.shakeAmount = 0;
      game.flockDir = RND() < 0.5 ? 1 : -1;
      
      if (game.platforms) game.platforms.forEach(p => P_PL.push(p));
      if (game.particles) game.particles.forEach(p => P_PT.push(p));
      if (game.coins) game.coins.forEach(c => P_CN.push(c));
      if (game.birds) game.birds.forEach(b => P_BD.push(b));
      if (game.meteors) game.meteors.forEach(m => P_MT.push(m));
      if (game.items) game.items.forEach(i => P_IT.push(i));
      
      game.particles = [];
      game.meteors = [];
      game.npcs = [];
      game.birds = [];
      
      if (!game.isBenchmarking) {
        for (let i = 0; i < 3; i++) {
          game.npcs.push(new NPC(140 + i * 16, 240 - config.playerSize, (i + 1) * 1000, i));
        }
      }
      
      game.player.reset();
      game.platforms = [];
      game.items = [];
      game.coins = [];
      game.clouds = [];
      game.stars = [];
      game.loopCount = 0;
      game.endReason = null;
      game.lastScoreId = null;
      game.lastRank = null;
      game.lastScoreObj = null;
      game.isNewRecord = false;
      game.personalBest = null;
      game.clearTime = 0;
      game.lastUI = '';
      
      if (!game.isBenchmarking) {
        game.eventLog = [];
        if (!isAttractMode) {
          pBtn.style.display = 'block';
          pBtn.innerText = 'II';
        } else {
          pBtn.style.display = 'none';
        }
      } else {
        pBtn.style.display = 'none';
      }
      
      game.baseScoreY = (240 - config.playerSize) + (game.startScore / config.scoreMultiplier);
      game.player.x = isConsecutive ? 104 : 48;
      game.player.y = 240 - config.playerSize;
      game.goalY = game.baseScoreY - (config.goalScore / config.scoreMultiplier);
      
      let idealCam = MAX(0, game.player.y - config.gameHeight * 0.6);
      game.cameraY = idealCam;
      game.highestCameraY = idealCam;
      game.highestPlayerY = game.player.y;
      game.score = game.startScore;
      game.scoreCoin = 0;
      
      inputHandler.active.clear();
      
      if (game.demoMode) {
        if (isDev && !game.isBenchmarking) autoBtn.style.display = 'block';
        else autoBtn.style.display = 'none';
        if (isAttractMode) {
          if (demoState.active) setAuto(true);
          else setAuto(false);
        } else {
          setAuto(true);
        }
      } else {
        autoBtn.style.display = 'none';
        game.aiActive = false;
      }
      
      let pl1 = getPl(240, 'normal', true, 0, 96, 400);
      pl1.noEffect = true;
      game.platforms.push(pl1);
      
      let pl2 = getPl(240, 'normal', true, 128, config.gameWidth - 128, 400);
      pl2.noEffect = true;
      game.platforms.push(pl2);
      
      if (!isConsecutive) {
        let plCover = getPl(240, 'normal', true, 96, 32, 400);
        plCover.noEffect = true;
        plCover.isIntroCover = true;
        game.platforms.push(plCover);
      }
      
      let pl3 = getPl(416, 'super', false, 104, config.platformW, 32, 1);
      pl3.noEffect = true;
      game.platforms.push(pl3);
      
      let pl4 = getPl(416 + config.platformH, 'normal', true, 0, config.gameWidth, 400);
      pl4.noEffect = true;
      game.platforms.push(pl4);
      
      let sNY = 416 - POW(ABS(config.superJumpPower), 2) / (2 * config.jumpGravity) + 100;
      game.platforms.push(getPl(sNY, 'normal', false, config.gameWidth / 2 - (config.platformW * 9) / 2, null, null, 9, false));
      
      for (let i = 0; i < config.basePlatforms; i++) {
        let py = sNY - 80 - (i * (config.gameHeight / config.basePlatforms));
        let sc = (game.baseScoreY - py) * config.scoreMultiplier;
        let tc = (sc < 20000 && i % 3 === 0) ? MAX(2, 3 - FLR(sc / 8000)) : 1;
        let np = getPl(py, 'normal', false, null, null, null, tc, false);
        game.platforms.push(np);
        trySpawnBirdsOnPlatform(np, sc);
        
        if (sc < 20000) {
          let np2 = getPl(py + (RND() * 40 - 20), 'normal', false, null, null, null, MAX(1, tc), false);
          if (np2.isOverlapping) {
            P_PL.push(np2);
          } else {
            game.platforms.push(np2);
            trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
          }
        } else if (sc < 52000) {
          if (RND() < (1 - (sc - 20000) / 32000) * 0.7) {
            let np2 = getPl(py + (RND() * 40 - 20), 'normal', false, null, null, null, MAX(1, tc - 1), false);
            if (np2.isOverlapping) {
              P_PL.push(np2);
            } else {
              game.platforms.push(np2);
              trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
            }
          }
        }
      }
      
      for (let i = 0; i < 60; i++) {
        game.stars.push({
          x: RND() * config.gameWidth,
          y: RND() * config.gameHeight,
          size: RND() < 0.2 ? 2 : 1,
          speed: 0.01,
          blink: 0.001 + RND() * 0.003
        });
      }
      
      let cCount = FLR(200 / config.scoreMultiplier);
      for (let i = 0; i < cCount; i++) {
        let ts = 1000 + RND() * 49000;
        let cy = game.baseScoreY - (ts / config.scoreMultiplier);
        game.clouds.push(new BackgroundCloud(RND() * config.gameWidth, cy));
      }
      
      let bC = 8 + FLR(RND() * 7);
      for (let i = 0; i < bC; i++) {
        let bX = RND() < 0.5 ? 35 + RND() * 40 : 145 + RND() * 40;
        game.birds.push(getBd(0, bX, 95, true, null, true));
      }
      
      game.clouds.sort((a, b) => a.speed - b.speed);
      game.lastCoinY = 0;
      lastTime = performance.now();
      acc = 0;
      
      if (isAttractMode && !demoState.active) $('tapToStartMsg').style.display = 'block';
    }

    function spawnGuideCoins(sX, sY) {
      sX = MAX(35, MIN(config.gameWidth - 35, sX));
      let tp = FLR(RND() * 3), top = sY;
      if (tp === 0) {
        for (let i = 0; i < 10; i++) game.coins.push(getCn(sX, sY - i * 72));
        top = sY - 9 * 72;
      } else if (tp === 1) {
        let d = RND() < 0.5 ? 1 : -1;
        for (let i = 0; i < 10; i++) {
          let cx = MAX(10, MIN(config.gameWidth - 22, sX + SIN(i * 0.15) * 75 * d));
          game.coins.push(getCn(cx, sY - i * 72));
          top = sY - 9 * 72;
        }
      } else {
        for (let i = 0; i < 10; i++) {
          game.coins.push(getCn(sX - 14, sY - i * 72));
          game.coins.push(getCn(sX + 14, sY - i * 72));
          top = sY - 9 * 72;
        }
      }
      game.lastCoinY = top;
    }

    function spawnCoins(y) {
      let pR = config.coinSpawnProb;
      if (game.score >= 120000 && game.score <= 135000) pR = 0.8;
      if (RND() > pR) return;
      
      let tp = FLR(RND() * 3);
      if (game.score >= 120000 && game.score <= 135000) tp = RND() < 0.5 ? 1 : 2;
      
      let bw = 12, bh = 12;
      if (tp === 0) bh = 108;
      else if (tp === 1) { bw = 36; bh = 36; }
      else { bw = 132; bh = 72; }
      
      for (let a = 0; a < 5; a++) {
        let cx = 10 + RND() * (config.gameWidth - 20 - bw), cy = y - 100 - RND() * 100, ol = false;
        if (cy < 230 && cy > -1500) {
          let avoidW = 28, centerX = config.gameWidth / 2;
          if (cx + bw > centerX - avoidW && cx < centerX + avoidW) ol = true;
        }
        if (!ol) {
          for (let p of game.platforms) {
            if (p.broken) continue;
            let px = p.x, py = p.y, pw = p.w, ph = p.h;
            if (p.type === 'h-slide') { px = p.startX - config.gameWidth / 6; pw = p.w + config.gameWidth / 3; }
            else if (p.type === 'v-slide') { py = p.startY - 50; ph = p.h + 100; }
            if (cx - 20 < px + pw && cx + bw + 20 > px && cy - 20 < py + ph && cy + bh + 20 > py) { ol = true; break; }
          }
        }
        if (!ol) {
          for (let i of game.items) {
            if (cx - 20 < i.x + i.w && cx + bw + 20 > i.x && cy - 20 < i.y + i.h && cy + bh + 20 > i.y) { ol = true; break; }
          }
        }
        if (!ol) {
          for (let c of game.coins) {
            if (cx - 20 < c.x + c.w && cx + bw + 20 > c.x && cy - 20 < c.y + c.h && cy + bh + 20 > c.y) { ol = true; break; }
          }
        }
        if (ol) continue;
        
        if (tp === 0) {
          for (let i = 0; i < 5; i++) game.coins.push(getCn(cx, cy + i * 24));
        } else if (tp === 1) {
          for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) game.coins.push(getCn(cx + i * 24, cy + j * 24));
          }
        } else {
          let d = cx > config.gameWidth / 2 ? -1 : 1;
          for (let i = 0; i < 5; i++) game.coins.push(getCn(MAX(0, MIN(config.gameWidth - 12, cx + i * 30 * d)), cy - SIN((i / 4) * PI) * 60 + 60));
        }
        game.lastCoinY = cy - bh;
        break;
      }
    }

    function spawnPlatform() {
      let lP = game.platforms[game.platforms.length - 1];
      if (lP && lP.type === 'goal') return;
      
      let gap = 50 + RND() * (MIN(80, 50 + game.score / 100) - 50);
      if (lP && lP.count > 1) gap += 30;
      if (lP && lP.type === 'super') gap += 80;
      let y = lP.y - gap;
      
      if (y <= game.goalY + 170) {
        game.platforms.push(getPl(game.goalY + 170, 'normal', false, null, null, null, 1, true));
        game.platforms.push(getPl(game.goalY + 85, 'normal', false, null, null, null, 1, true));
        game.platforms.push(getPl(game.goalY, 'goal', false, 0, config.gameWidth, 32));
        return;
      }
      
      let spS = (game.baseScoreY - y) * config.scoreMultiplier;
      let t = 'normal', r = RND(), c = 1, icy = false;
      let isFinalStairs = (spS >= 140000);
      let isDarkBeforeFinal = (spS >= 135000 && spS < 140000);
      
      if (isFinalStairs) {
        icy = true;
      } else if (isDarkBeforeFinal) {
        icy = true;
      } else if (spS < 20000) {
        c = RND() < 0.25 ? MAX(2, 3 - FLR(spS / 6000)) : 1;
        if (r < 0.10) t = 'super';
      } else if (spS < 52000) {
        if (r < 0.15) t = 'super';
        else if (r < 0.30) t = 'h-slide';
        else if (r < 0.40) t = 'v-slide';
      } else if (spS < 55000) {
        if (r < 0.40) t = 'super';
        else if (r < 0.60) t = 'h-slide';
        else if (r < 0.70) t = 'v-slide';
      } else if (spS < 80000) {
        icy = r < 0.05;
        let r2 = RND();
        if (!icy && r2 < 0.05) t = 'super';
        else if (!icy && r2 < 0.25) t = 'h-slide';
      } else if (spS < 120000) {
        icy = r < 0.25;
        if (!icy && RND() < 0.15) t = 'h-slide';
      } else if (spS < 135000) {
        icy = r < 0.35;
        let r2 = RND();
        if (!icy) {
          if (r2 < 0.40) t = 'h-slide';
          else if (r2 < 0.60) t = 'v-slide';
        }
      }
      
      if (icy) t = 'normal';
      if (t === 'super') c = 1;
      
      let np = getPl(y, t, false, null, null, null, c, icy);
      game.platforms.push(np);
      
      let genSub = false, subIcy = false, subT = 'normal', subC = 1;
      if (spS < 20000 && t !== 'super') {
        genSub = true;
        subC = MAX(1, c);
      } else if (spS < 52000 && t !== 'super') {
        if (RND() < (1 - (spS - 20000) / 32000) * 0.7) {
          genSub = true;
          subC = MAX(1, c - 1);
        }
      } else if (spS >= 80000 && spS <= 105000 && t !== 'super') {
        if (RND() < 0.7) {
          genSub = true;
          subC = 1;
          subIcy = RND() < 0.5;
        }
      } else if (isDarkBeforeFinal) {
        if (RND() < 0.40) {
          genSub = true;
          subIcy = true;
        }
      }
      
      if (genSub) {
        let np2 = getPl(y, subT, false, null, null, null, subC, subIcy);
        if (np2.isOverlapping) {
          P_PL.push(np2);
        } else {
          game.platforms.push(np2);
          trySpawnBirdsOnPlatform(np2, (game.baseScoreY - np2.y) * config.scoreMultiplier);
        }
      }
      
      let hasM = false, mx = 0, my = 0;
      if (config.itemsEnabled && game.score >= config.mushroomMinScore && spS < 120000 && RND() < config.mushroomSpawnProb) {
        let it = getIt(y - 50 - RND() * 150);
        game.items.push(it);
        hasM = true;
        mx = it.x;
        my = it.y;
      }
      
      let sc = false, cD = (game.score >= 120000 && game.score <= 135000) ? 0.3 : config.coinMinDistance;
      if (y - 300 < game.lastCoinY - config.gameHeight * cD) {
        if (t === 'super' && RND() < 0.5) {
          spawnGuideCoins(np.x + np.w / 2 - 6, y - 60);
          sc = true;
        } else if (hasM && RND() < 0.5) {
          spawnGuideCoins(mx + 2, my - 60);
          sc = true;
        }
        if (!sc) spawnCoins(y);
      }
      trySpawnBirdsOnPlatform(np, spS);
    }

    function evaluatePath(path, entity) {
      let score = 0;
      let finalNode = path[path.length - 1];
      let expectedJump = config.jumpPower;
      
      if (finalNode.collected !== undefined) expectedJump = config.superJumpPower * 1.2;
      else if (finalNode.isGlowing) expectedJump = config.superJumpPower * config.glowingMovingJumpMultiplier;
      else if (finalNode.type === 'super') expectedJump = config.superJumpPower;
      else if (finalNode.type === 'h-slide' || finalNode.type === 'v-slide') expectedJump = config.jumpPower * config.movingPlatformJumpMultiplier;
      
      let heightGain = (expectedJump * expectedJump) / (2 * config.jumpGravity);
      let projectedApex = finalNode.y - heightGain;
      score += (entity.y - projectedApex) * 15;
      
      let px = entity.x + entity.w / 2;
      let n0x = path[0].x + (path[0].w || 16) / 2;
      let d0 = ABS(px - n0x);
      if (d0 > config.gameWidth / 2) d0 = config.gameWidth - d0;
      score -= d0 * 1.5;
      
      for (let i = 0; i < path.length; i++) {
        let pn = path[i];
        if (pn.isIcy) score -= 50;
        let stepY = i > 0 ? (path[i - 1].y - pn.y) : (entity.y - pn.y);
        if (stepY < 10) score -= 500;
        if (entity.visitedHistory.includes(pn)) score -= 500000;
        if (pn.collected !== undefined) score += 2000;
        
        if (i > 0) {
          let prNx = path[i - 1].x + (path[i - 1].w || 16) / 2;
          let crNx = pn.x + (pn.w || 16) / 2;
          let pd = ABS(crNx - prNx);
          if (pd > config.gameWidth / 2) pd = config.gameWidth - pd;
          score -= pd * 0.5;
        }
      }
      return score;
    }

    function searchPaths(currentNode, allNodes, depth, currentPath, allPaths) {
      currentPath.push(currentNode);
      if (depth === 0) {
        allPaths.push([...currentPath]);
      } else {
        let maxH = 100;
        if (currentNode.type === 'super' || currentNode.collected !== undefined) maxH = 750;
        else if (currentNode.isGlowing) maxH = 1680;
        else if (currentNode.type === 'h-slide' || currentNode.type === 'v-slide') maxH = 225;
        
        let nextMoves = [];
        for (let n of allNodes) {
          if (n === currentNode) continue;
          let dy = currentNode.y - n.y;
          let limit = (n.collected !== undefined) ? maxH : maxH - 2;
          if (dy > 10 && dy <= limit) {
            let dx = ABS((currentNode.x + (currentNode.w || 16) / 2) - (n.x + (n.w || 16) / 2));
            let isLoop = false;
            if (dx > config.gameWidth / 2) {
              dx = config.gameWidth - dx;
              isLoop = true;
            }
            let maxDx = (limit > 200) ? 120 : 80;
            if (dx <= maxDx) nextMoves.push(n);
          }
        }
        
        if (nextMoves.length > 5) {
          nextMoves.sort(function(a, b) { return a.y - b.y; });
          nextMoves = nextMoves.slice(0, 5);
        }
        
        if (nextMoves.length === 0) {
          allPaths.push([...currentPath]);
        } else {
          for (let n of nextMoves) {
            if (!currentPath.includes(n)) searchPaths(n, allNodes, depth - 1, currentPath, allPaths);
          }
        }
      }
      currentPath.pop();
    }

    function runAI(entity) {
      let px = entity.x + entity.w / 2;
      let py = entity.y;
      let isIntroState = (entity.isNPC && entity.isIntro) || (entity === game.player && game.state === 'intro');
      
      if (isIntroState) {
        if (px < 104) entity.inputDir = 1;
        else if (px > 120) entity.inputDir = -1;
        else entity.inputDir = 0;
        return;
      }
      
      if (entity.vy > 1.5 && !entity.isSuperJumping) {
        let bT = null, bS = Infinity;
        for (let p of game.platforms) {
          if (!p.broken && !p.blacklisted && p.y > py && p.y < py + config.gameHeight) {
            let pxC = p.x + (p.w || 16) / 2, dX = ABS(pxC - px);
            if (dX > config.gameWidth / 2) { dX = config.gameWidth - dX; }
            if (dX <= 80 + (p.y - py) * 0.35) {
              let s = dX + (p.y - py) * 0.4;
              if (s < bS) { bS = s; bT = p; }
            }
          }
        }
        if (bT) {
          let tx = bT.x + (bT.w ? bT.w / 2 : 8);
          if (bT.type === 'h-slide') tx += bT.direction * 20;
          let dx = tx - px;
          if (dx > config.gameWidth / 2) dx -= config.gameWidth;
          else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
          entity.inputDir = dx > 4 ? 1 : (dx < -4 ? -1 : 0);
          entity.aiPath = [bT];
          return;
        }
      }
      
      let dodging = false;
      if (entity.isPoweredUp || entity.vy < -10) {
        for (let m of game.meteors) {
          if (!m.hit && m.y < py + 40 && m.y > py - 100) {
            let dx = (m.x + m.w / 2) - px;
            if (dx > config.gameWidth / 2) dx -= config.gameWidth;
            else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
            if (ABS(dx) < 24) {
              entity.inputDir = dx > 0 ? -1 : 1;
              dodging = true;
              break;
            }
          }
        }
      }
      if (dodging) return;
      
      if (py < entity.highestReachedY - 5) {
        entity.highestReachedY = py;
        entity.stagnationTimer = 0;
      } else {
        entity.stagnationTimer += (entity.isNPC ? 3 : 1);
      }
      
      if (entity.stagnationTimer > 180) {
        if (!entity.adventureMode) {
          entity.adventureMode = true;
          entity.aiPath = [];
          if (entity === game.player) {
            let dump = "px:" + FLR(px) + ",py:" + FLR(py) + " | ";
            game.platforms.forEach(function(p) {
              if (!p.broken && p.y < py + 150 && p.y > py - 250) dump += "P(" + FLR(p.x - px) + "," + FLR(p.y - py) + "," + p.type.charAt(0) + (p.isIcy ? "i" : "") + ") ";
            });
            game.items.forEach(function(i) {
              if (!i.collected && i.y < py + 150 && i.y > py - 250) dump += "I(" + FLR(i.x - px) + "," + FLR(i.y - py) + ") ";
            });
            logAIEvent('STUCK_DUMP', dump);
            logAIEvent('ADV_START', 'vy:' + entity.vy.toFixed(1));
          }
        }
        let tP = null, mD = Infinity;
        for (let p of game.platforms) {
          if (!p.broken && !p.blacklisted && !entity.visitedHistory.includes(p) && p.y > py && p.y < py + config.gameHeight - 10 && p !== entity.lastPlatform) {
            let pC = p.x + (p.w || 16) / 2, dX = ABS(pC - px);
            if (dX > config.gameWidth / 2) dX = config.gameWidth - dX;
            let sc = dX + (p.y - py) * 2;
            if (sc < mD) { mD = sc; tP = p; }
          }
        }
        if (tP) {
          let tx = tP.x + (tP.w ? tP.w / 2 : 8);
          if (tP.type === 'h-slide') tx += tP.direction * 20;
          let dx = tx - px;
          if (dx > config.gameWidth / 2) dx -= config.gameWidth;
          else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
          entity.inputDir = dx > 4 ? 1 : (dx < -4 ? -1 : 0);
        } else {
          entity.inputDir = (px < 40) ? 1 : (px > config.gameWidth - 40) ? -1 : (entity.facingRight ? 1 : -1);
        }
        return;
      }
      
      let needsRecalc = false;
      if (entity.aiPath.length === 0) {
        needsRecalc = true;
      } else {
        let target = entity.aiPath[0];
        if (target.broken || target.y > py + config.gameHeight + 100 || target.blacklisted) needsRecalc = true;
        if (entity.vy > 0 && py > target.y + 20) needsRecalc = true;
        if (entity.vy < 0 && py < target.y - 100) needsRecalc = true;
      }
      
      let hasSuperTarget = entity.aiPath.length > 0 && (entity.aiPath[0].type === 'super' || entity.aiPath[0].isGlowing || entity.aiPath[0].collected !== undefined);
      
      if (entity.vy < 0) {
        entity.apexRecalculated = false;
      } else if (entity.vy >= 0 && !entity.apexRecalculated) {
        if (!hasSuperTarget) needsRecalc = true;
        entity.apexRecalculated = true;
      }
      
      if (needsRecalc) {
        let validNodes = [];
        game.platforms.forEach(function(p) {
          if (!p.broken && !p.isGround && !p.blacklisted && p.y < py + config.gameHeight && p.y > py - 600) validNodes.push(p);
        });
        game.items.forEach(function(i) {
          if (!i.collected && !i.blacklisted && i.y < py + config.gameHeight && i.y > py - 600) validNodes.push(i);
        });
        
        let firstMoves = [];
        let peakY = py;
        if (entity.vy < 0) peakY = py - (entity.vy * entity.vy) / (2 * config.jumpGravity);
        
        for (let n of validNodes) {
          let isSup = (n.type === 'super' || n.isGlowing || n.collected !== undefined);
          let minReqY = isSup ? peakY - 30 : peakY + 14;
          if (n.y >= minReqY && n.y <= py + 300) firstMoves.push(n);
        }
        
        let allPaths = [];
        let searchDepth = (validNodes.length < 8 || entity.stagnationTimer > 80) ? 4 : 2;
        
        for (let fm of firstMoves) {
          searchPaths(fm, validNodes, searchDepth, [], allPaths);
        }
        
        let bestPath = null;
        let bestScore = -Infinity;
        for (let path of allPaths) {
          let score = evaluatePath(path, entity);
          if (score > bestScore) {
            bestScore = score;
            bestPath = path;
          }
        }
        entity.aiPath = bestPath || [];
      }
      
      if (entity.aiPath.length > 0) {
        let target = entity.aiPath[0];
        let tx = target.x + (target.w ? target.w / 2 : 8);
        if (target.type === 'h-slide') tx += target.direction * (ABS(target.y - py) / 2.5);
        
        let isSupTgt = (target.type === 'super' || target.isGlowing || target.collected !== undefined);
        
        if (target.y > py + 20 && entity.lastPlatform && !entity.isSuperJumping && py < entity.lastPlatform.y + 20 && py > entity.lastPlatform.y - 80 && !isSupTgt) {
          let lp = entity.lastPlatform;
          let dL = ABS(px - lp.x), dR = ABS(px - (lp.x + lp.w));
          tx = (dL < dR) ? lp.x - 12 : lp.x + lp.w + 12;
        } else if (entity.lastPlatform && target.y > entity.lastPlatform.y + 10 && entity.stagnationTimer > 30 && py < entity.lastPlatform.y + 16 && py > entity.lastPlatform.y - 60 && entity.lastPlatform.type !== 'super' && entity.vy >= 9) {
          let lpC = entity.lastPlatform.x + (entity.lastPlatform.w / 2);
          let dist = px - lpC;
          if (dist > config.gameWidth / 2) dist -= config.gameWidth;
          else if (dist < -config.gameWidth / 2) dist += config.gameWidth;
          tx += (dist >= 0 ? 1 : -1) * MIN((entity.stagnationTimer - 30) * 2, 80);
        }
        
        let dx = tx - px;
        if (dx > config.gameWidth / 2) dx -= config.gameWidth;
        else if (dx < -config.gameWidth / 2) dx += config.gameWidth;
        
        let avoiding = false;
        if (entity.vy > 0 && target.y > py + 20 && target.collected === undefined) {
          let hObs = null, oY = Infinity;
          for (let p of game.platforms) {
            if (!p.broken && p !== target && p.y > py + 10 && p.y < target.y - 10) {
              let pC = p.x + (p.w || 16) / 2;
              let dXP = px - pC;
              if (dXP > config.gameWidth / 2) dXP -= config.gameWidth;
              else if (dXP < -config.gameWidth / 2) dXP += config.gameWidth;
              let halfW = (p.w || 16) / 2 + 10;
              if (ABS(dXP) < halfW) {
                if (p.y < oY) {
                  oY = p.y;
                  hObs = p;
                }
              }
            }
          }
          if (hObs) {
            let pC = hObs.x + (hObs.w || 16) / 2;
            let dXP = px - pC;
            if (dXP > config.gameWidth / 2) dXP -= config.gameWidth;
            else if (dXP < -config.gameWidth / 2) dXP += config.gameWidth;
            entity.inputDir = dXP >= 0 ? 1 : -1;
            avoiding = true;
          }
        }
        
        if (!avoiding) {
          if (dx > 4) entity.inputDir = 1;
          else if (dx < -4) entity.inputDir = -1;
          else entity.inputDir = 0;
        }
      } else {
        let tDir = 0, fTgt = false;
        if (entity.vy > 0) {
          let tgt = null, bD = Infinity;
          for (let p of game.platforms) {
            if (!p.broken && !p.isGround && !p.blacklisted && p.y > py && p.y < py + config.gameHeight - 20) {
              let pxC = p.x + (p.w || 16) / 2, dX = ABS(pxC - px);
              if (dX > config.gameWidth / 2) dX = config.gameWidth - dX;
              let s = (p.y - py) + dX * 3;
              if (s < bD) { bD = s; tgt = p; }
            }
          }
          if (tgt) {
            fTgt = true;
            let tx = tgt.x + (tgt.w || 16) / 2, dX = tx - px;
            if (dX > config.gameWidth / 2) dX -= config.gameWidth;
            else if (dX < -config.gameWidth / 2) dX += config.gameWidth;
            tDir = dX > 4 ? 1 : (dX < -4 ? -1 : 0);
          }
        }
        if (!fTgt && tDir === 0) tDir = entity.facingRight ? 1 : -1;
        entity.inputDir = tDir;
      }
    }

    function updatePhysics() {
      for (let i = game.particles.length - 1; i >= 0; i--) {
        let pt = game.particles[i];
        pt.update();
        if (pt.life <= 0) {
          P_PT.push(pt);
          game.particles.splice(i, 1);
        }
      }
      
      if (game.state === 'powerup_anim') {
        game.player.animTimer--;
        if (game.player.animTimer < 0) {
          game.state = 'playing';
          game.player.isPoweredUp = true;
          game.player.h = config.playerSize * 2;
          game.player.y = game.player.baseY - config.playerSize;
          game.player.jump(config.superJumpPower);
        }
      } else if (game.state === 'powerdown_anim') {
        game.player.animTimer--;
        if (game.player.animTimer < 0) {
          game.state = 'playing';
          game.player.h = config.playerSize;
          game.player.y = game.player.baseY + config.playerSize - 1;
          if (game.player.savedVy !== undefined) {
            game.player.vy = game.player.savedVy;
            game.player.savedVy = undefined;
            if (game.player.savedVx !== undefined) {
              game.player.vx = game.player.savedVx;
              game.player.savedVx = undefined;
            }
          } else {
            game.player.jump(config.superJumpPower);
          }
        }
      } else if (game.state === 'clear') {
        game.player.inputDir = 0;
        game.player.update();
        if (game.player.y + game.player.h >= game.goalY) {
          game.player.y = game.goalY - game.player.h;
          game.player.vy = 0;
        }
      } else if (game.state === 'intro_anim') {
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.inputDir = 0;
        game.player.history.unshift({ x: game.player.x, y: game.player.y, dir: game.player.facingRight });
        if (game.player.history.length > 4) game.player.history.pop();
        
        game.introAnimTimer--;
        let cover = game.platforms.find(p => p.isIntroCover);
        if (cover) cover.blink = (FLR(game.introAnimTimer / 4) % 2 === 0);
        
        if (game.introAnimTimer < 60 && game.introAnimTimer > 0 && game.introAnimTimer % 4 === 0) {
          game.shakeAmount = 0;
        }
        
        if (game.introAnimTimer <= 0) {
          if (cover) {
            cover.isCrumbling = true;
          }
          game.shakeAmount = 0;
          game.state = 'intro';
        }
      } else if (game.state !== 'gameover') {
        if (game.demoMode && game.aiActive && (game.state === 'playing' || game.state === 'intro')) runAI(game.player);
        game.player.update();
        
        for (let i = game.birds.length - 1; i >= 0; i--) {
          let b = game.birds[i];
          b.update();
          if (b.y > game.cameraY + config.gameHeight + 100 || b.y < game.cameraY - 1000 || b.x < -50 || b.x > config.gameWidth + 50) {
            P_BD.push(b);
            game.birds.splice(i, 1);
          }
        }
        
        if (game.score > game.startScore + 1000 && game.score < 52000) {
          if (RND() < 0.012 && game.birds.filter(b => b.type === 2).length < 1) {
            let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
            let startX = dir === 1 ? -20 : config.gameWidth + 20;
            game.birds.push(getBd(2, startX, game.cameraY + 50 + RND() * (config.gameHeight * 0.5), false));
          }
          if (game.score >= 40000 && RND() < 0.02) {
            let bt = RND() < 0.8 ? 0 : 1;
            let num = 2 + FLR(RND() * 3);
            let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
            let startX = dir === 1 ? -20 : config.gameWidth + 20;
            let startY = game.cameraY + RND() * config.gameHeight;
            for (let j = 0; j < num; j++) {
              game.birds.push(getBd(bt, startX + (RND() - 0.5) * 20, startY + (RND() - 0.5) * 20, false));
            }
          }
        }
        
        for (let i = game.npcs.length - 1; i >= 0; i--) {
          let npc = game.npcs[i];
          npc.update();
          if (npc.y > 1500) {
            game.npcs.splice(i, 1);
            continue;
          }
          if (npc.stagnationTimer > 1800 && npc.y > game.cameraY + config.gameHeight) {
            game.npcs.splice(i, 1);
            continue;
          }
          if (!npc.active) continue;
          
          if (game.state === 'playing' && !(game.player.hitTimer > 0) && !(npc.hitTimer > 0) && game.player.x < npc.x + npc.w && game.player.x + game.player.w > npc.x && game.player.y < npc.y + npc.h && game.player.y + game.player.h > npc.y) {
            let pStomp = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= npc.y + npc.h * 0.5);
            let nStomp = (npc.vy > 0 && (npc.y + npc.h - npc.vy) <= game.player.y + game.player.h * 0.5);
            
            if (pStomp) {
              game.player.y = npc.y - game.player.h;
              game.player.jump(config.jumpPower * 0.8);
              npc.vy = -3;
              npc.vx = npc.x > game.player.x ? 2 : -2;
              npc.hitTimer = 20;
              spawnParticles(npc.x + npc.w / 2, npc.y, '#fff', 5, 2);
            } else if (nStomp) {
              npc.y = game.player.y - npc.h;
              npc.jump(config.jumpPower * 0.8);
              game.player.vy = -3;
              game.player.vx = game.player.x > npc.x ? 2 : -2;
              game.player.hitTimer = 20;
              game.shakeAmount = 4;
              spawnParticles(game.player.x + game.player.w / 2, game.player.y, '#fff', 5, 2);
            }
          }
          
          let onG = false;
          if (npc.isIntro && npc.vy > 0) {
            game.platforms.forEach(p => {
              if (p.isGround && p.y === 240 && npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + 15) {
                npc.y = p.y - npc.h;
                npc.vy = 0;
                onG = true;
              }
            });
          }
          
          if (!onG && npc.vy > 0) {
            game.platforms.forEach(p => {
              if (p.broken || p.isCrumbling) return;
              if (npc.isIntro && p.isGround) return;
              if (npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + p.h + npc.vy) {
                if (p.type === 'goal') {
                  npc.y = p.y - npc.h;
                  npc.vy = -npc.vy * 0.1;
                  if (game.state === 'playing') {
                    game.state = 'gameover';
                    document.body.classList.add('game-ended');
                    game.endReason = 'NPC_CLEAR';
                    game.clearTime = game.playTime;
                    game.shakeAmount = 0;
                    if (!isAttractMode) {
                      pBtn.style.display = 'none';
                      autoBtn.style.display = 'none';
                    }
                    $('tapToStartMsg').style.display = 'none';
                    ignoreNextTap = true;
                    spawnParticles(npc.x + npc.w / 2, p.y, '#f00', 5);
                    let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
                    (async () => {
                      await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'NPC_CLEAR');
                      if (!game.isBenchmarking) {
                        setTimeout(() => {
                          if (game.state === 'gameover') {
                            if (!isAttractMode) RankingAPI.show('gameover');
                            else {
                              ignoreNextTap = false;
                              $('tapToStartMsg').style.display = 'block';
                            }
                          }
                        }, 500);
                      }
                    })();
                    if (game.demoMode && !game.isBenchmarking && !isAttractMode) {
                      setTimeout(function() {
                        if (game.state === 'gameover') initGame(false);
                      }, 5000);
                    }
                  }
                  return;
                }
                
                if (npc.isIntro && !p.isGround) npc.isIntro = false;
                
                if (p.y < npc.highestReachedY - 5) {
                  npc.highestReachedY = p.y;
                  npc.visitedHistory = [];
                  npc.stagnationTimer = 0;
                  npc.adventureMode = false;
                  npc.sameBounceCount = 0;
                } else {
                  npc.stagnationTimer++;
                }
                
                npc.y = p.y - npc.h;
                let ap = config.jumpPower;
                if (p.isGlowing) ap = config.superJumpPower * config.glowingMovingJumpMultiplier;
                else if (p.type === 'super') ap = config.superJumpPower;
                else if (p.type === 'h-slide' || p.type === 'v-slide') ap = config.jumpPower * config.movingPlatformJumpMultiplier;
                
                if (npc.aiPath.length > 0 && npc.aiPath[0] === p) npc.aiPath.shift();
                
                if (npc.lastPlatform === p) {
                  npc.sameBounceCount++;
                  if (npc.sameBounceCount > 4) {
                    p.blacklisted = true;
                    if (npc.aiPath.length > 0) npc.aiPath[0].blacklisted = true;
                    npc.aiPath = [];
                    npc.sameBounceCount = 0;
                  }
                } else {
                  npc.sameBounceCount = 0;
                  npc.lastPlatform = p;
                }
                
                if (ap <= config.superJumpPower) {
                  npc.stagnationTimer = 0;
                  npc.adventureMode = false;
                }
                if (!npc.visitedHistory.includes(p)) npc.visitedHistory.push(p);
                
                let seg = FLR((npc.x + npc.w / 2 - p.x) / config.platformW);
                if (seg < 0) seg = 0;
                if (seg >= p.count) seg = p.count - 1;
                p.squishTimers[seg] = 12;
                p.breakOnSquish[seg] = true;
                npc.squatTimer = 3;
                if (!p.isIcy && !p.noEffect) spawnParticles(npc.x + npc.w / 2, p.y, '#ccc', 3);
                npc.isSparkleJumping = (p.type === 'super' || p.isGlowing) && !p.noEffect;
                npc.jump(ap);
              }
            });
          }
        }
        
        if (game.state !== 'intro' && game.state !== 'intro_anim') {
          if (game.player.y < game.goalY - 120) {
            game.player.y = game.goalY - 120;
            if (game.player.vy < 0) game.player.vy = 0;
          }
          if (game.player.y < game.goalY && game.player.vy > 1.5) game.player.vy = 1.5;
        }
        
        game.platforms.forEach(function(p) { p.update(); });
        
        for (let i = game.meteors.length - 1; i >= 0; i--) {
          let m = game.meteors[i];
          m.update();
          if (m.y > game.cameraY + config.gameHeight + 100) {
            P_MT.push(m);
            game.meteors.splice(i, 1);
          } else if (game.state === 'playing' && !(game.player.hitTimer > 0) && game.player.x < m.x + m.w && game.player.x + game.player.w > m.x && game.player.y < m.y + m.h && game.player.y + game.player.h > m.y) {
            let isStomping = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= m.y + m.h * 0.5);
            if (isStomping) {
              m.hitTimer = 60;
              game.player.y = m.y - game.player.h;
              game.player.jump(config.jumpPower * 0.8);
              if (game.demoMode && game.aiActive) {
                game.player.highestReachedY = m.y;
                game.player.visitedHistory = [];
                game.player.stagnationTimer = 0;
                game.player.adventureMode = false;
                game.player.aiPath = [];
              }
              spawnParticles(m.x + m.w / 2, m.y, '#fff', 15, 4);
            } else {
              if (m.hitTimer > 0) continue;
              m.hitTimer = 60;
              if (game.demoMode && game.aiActive) game.player.aiPath = [];
              if (game.player.isPoweredUp) {
                game.player.history = [];
                game.player.savedVy = game.player.vy;
                game.player.savedVx = game.player.vx;
                game.player.isPoweredUp = false;
                game.state = 'powerdown_anim';
                game.player.animTimer = 48;
                game.player.baseY = game.player.y;
              } else {
                game.player.vy = 0;
                game.player.vx = game.player.x < m.x ? -1.5 : 1.5;
                game.shakeAmount = m.isLarge ? 8 : 4;
              }
            }
          }
        }
        
        if (game.score >= 80000 && game.score <= 120000 && game.state === 'playing') {
          let dF = (game.score - 80000) / 40000;
          let mM = dF < 0.33 ? 1 : (dF < 0.66 ? 2 : 3);
          if (game.meteors.length < mM && RND() < (0.015 + dF * 0.015) * config.scoreMultiplier) {
            game.meteors.push(getMt(10 + RND() * (config.gameWidth - 40), game.cameraY - 40, (RND() - 0.5) * 1.0, 0.8 + dF * 0.7));
          }
        }
        
        if (game.state === 'intro') {
          let plX = game.player.x, plW = game.player.w, onG = false;
          if (game.player.vy > 0) {
            game.platforms.forEach(function(p) {
              if (p.isGround && p.y === 240 && plX + plW > p.x && plX < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + 15) {
                game.player.y = p.y - game.player.h;
                game.player.vy = 0;
                onG = true;
                if (!game.timerStarted && !game.demoMode) {
                  game.timerStarted = true;
                  game.playTime = 0;
                }
              }
            });
          }
          if (!game.isConsecutive && onG) {
            let cover = game.platforms.find(p => p.isIntroCover && !p.broken);
            if (cover) {
              let pcX = plX + plW / 2;
              if (pcX >= 106 && pcX <= 118) {
                game.state = 'intro_anim';
                game.introAnimTimer = 60;
                game.player.vx = 0;
                game.player.inputDir = 0;
                game.player.savedIntroImg = (FLR(performance.now() / 100) % 3) === 0 ? IMG.wlk1 : ((FLR(performance.now() / 100) % 3) === 1 ? IMG.wlk2 : IMG.wlk3);
                inputHandler.active.clear();
                inputHandler.update();
              }
            }
          }
          if (!onG) {
            game.platforms.forEach(function(p) {
              if (!p.isGround && !p.broken && plX + plW > p.x && plX < p.x + p.w && game.player.y + game.player.h > p.y && game.player.y + game.player.h < p.y + p.h + game.player.vy) {
                game.player.y = p.y - game.player.h;
                let seg = FLR((plX + plW / 2 - p.x) / config.platformW);
                if (seg < 0) seg = 0;
                if (seg >= p.count) seg = p.count - 1;
                p.squishTimers[seg] = 12;
                p.breakOnSquish[seg] = true;
                game.player.squatTimer = 3;
                game.player.jump(config.superJumpPower);
                game.player.isSparkleJumping = false;
                if (!p.noEffect) spawnParticles(game.player.x + plW / 2, p.y, '#ccc', 6);
                game.state = 'playing';
                if (!game.timerStarted) {
                  game.timerStarted = true;
                  game.playTime = 0;
                }
              }
            });
          }
        } else if (game.state !== 'intro_anim') {
          game.items.forEach(function(i) {
            if (!i.collected && game.player.x < i.x + i.w && game.player.x + game.player.w > i.x && game.player.y < i.y + i.h && game.player.y + game.player.h > i.y) {
              i.collected = true;
              game.player.powerUp();
              spawnParticles(i.x + i.w / 2, i.y + i.h, '#ccc', 6);
              if (game.demoMode && game.aiActive) {
                if (game.player.aiPath.length > 0 && game.player.aiPath[0] === i) game.player.aiPath.shift();
                game.player.stagnationTimer = 0;
                game.player.adventureMode = false;
              }
            }
            if (!i.collected) {
              game.npcs.forEach(function(npc) {
                if (npc.active && npc.vy > 0 && npc.x < i.x + i.w && npc.x + npc.w > i.x && npc.y < i.y + i.h && npc.y + npc.h > i.y) {
                  npc.y = i.y - npc.h;
                  npc.jump(config.superJumpPower);
                  npc.isSparkleJumping = true;
                  npc.squatTimer = 3;
                  spawnParticles(npc.x + npc.w / 2, i.y + i.h, '#ccc', 3);
                  if (npc.aiPath.length > 0 && npc.aiPath[0] === i) npc.aiPath.shift();
                }
              });
            }
          });
          
          game.coins.forEach(function(c) {
            c.update();
            let ox = (c.hitW - c.w) / 2, oy = (c.hitH - c.h) / 2;
            if (!c.collected && game.player.x < c.x - ox + c.hitW && game.player.x + game.player.w > c.x - ox && game.player.y < c.y - oy + c.hitH && game.player.y + game.player.h > c.y - oy) {
              c.collected = true;
              c.animTimer = 30;
              c.vy = -5;
              game.scoreCoin++;
              spawnParticles(c.x + c.w / 2, c.y + c.h / 2, '#fd0', 3, 2);
            }
          });
          
          if (game.player.vy > 0) {
            game.platforms.forEach(function(p) {
              if (p.broken || p.isCrumbling) return;
              if (game.player.x + game.player.w > p.x && game.player.x < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + p.h + game.player.vy) {
                if (p.type === 'goal') {
                  let impact = game.player.vy;
                  game.player.vy = -impact * 0.1;
                  game.state = 'clear';
                  document.body.classList.add('game-ended');
                  game.endReason = 'CLEAR';
                  game.clearTime = game.playTime;
                  game.shakeAmount = 0;
                  if (!isAttractMode) {
                    pBtn.style.display = 'none';
                    autoBtn.style.display = 'none';
                  }
                  $('tapToStartMsg').style.display = 'none';
                  ignoreNextTap = true;
                  spawnParticles(game.player.x + game.player.w / 2, p.y, '#ccc', 5);
                  
                  let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
                  (async () => {
                    await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'CLEAR');
                    if (!game.isBenchmarking) {
                      setTimeout(() => {
                        if (game.state === 'clear') {
                          if (!isAttractMode) RankingAPI.show('clear');
                          else {
                            ignoreNextTap = false;
                            $('tapToStartMsg').style.display = 'block';
                          }
                        }
                      }, 500);
                    }
                  })();
                  
                  if (game.demoMode && !game.isBenchmarking) {
                    setTimeout(function() {
                      if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
                    }, isAttractMode ? 2000 : 5000);
                  }
                } else {
                  if (p.y < game.player.highestReachedY - 5) {
                    game.player.highestReachedY = p.y;
                    game.player.visitedHistory = [];
                    game.player.stagnationTimer = 0;
                    game.player.adventureMode = false;
                    game.player.sameBounceCount = 0;
                  } else {
                    game.player.stagnationTimer++;
                  }
                  
                  game.player.y = p.y - game.player.h;
                  let ap = config.jumpPower;
                  if (p.isGlowing) ap = config.superJumpPower * config.glowingMovingJumpMultiplier;
                  else if (p.type === 'super') ap = config.superJumpPower;
                  else if (p.type === 'h-slide' || p.type === 'v-slide') ap = config.jumpPower * config.movingPlatformJumpMultiplier;
                  
                  if (game.demoMode && game.aiActive) {
                    if (game.player.aiPath.length > 0 && game.player.aiPath[0] === p) game.player.aiPath.shift();
                    if (game.player.lastPlatform === p) {
                      game.player.sameBounceCount++;
                      if (game.player.sameBounceCount > 4) {
                        p.blacklisted = true;
                        if (game.player.aiPath.length > 0) game.player.aiPath[0].blacklisted = true;
                        game.player.aiPath = [];
                        game.player.sameBounceCount = 0;
                      }
                    } else {
                      game.player.sameBounceCount = 0;
                      game.player.lastPlatform = p;
                    }
                    if (ap <= config.superJumpPower) {
                      game.player.stagnationTimer = 0;
                      game.player.adventureMode = false;
                    }
                    if (!game.player.visitedHistory.includes(p)) game.player.visitedHistory.push(p);
                  }
                  
                  let seg = FLR((game.player.x + game.player.w / 2 - p.x) / config.platformW);
                  if (seg < 0) seg = 0;
                  if (seg >= p.count) seg = p.count - 1;
                  p.squishTimers[seg] = 12;
                  p.breakOnSquish[seg] = true;
                  game.player.squatTimer = 3;
                  if (!p.isIcy && !p.noEffect) {
                    spawnParticles(game.player.x + game.player.w / 2, p.y, '#ccc', 5);
                  }
                  game.player.isSparkleJumping = (p.type === 'super' || p.isGlowing) && !p.noEffect;
                  game.player.jump(ap);
                }
              }
            });
          }
        }
      }
      
      let upB = game.cameraY + config.gameHeight * 0.4, lowB = game.cameraY + config.gameHeight * 0.6, nY = game.cameraY;
      if (game.player.y < upB) nY -= (upB - game.player.y) * 0.15;
      else if (game.player.y > lowB) nY += (game.player.y - lowB) * 0.15;
      
      let mY = game.goalY - config.gameHeight * 0.25;
      if (nY < mY) nY = mY;
      if (nY < game.highestCameraY) game.highestCameraY = nY;
      
      game.cameraY = MIN(nY, game.highestCameraY + config.gameHeight * config.recoveryScreens);
      if (game.player.y < game.highestPlayerY) game.highestPlayerY = game.player.y;
      
      game.score = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
      
      let lowestY = game.player.y;
      game.npcs.forEach(n => {
        if (n.y > lowestY && n.y < 1500) lowestY = n.y;
      });
      
      let dL = Math.max(game.cameraY, lowestY) + config.gameHeight * (1 + config.recoveryScreens);
      for (let i = game.platforms.length - 1; i >= 0; i--) {
        let p = game.platforms[i];
        if (p.broken || (!p.isGround && p.y >= dL)) {
          P_PL.push(p);
          game.platforms.splice(i, 1);
        }
      }
      for (let i = game.items.length - 1; i >= 0; i--) {
        if (game.items[i].y >= dL || game.items[i].collected) {
          P_IT.push(game.items[i]);
          game.items.splice(i, 1);
        }
      }
      for (let i = game.coins.length - 1; i >= 0; i--) {
        let c = game.coins[i];
        if (c.y >= dL || c.dead) {
          P_CN.push(c);
          game.coins.splice(i, 1);
        }
      }
      
      while (game.platforms.length > 0 && game.platforms[game.platforms.length - 1].type !== 'goal' && game.platforms[game.platforms.length - 1].y > game.cameraY - config.gameHeight) {
        spawnPlatform();
      }
      
      if (game.player.y + game.player.h >= game.cameraY + config.gameHeight && game.state !== 'powerdown_anim') {
        if (game.player.isPoweredUp) {
          game.player.y = game.cameraY + config.gameHeight - config.playerSize * 2;
          game.player.isPoweredUp = false;
          game.state = 'powerdown_anim';
          game.player.animTimer = 48;
          game.player.baseY = game.player.y;
          if (game.demoMode && game.aiActive) {
            game.player.adventureMode = false;
            game.player.stagnationTimer = 0;
            game.player.aiPath = [];
          }
        } else {
          if (game.state !== 'gameover') {
            logAIEvent('DEATH_FALL', 'adv:' + game.player.adventureMode + ' vy:' + game.player.vy.toFixed(1));
            game.shakeAmount = 0;
            game.state = 'gameover';
            document.body.classList.add('game-ended');
            game.endReason = 'DEATH_FALL';
            game.player.y = game.cameraY + config.gameHeight - game.player.h * 0.5;
            
            if (!isAttractMode) {
              pBtn.style.display = 'none';
              autoBtn.style.display = 'none';
            }
            $('tapToStartMsg').style.display = 'none';
            ignoreNextTap = true;
            
            let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
            (async () => {
              await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'DEATH_FALL');
              if (!game.isBenchmarking) {
                setTimeout(() => {
                  if (game.state === 'gameover') {
                    if (!isAttractMode) RankingAPI.show('gameover');
                    else {
                      ignoreNextTap = false;
                      $('tapToStartMsg').style.display = 'block';
                    }
                  }
                }, 500);
              }
            })();
            
            if (game.demoMode && !game.isBenchmarking) {
              setTimeout(function() {
                if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
              }, isAttractMode ? 2000 : 5000);
            }
          }
        }
      }
      
      if (game.playTime >= config.timeLimit * 1000 && game.state !== 'gameover' && game.state !== 'clear') {
        logAIEvent('TIME_UP', '');
        game.shakeAmount = 0;
        game.state = 'gameover';
        document.body.classList.add('game-ended');
        game.endReason = 'TIME_UP';
        if (!isAttractMode) {
          pBtn.style.display = 'none';
          autoBtn.style.display = 'none';
        }
        $('tapToStartMsg').style.display = 'none';
        ignoreNextTap = true;
        
        let fA = MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier));
        (async () => {
          await RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'TIME_UP');
          if (!game.isBenchmarking) {
            setTimeout(() => {
              if (game.state === 'gameover') {
                if (!isAttractMode) RankingAPI.show('gameover');
                else {
                  ignoreNextTap = false;
                  $('tapToStartMsg').style.display = 'block';
                }
              }
            }, 500);
          }
        })();
        
        if (game.demoMode && !game.isBenchmarking) {
          setTimeout(function() {
            if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
          }, isAttractMode ? 2000 : 5000);
        }
      }
    }

    function formatTime(ms) {
      let m = FLR(ms / 60000), s = FLR((ms % 60000) / 1000), msec = FLR(ms % 1000);
      return m + ':' + s.toString().padStart(2, '0') + '.' + msec.toString().padStart(3, '0');
    }

    function getColorAtScore(s) {
      let phases = config.bgPhases;
      if (s <= phases[0].score) return phases[0].color;
      if (s >= phases[phases.length - 1].score) return phases[phases.length - 1].color;
      
      for (let i = 0; i < phases.length - 1; i++) {
        let p1 = phases[i], p2 = phases[i + 1];
        if (s >= p1.score && s <= p2.score) {
          let r = (s - p1.score) / (p2.score - p1.score);
          return {
            r: p1.color.r + (p2.color.r - p1.color.r) * r,
            g: p1.color.g + (p2.color.g - p1.color.g) * r,
            b: p1.color.b + (p2.color.b - p1.color.b) * r
          };
        }
      }
      return phases[0].color;
    }

    const bgCache = document.createElement('canvas');
    bgCache.width = 1;
    bgCache.height = config.gameHeight;
    const bgCtx = bgCache.getContext('2d', { alpha: false });
    let lastBGScore = -1;
    const cloudCaches = [];
    
    for (let i = 0; i < 3; i++) {
      let c = document.createElement('canvas');
      let cx = c.getContext('2d', { alpha: true });
      let s = 10;
      if (i === 0) {
        c.width = s * 6; c.height = s * 3;
        cx.fillStyle = '#fff';
        cx.fillRect(s, s, s * 4, s * 2);
        cx.fillRect(s * 2, 0, s * 2, s);
        cx.fillRect(0, s * 2, s * 6, s);
      } else if (i === 1) {
        c.width = s * 7; c.height = s * 3;
        cx.fillStyle = '#fff';
        cx.fillRect(s, s, s * 5, s * 2);
        cx.fillRect(s * 2, 0, s * 3, s);
        cx.fillRect(0, s * 2, s * 7, s);
      } else {
        c.width = s * 5; c.height = s * 3;
        cx.fillStyle = '#fff';
        cx.fillRect(s, s, s * 3, s * 2);
        cx.fillRect(s * 2, 0, s * 2, s);
        cx.fillRect(0, s * 2, s * 5, s);
      }
      cloudCaches.push(c);
    }

    function drawBG(ts) {
      let scoreTop = (game.baseScoreY - game.cameraY) * config.scoreMultiplier;
      let sT = FLR(scoreTop);
      if (sT !== lastBGScore) {
        let scoreBottom = (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier;
        let grad = bgCtx.createLinearGradient(0, 0, 0, config.gameHeight);
        for (let i = 0; i <= 4; i++) {
          let ratio = i / 4;
          let s = scoreTop - (scoreTop - scoreBottom) * ratio;
          let c = getColorAtScore(s);
          grad.addColorStop(ratio, 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')');
        }
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1, config.gameHeight);
        lastBGScore = sT;
      }
      ctx.drawImage(bgCache, 0, 0, 1, config.gameHeight, 0, 0, config.gameWidth, config.gameHeight);
      
      let currentVisScore = (scoreTop + (game.baseScoreY - (game.cameraY + config.gameHeight)) * config.scoreMultiplier) / 2;
      let sA = 0;
      if (currentVisScore >= 45000 && currentVisScore < 60000) sA = (currentVisScore - 45000) / 15000;
      else if (currentVisScore >= 60000 && currentVisScore < 125000) sA = 1;
      else if (currentVisScore >= 125000 && currentVisScore < 135000) sA = 1 - (currentVisScore - 125000) / 10000;
      
      let bA = (currentVisScore < 100000);
      if (sA > 0) {
        ctx.fillStyle = '#fff';
        game.stars.forEach(function(st) {
          let sy = (st.y - game.cameraY * st.speed) % config.gameHeight;
          if (sy < 0) sy += config.gameHeight;
          ctx.globalAlpha = sA * (bA ? (0.5 + 0.5 * SIN(ts * st.blink)) : 1);
          ctx.fillRect(FLR(st.x), FLR(sy), st.size, st.size);
        });
        ctx.globalAlpha = 1.0;
      }
      
      let cA = currentVisScore < 40000 ? 1 : (currentVisScore < 50000 ? 1 - (currentVisScore - 40000) / 10000 : 0);
      if (cA > 0) {
        game.clouds.forEach(function(c) {
          let sy = (c.y - game.cameraY) * c.speed, s = 10 * c.scale;
          if (sy > config.gameHeight || sy + s * 3 < 0) return;
          ctx.globalAlpha = cA * (c.speed === 0.6 ? 0.15 : 0.25);
          let cc = cloudCaches[c.type];
          ctx.drawImage(cc, FLR(c.x - s), FLR(sy - s), FLR(cc.width * c.scale), FLR(cc.height * c.scale));
          ctx.globalAlpha = 1.0;
        });
      }
      return getColorAtScore(scoreTop);
    }

    async function startDemoRankingScroll() {
      if (!isAttractMode) return;
      $('demoRankingContainer').style.display = 'block';
      $('demoRankingContainer').style.opacity = '1';
      $('demoRankingContainer').style.transition = 'none';
      $('demoRankingContainer').style.background = 'rgba(0,0,0,0.3)';
      $('demoHeader').innerHTML = '<div style="color:#fff;font-size:10px;text-align:center;margin-top:20px;">LOADING...</div>';
      $('demoTop3').innerHTML = '';
      $('demoOthers').innerHTML = '';
      
      let s = await RankingAPI.getScores();
      if (!isAttractMode) return;
      
      let curLen = s.length;
      for (let i = 0; i < 100 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2500, coins: 0, lang: '---' });
      
      let headerHtml = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;"><tr style="color:rgba(255,255,255,0.85);font-size:8px;"><th style="padding:4px 0;text-align:left;width:20%;">RANK</th><th style="padding:4px 0;text-align:center;width:20%;">LANG</th><th style="padding:4px 0;text-align:center;width:40%;">HEIGHT</th><th style="padding:4px 0;text-align:right;width:20%;">COIN</th></tr></table>';
      $('demoHeader').innerHTML = headerHtml;
      
      let t3Html = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;">';
      let otHtml = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px;">';
      
      s.forEach((r, idx) => {
        let i = (r.rank ? r.rank - 1 : idx);
        let m = '';
        let color = 'rgba(255,255,255,0.85)';
        let fw = 'normal';
        if (i === 0) { m = '<span class="mdl mdl-1"></span>'; color = '#ff0'; fw = 'bold'; }
        else if (i === 1) { m = '<span class="mdl mdl-2"></span>'; color = '#ccc'; fw = 'bold'; }
        else if (i === 2) { m = '<span class="mdl mdl-3"></span>'; color = '#d98'; fw = 'bold'; }
        
        let pt = '6px 0';
        let row = `<tr style="color:${color};font-weight:${fw};"><td style="padding:${pt};text-align:left;width:20%;white-space:nowrap;overflow:hidden;">${m}${i + 1}</td><td style="text-align:center;padding:${pt};width:20%;white-space:nowrap;overflow:hidden;">${r.lang || '---'}</td><td style="text-align:center;padding:${pt};width:40%;white-space:nowrap;overflow:hidden;">${r.alt}m</td><td style="text-align:right;padding:${pt};width:20%;color:#ffb;white-space:nowrap;overflow:hidden;">${r.coins || 0}</td></tr>`;
        
        if (i < 3) t3Html += row;
        else otHtml += row;
      });
      
      t3Html += '</table>';
      otHtml += '</table>';
      $('demoTop3').innerHTML = t3Html;
      $('demoOthers').innerHTML = otHtml;
      
      demoState.active = true;
      demoState.phase = 'scroll';
      demoState.startTime = performance.now();
      demoState.calculated = false;
      
      $('demoHeader').style.top = '0px';
      $('demoTop3').style.top = '0px';
      $('demoOthersWrapper').style.top = '0px';
      $('demoOthers').style.top = '0px';
      $('demoHeader').style.transform = 'translateY(1000px)';
      $('demoTop3').style.transform = 'translateY(1000px)';
      $('demoOthersWrapper').style.transform = 'translateY(1000px)';
      $('demoOthersWrapper').style.maskImage = 'none';
      $('demoOthersWrapper').style.webkitMaskImage = 'none';
    }

    function render(ts) {
      let topColor = drawBG(ts);
      ctx.save();
      
      let sX = 0, sY = 0;
      if (game.shakeAmount > 0) {
        sX = (RND() - 0.5) * 2 * game.shakeAmount;
        sY = (RND() - 0.5) * 2 * game.shakeAmount;
        game.shakeAmount *= 0.85;
        if (game.shakeAmount < 0.5) game.shakeAmount = 0;
      }
      ctx.translate(FLR(sX), FLR(-game.cameraY + sY));
      
      if (IMG.title && IMG.title.complete && IMG.title.naturalWidth > 0) {
        ctx.drawImage(IMG.title, FLR((config.gameWidth - IMG.title.naturalWidth) / 2), 95);
      }
      
      if (isDev && game.demoMode && game.aiActive && game.player.aiPath && game.player.aiPath.length > 0) {
        ctx.strokeStyle = game.player.adventureMode ? 'rgba(255, 255, 0, 0.8)' : 'rgba(0, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let px = game.player.x + game.player.w / 2;
        let py = game.player.y + game.player.h / 2;
        ctx.moveTo(px, py);
        for (let n of game.player.aiPath) {
          let nx = n.x + (n.w ? n.w / 2 : 8);
          let ny = n.y + (n.h ? n.h / 2 : 8);
          if (n.type === 'h-slide') nx += n.direction * 30;
          let dx = nx - px;
          if (ABS(dx) > config.gameWidth / 2) {
            let wrappedNx = dx > 0 ? nx - config.gameWidth : nx + config.gameWidth;
            let wrappedPx = dx > 0 ? px + config.gameWidth : px - config.gameWidth;
            ctx.lineTo(wrappedNx, ny);
            ctx.moveTo(wrappedPx, py);
          }
          ctx.lineTo(nx, ny);
          ctx.fillStyle = game.player.adventureMode ? 'rgba(255, 255, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
          ctx.arc(nx, ny, 3, 0, PI * 2);
          ctx.fill();
          ctx.moveTo(nx, ny);
          px = nx;
          py = ny;
        }
        ctx.stroke();
      }
      
      game.birds.forEach(function(b) {
        if (!b.isPerched && (b.type === 1 || b.type === 2)) b.draw(ts);
      });
      game.platforms.forEach(function(p) {
        if (p.y > game.cameraY + config.gameHeight + 100 || p.y + (p.h || 32) < game.cameraY - 100) return;
        p.draw();
      });
      game.items.forEach(function(i) {
        if (i.y > game.cameraY + config.gameHeight + 50 || i.y + i.h < game.cameraY - 50) return;
        i.draw();
      });
      game.coins.forEach(function(c) {
        if (c.y > game.cameraY + config.gameHeight + 50 || c.y + c.h < game.cameraY - 50) return;
        c.draw();
      });
      game.meteors.forEach(function(m) {
        m.draw();
      });
      game.particles.forEach(function(pt) {
        pt.draw();
      });
      game.birds.forEach(function(b) {
        if (b.type === 0 || (b.isPerched && b.type === 1)) b.draw(ts);
      });
      game.npcs.forEach(function(n) {
        n.draw();
      });
      game.player.draw();
      
      ctx.restore();
      
      game.npcs.forEach(function(n) {
        let cx = n.x + n.w / 2, cy = n.y + n.h / 2, sy = cy - game.cameraY, sx = cx;
        if (sy < 0 || sy > config.gameHeight || sx < 0 || sx > config.gameWidth) {
          let indX = MAX(10, MIN(config.gameWidth - 10, sx)), indY = MAX(10, MIN(config.gameHeight - 10, sy)), ang = Math.atan2(sy - indY, sx - indX);
          if (sy > config.gameHeight) ang = Math.PI / 2;
          else if (sy < 0) ang = -Math.PI / 2;
          ctx.save();
          ctx.translate(indX, indY);
          ctx.rotate(ang);
          ctx.fillStyle = n.active ? 'rgba(100,150,255,0.8)' : 'rgba(100,100,100,0.5)';
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(-5, 5);
          ctx.lineTo(-5, -5);
          ctx.fill();
          ctx.restore();
        }
      });
      
      let lum = topColor.r * 0.299 + topColor.g * 0.587 + topColor.b * 0.114;
      if (lum > 140) wrap.classList.add('bright-bg');
      else wrap.classList.remove('bright-bg');
      
      let effPlayTime = (game.state === 'clear') ? game.clearTime : game.playTime;
      let timeLeft = MAX(0, config.timeLimit - effPlayTime / 1000);
      let timeStr = Math.ceil(timeLeft).toString().padStart(3, '0');
      
      let timeNumStyle = '';
      if (timeLeft <= 10 && timeLeft > 0) timeNumStyle = 'color:#f33;animation:blinkRetro 0.3s infinite;';
      else if (timeLeft <= 60 && timeLeft > 0) timeNumStyle = 'color:#ff0;animation:blinkRetro 0.3s infinite;';
      else if (timeLeft === 0) timeNumStyle = 'color:#f00;';
      
      let aiStatus = '';
      if (isDev && game.demoMode && game.aiActive) {
        if (game.player.adventureMode) aiStatus = '<br><span style="color:#ff0;font-size:5px;animation:blink 0.5s infinite alternate">⚡ SURVIVAL MODE</span>';
        else if (game.player.stagnationTimer > 80) aiStatus = '<br><span style="color:#fa0;font-size:5px;">DEEP SEARCH...</span>';
        else aiStatus = '<br><span style="color:#0f0;font-size:5px;">FEARLESS AI</span>';
      }
      
      let curState = game.scoreCoin + '_' + MIN(config.goalScore, game.score) + '_' + timeStr + '_' + aiStatus;
      if (game.lastUI !== curState) {
        let cI = '<div style="display:inline-block;width:10px;height:10px;position:relative;margin-right:4px;"><div style="position:absolute;left:2px;top:0;width:6px;height:10px;background:#fd0;"></div><div style="position:absolute;left:0;top:2px;width:10px;height:6px;background:#fd0;"></div><div style="position:absolute;left:3px;top:2px;width:4px;height:6px;background:#ff9;"></div></div>';
        let nUI = '<span style="flex:1;text-align:left;display:flex;align-items:center;">' + cI + game.scoreCoin + '</span><span style="flex:1;text-align:center;">' + MIN(config.goalScore, game.score) + 'm' + aiStatus + '</span><span style="flex:1;text-align:right;">TIME <span style="' + timeNumStyle + '">' + timeStr + '</span></span>';
        ui.innerHTML = nUI;
        game.lastUI = curState;
      }
      
      if (demoState.active && demoState.phase === 'scroll') {
        if (!demoState.calculated) {
          demoState.containerH = $('demoRankingContainer').offsetHeight;
          demoState.headerH = $('demoHeader').offsetHeight;
          demoState.t3H = $('demoTop3').offsetHeight;
          demoState.otH = $('demoOthers').offsetHeight;
          demoState.startScrollY = demoState.containerH;
          demoState.fixedHeaderY = demoState.containerH * 0.15;
          demoState.fixedTop3Y = demoState.fixedHeaderY + demoState.headerH;
          demoState.gap = 8;
          demoState.wH = demoState.containerH - demoState.fixedTop3Y - demoState.t3H - demoState.gap;
          $('demoOthersWrapper').style.height = demoState.wH + 'px';
          demoState.dist1 = demoState.containerH - demoState.fixedHeaderY;
          demoState.dist2 = MAX(0, demoState.otH - demoState.wH + 40);
          demoState.totalDist = demoState.dist1 + demoState.dist2;
          demoState.scrollDuration = (demoState.totalDist / 0.035);
          demoState.calculated = true;
        }
        
        let elapsed = ts - demoState.startTime;
        let progress = MIN(1, elapsed / demoState.scrollDuration);
        let currentScrolled = demoState.totalDist * progress;
        
        if (currentScrolled < demoState.dist1) {
          let headerY = demoState.containerH - currentScrolled;
          $('demoHeader').style.transform = `translateY(${headerY}px)`;
          $('demoTop3').style.transform = `translateY(${headerY + demoState.headerH}px)`;
          $('demoOthersWrapper').style.transform = `translateY(${headerY + demoState.headerH + demoState.t3H + demoState.gap}px)`;
          $('demoOthers').style.transform = 'translateY(0px)';
          $('demoOthersWrapper').style.maskImage = 'none';
          $('demoOthersWrapper').style.webkitMaskImage = 'none';
        } else {
          $('demoHeader').style.transform = `translateY(${demoState.fixedHeaderY}px)`;
          $('demoTop3').style.transform = `translateY(${demoState.fixedTop3Y}px)`;
          $('demoOthersWrapper').style.transform = `translateY(${demoState.fixedTop3Y + demoState.t3H + demoState.gap}px)`;
          let othersScrolled = currentScrolled - demoState.dist1;
          $('demoOthers').style.transform = `translateY(${-othersScrolled}px)`;
          $('demoOthersWrapper').style.maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)';
          $('demoOthersWrapper').style.webkitMaskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 100%)';
        }
        
        if (progress >= 1) {
          demoState.phase = 'wait';
          setTimeout(() => {
            if (!isAttractMode) return;
            let fo = $('fadeOverlay');
            fo.style.display = 'block';
            fo.offsetHeight;
            fo.style.opacity = '1';
            setTimeout(() => {
              if (!isAttractMode) return;
              $('demoRankingContainer').style.display = 'none';
              $('demoRankingContainer').style.opacity = '1';
              $('demoRankingContainer').style.transition = 'none';
              runAttractUICycle();
              setTimeout(() => {
                fo.style.opacity = '0';
                setTimeout(() => { fo.style.display = 'none'; }, 1000);
              }, 500);
            }, 1000);
          }, 3000);
        }
      }
    }

    function loop(ts) {
      let dT = ts - lastTime;
      lastTime = ts;
      if (dT > 250) dT = 250;
      
      if (!game.isPaused) {
        if (game.state === 'playing' || game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || game.state === 'intro') {
          if (game.timerStarted) game.playTime += dT;
        }
        acc += dT;
        let upd = 0;
        while (acc >= frameDuration && upd < 3) {
          updatePhysics();
          acc -= frameDuration;
          upd++;
        }
      }
      
      if (!game.isBenchmarking) render(ts);
      if (loopRunning) requestAnimationFrame(loop);
    }

    function togglePause(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (game.state === 'gameover' || game.state === 'clear' || game.isBenchmarking) return;
      game.isPaused = !game.isPaused;
      pScreen.style.display = game.isPaused ? 'flex' : 'none';
      pBtn.innerText = game.isPaused ? '▶' : 'II';
    }

    ['touchstart', 'mousedown'].forEach(function(ev) {
      pBtn.addEventListener(ev, togglePause, { passive: false });
      autoBtn.addEventListener(ev, function(e) {
        e.preventDefault();
        e.stopPropagation();
        setAuto(!game.aiActive);
      }, { passive: false });
      $('pauseScreen').addEventListener(ev, e => {
        if (e.target.id === 'btnTitlePause') {
          e.preventDefault();
          e.stopPropagation();
          game.isPaused = false;
          $('pauseScreen').style.display = 'none';
          ignoreNextTap = true;
          setTimeout(() => ignoreNextTap = false, 500);
          startAttractCycle();
        }
      }, { passive: false });
    });

    document.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (t) {
        if (t.id === 'db_m') selMode(false, t);
        else if (t.id === 'db_a') selMode(true, t);
        else if (t.id === 'db_ar') {
          game.allowAutoRank = !game.allowAutoRank;
          t.innerText = game.allowAutoRank ? 'ENTRY: ON' : 'ENTRY: OFF';
          t.style.borderColor = game.allowAutoRank ? '#0f0' : '#555';
        }
        else if (t.id === 'db_h0') selHgt(0, t);
        else if (t.id === 'db_h35') selHgt(35000, t);
        else if (t.id === 'db_h75') selHgt(75000, t);
        else if (t.id === 'db_h115') selHgt(115000, t);
        else if (t.id === 'db_h130') selHgt(130000, t);
        else if (t.id === 'db_start') startWithSettings();
        else if (t.id === 'db_rank_reset') RankingAPI.reset();
        else if (t.id === 'db_b10') startBenchmark(10);
        else if (t.id === 'db_b50') startBenchmark(50);
        else if (t.id === 'db_b100') startBenchmark(100);
        else if (t.id === 'closeRankBtn') $('rankingModal').style.display = 'none';
        else if (t.id === 'db_reload') location.reload();
      } else {
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          RankingAPI.showRanking(game.state);
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            e.preventDefault();
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
        }
      }
    });

    ['touchstart', 'mousedown'].forEach(ev => {
      $('rankingModal').addEventListener(ev, e => {
        if (e.target.id === 'closeRankBtn') return;
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          e.preventDefault();
          RankingAPI.showRanking(game.state);
          return;
        }
        if (isAttractMode) {
          if (ignoreNextTap) return;
          e.preventDefault();
          startRealGame();
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            e.preventDefault();
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
        }
      }, { passive: false });
      
      let dc = $('demoRankingContainer');
      if (dc) {
        dc.addEventListener(ev, e => {
          if (isAttractMode) {
            if (ignoreNextTap) return;
            e.preventDefault();
            startRealGame();
          }
        }, { passive: false });
      }
    });

    const inputHandler = {
      active: new Map(),
      update: function() {
        if (game.demoMode && game.aiActive) return;
        let d = 0;
        this.active.forEach(v => { d = v; });
        game.player.inputDir = d;
        btnL.classList.toggle('active-visual', d === -1);
        btnR.classList.toggle('active-visual', d === 1);
      },
      start: function(id, d) {
        if (game.state === 'gameover' || game.state === 'clear') return;
        this.active.set(id, d);
        this.update();
      },
      end: function(id) {
        this.active.delete(id);
        this.update();
      }
    };

    const ctrlArea = $('controlArea');
    function getCtrlDir(cx) {
      return (cx - ctrlCenterX < 0) ? -1 : 1;
    }

    ['touchstart', 'mousedown'].forEach(ev => {
      ctrlArea.addEventListener(ev, e => {
        e.preventDefault();
        if (isAttractMode) {
          startRealGame();
          return;
        }
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          RankingAPI.showRanking(game.state);
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
          return;
        }
        if (game.demoMode && game.aiActive) setAuto(false);
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => inputHandler.start('c_' + t.identifier, getCtrlDir(t.clientX)));
        } else {
          inputHandler.start('c_m', getCtrlDir(e.clientX));
        }
      }, { passive: false });
    });

    ['touchmove', 'mousemove'].forEach(ev => {
      ctrlArea.addEventListener(ev, e => {
        if (e.cancelable) e.preventDefault();
        if (isAttractMode) return;
        if (game.demoMode && game.aiActive) return;
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => {
            if (inputHandler.active.has('c_' + t.identifier)) inputHandler.start('c_' + t.identifier, getCtrlDir(t.clientX));
          });
        } else {
          if (inputHandler.active.has('c_m')) inputHandler.start('c_m', getCtrlDir(e.clientX));
        }
      }, { passive: false });
    });

    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
      ctrlArea.addEventListener(ev, e => {
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => inputHandler.end('c_' + t.identifier));
        } else {
          inputHandler.end('c_m');
        }
      });
    });

    const tOv = $('touchOverlay');
    const tOrgs = new Map();

    ['touchstart', 'mousedown'].forEach(ev => {
      tOv.addEventListener(ev, e => {
        e.preventDefault();
        if (isAttractMode) {
          startRealGame();
          return;
        }
        if (RankingAPI.isShowingResult) {
          if (ignoreNextTap) return;
          RankingAPI.showRanking(game.state);
          return;
        }
        if (game.state === 'gameover' || game.state === 'clear') {
          if (!game.demoMode) {
            if (ignoreNextTap) return;
            initGame(true);
            $('tapToStartMsg').style.display = 'none';
          }
          return;
        }
        if (game.demoMode && game.aiActive) return;
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => {
            let id = 'sc_' + t.identifier;
            tOrgs.set(id, t.clientX);
            inputHandler.start(id, 0);
          });
        } else {
          tOrgs.set('sc_m', e.clientX);
          inputHandler.start('sc_m', 0);
        }
      }, { passive: false });
    });

    ['touchmove', 'mousemove'].forEach(ev => {
      tOv.addEventListener(ev, e => {
        if (e.cancelable) e.preventDefault();
        if (game.demoMode && game.aiActive) return;
        let proc = (id, cx) => {
          if (inputHandler.active.has(id) && tOrgs.has(id)) {
            let b = tOrgs.get(id);
            let thr = 12 * window.gameScale;
            if (cx > b + thr) b = cx - thr;
            else if (cx < b - thr) b = cx + thr;
            tOrgs.set(id, b);
            let df = cx - b;
            inputHandler.start(id, df > 2 * window.gameScale ? 1 : (df < -2 * window.gameScale ? -1 : 0));
          }
        };
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => proc('sc_' + t.identifier, t.clientX));
        } else {
          proc('sc_m', e.clientX);
        }
      }, { passive: false });
    });

    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
      tOv.addEventListener(ev, e => {
        if (e.changedTouches) {
          Array.from(e.changedTouches).forEach(t => {
            let id = 'sc_' + t.identifier;
            inputHandler.end(id);
            tOrgs.delete(id);
          });
        } else {
          inputHandler.end('sc_m');
          tOrgs.delete('sc_m');
        }
      });
    });

    let themeBtn = document.querySelectorAll('.thm-btn');
    themeBtn.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        themeBtn.forEach(b => b.style.borderColor = '#555');
        this.style.borderColor = '#0f0';
        let th = 'neo';
        if (this.id === 'th_cls') th = 'classic';
        else if (this.id === 'th_vin') th = 'vintage';
        $('controlArea').setAttribute('data-theme', th);
      });
    });

    btnL.style.display = btnR.style.display = 'flex';

    function startAttractCycle() {
      clearTimeout(attractTimer);
      isAttractMode = true;
      demoState.active = false;
      $('rankingModal').style.display = 'none';
      $('demoRankingContainer').style.display = 'none';
      $('tapToStartMsg').innerText = 'TAP TO START';
      $('tapToStartMsg').style.display = 'block';
      document.body.classList.add('attract-mode');
      if (!loopRunning) {
        loopRunning = true;
        requestAnimationFrame(loop);
      }
      runAttractUICycle();
    }

    function runAttractUICycle() {
      if (!isAttractMode) return;
      tM = 4;
      tS = 0;
      config.scoreMultiplier = tM;
      game.startScore = tS;
      game.demoMode = true;
      $('prodControls').style.display = 'flex';
      $('btnToDev').style.display = 'flex';
      $('demoRankingContainer').style.display = 'none';
      demoState.active = false;
      initGame(false);
      attractTimer = setTimeout(() => {
        if (!isAttractMode) return;
        $('btnToDev').style.display = 'none';
        setAuto(true);
        startDemoRankingScroll();
      }, 3000);
    }

    function startRealGame() {
      if (ignoreNextTap) return;
      if (!isAttractMode) return;
      clearTimeout(attractTimer);
      isAttractMode = false;
      demoState.active = false;
      document.body.classList.remove('attract-mode');
      $('prodControls').style.display = 'none';
      $('rankingModal').style.display = 'none';
      $('demoRankingContainer').style.display = 'none';
      $('tapToStartMsg').style.display = 'none';
      
      let fo = $('fadeOverlay');
      if (fo) {
        fo.style.display = 'none';
        fo.style.opacity = '0';
      }
      
      tM = 4;
      tS = 0;
      config.scoreMultiplier = tM;
      game.startScore = tS;
      game.demoMode = false;
      game.aiActive = false;
      initGame(false);
    }

    ['touchstart', 'mousedown'].forEach(ev => {
      $('prodControls').addEventListener(ev, e => {
        if (ignoreNextTap) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.target.closest('#btnToDev')) {
          e.stopPropagation();
          clearTimeout(attractTimer);
          isAttractMode = false;
          demoState.active = false;
          document.body.classList.remove('attract-mode');
          $('prodControls').style.display = 'none';
          $('tapToStartMsg').style.display = 'none';
          $('demoRankingContainer').style.display = 'none';
          $('devControls').style.display = 'flex';
          $('debugModal').style.display = 'flex';
          $('debugModal').style.background = 'rgba(0,0,0,0.85)';
          return;
        }
        if (isAttractMode) {
          e.preventDefault();
          startRealGame();
        }
      }, { passive: false });
    });

    if (isDev) {
      $('debugModal').style.display = 'flex';
      $('devControls').style.display = 'flex';
      $('prodControls').style.display = 'none';
    } else {
      $('debugModal').style.display = 'none';
      startAttractCycle();
    }
