import { game, isDev, isAttractMode, demoState, ctrlCenterX, ignoreNextTap, setIgnoreNextTap, startRealGame, startAttractCycle, initGame, togglePause, setAuto, selMode, selHgt, startWithSettings, startBenchmark } from './game.js';
import { config } from './config.js';
import { RankingAPI } from './ranking.js';
import { FLR, MAX, MIN, $ } from './utils.js';

export const inputHandler = {
  active: new Map(),
  update: function() {
    if (game.demoMode && game.aiActive) return;
    let d = 0;
    this.active.forEach(v => { d = v; });
    game.player.inputDir = d;
    $('btnLeft').classList.toggle('active-visual', d === -1);
    $('btnRight').classList.toggle('active-visual', d === 1);
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

function getCtrlDir(cx) {
  return (cx - ctrlCenterX < 0) ? -1 : 1;
}

export function setupInputListeners() {
  const pBtn = $('pauseBtn');
  const autoBtn = $('autoBtn');
  const ctrlArea = $('controlArea');
  const tOv = $('touchOverlay');
  const tOrgs = new Map();

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
        setIgnoreNextTap(true);
        setTimeout(() => setIgnoreNextTap(false), 500);
        startAttractCycle();
      } else {
        e.preventDefault();
        e.stopPropagation();
        togglePause();
      }
    }, { passive: false });
  });

  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'KeyP') togglePause(e);
    if (game.isPaused && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {
      e.stopPropagation();
      togglePause();
      return;
    }
    if (game.demoMode && game.aiActive) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputHandler.start('k_l', -1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') inputHandler.start('k_r', 1);
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputHandler.end('k_l');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') inputHandler.end('k_r');
  });

  ['touchstart', 'mousedown'].forEach(ev => {
    document.addEventListener(ev, e => {
      if (game.isPaused) {
        e.stopPropagation();
        if (!e.target.closest('#pauseBtn') && !e.target.closest('#pauseScreen')) togglePause();
        return;
      }
      if (RankingAPI.isShowingResult) {
        if (ignoreNextTap) return;
        e.preventDefault();
        RankingAPI.showRanking(game.state);
        return;
      }

      if ($('rankingModal').style.display === 'flex' && (game.state === 'clear' || game.state === 'gameover' || game.state === 'demo')) {
        if (ignoreNextTap) return;
        e.preventDefault();
        $('rankingModal').style.display = 'none';
        if (isAttractMode) {
          startRealGame();
        } else {
          initGame(true);
          $('tapToStartMsg').style.display = 'none';
        }
        return;
      }

      if (e.target.closest('#devControls') || e.target.closest('#debugModal') || e.target.closest('#pauseBtn') || e.target.closest('#autoBtn') || e.target.closest('#pauseScreen') || e.target.closest('#rankingModal') || e.target.closest('.thm-btn')) return;
      
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

  ['touchstart', 'mousedown'].forEach(ev => {
    ctrlArea.addEventListener(ev, e => {
      e.preventDefault();
      if (game.isPaused) {
        e.stopPropagation();
        togglePause();
        return;
      }
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

  ['touchstart', 'mousedown'].forEach(ev => {
    tOv.addEventListener(ev, e => {
      e.preventDefault();
      if (game.isPaused) {
        e.stopPropagation();
        togglePause();
        return;
      }
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

  ['touchstart', 'mousedown'].forEach(ev => {
    $('prodControls').addEventListener(ev, e => {
      if (ignoreNextTap) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.target.closest('#btnToDev')) {
        e.stopPropagation();
        clearTimeout(game.attractTimer); // wait, in game.js attractTimer is exported as let attractTimer.
        // We can clear it via the exported/imported attractTimer or we can clear attractTimer from game.js
        // Wait, since we import attractTimer or clear it inside startRealGame, let's make sure it clears perfectly.
        // Actually, we can export a function or setter, but since we imported attractTimer we can also clear it directly!
        // But wait, the browser lets us do: clearTimeout(attractTimer) if we import attractTimer! No, wait, in ES Modules, imported bindings are read-only.
        // Ah! That is a very important detail! Imported bindings are read-only (constant references). So we CANNOT mutate `attractTimer` or assign to it inside `input.js`.
        // To clear or mutate attractTimer, let's export a function `clearAttractTimer` or `setAttractTimer` in `game.js`.
        // Let's check how we handle attractTimer:
        // We can export `clearAttractTimer` and call it! Let's do that.
        // Yes, that is incredibly robust.
        clearAttractTimer();
        game.isAttractMode = false;
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

  // Also bind dev control buttons
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
      else if (t.id === 'db_title') { $('debugModal').style.display = 'none'; startAttractCycle(); }
      else if (t.id === 'db_b10') startBenchmark(10);
      else if (t.id === 'db_b50') startBenchmark(50);
      else if (t.id === 'db_b100') startBenchmark(100);
      else if (t.id === 'closeRankBtn') $('rankingModal').style.display = 'none';
      else if (t.id === 'db_reload') location.reload();
    }
  });
}

// Placeholder clearAttractTimer to be imported from game.js
import { clearAttractTimer } from './game.js';
