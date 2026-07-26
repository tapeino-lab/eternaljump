import { applyCoinCountUp } from './ui-effects.js';
import { game, demoState } from './state.js';
import { isAttractMode, ctrlCenterX, ignoreNextTap, setIgnoreNextTap, startRealGame, startAttractCycle, initGame, togglePause, setAuto } from './game.js';

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
  const ctrlArea = $('controlArea');
  const tOv = $('touchOverlay');
  const tOrgs = new Map();

  document.addEventListener('keydown', (e: any) => {
    if ($('nameEditModal').style.display === 'flex') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd' || e.key === 'A' || e.key === 'D') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if ($('rankingModal').style.display === 'flex') {
        if (ignoreNextTap) return;
        if (RankingAPI.isShowingResult) {
          RankingAPI.showRanking(game.state);
        } else {
          $('rankingModal').style.display = 'none';
          $('tapToStartMsg').style.display = 'none';
          if (game.state === 'clear' || game.state === 'gameover' || game.state === 'demo') {
            if (!game.demoMode) {
              let earned = game.scoreCoin;
              startAttractCycle();
              applyCoinCountUp(earned, 'COINS GET!', true, false);
            }
          } else if (game.isPaused) {
            $('tapToStartMsg').innerText = 'TAP TO RESUME';
            $('tapToStartMsg').style.display = 'block';
          }
        }
        return;
      }
      
      if (isAttractMode) {
        startRealGame();
        let dir = (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? -1 : 1;
        inputHandler.start('k_' + dir, dir);
        return;
      }
      if (game.state === 'gameover' || game.state === 'clear') {
        if (!game.demoMode) {
          if (ignoreNextTap) return;
          let earned = game.scoreCoin;
          startAttractCycle();
          applyCoinCountUp(earned, 'COINS GET!', true, false);
        }
        return;
      }
      if (game.demoMode && game.aiActive) setAuto(false);
      let dir = (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? -1 : 1;
      inputHandler.start('k_' + dir, dir);
    }
  });

  document.addEventListener('keyup', (e: any) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      inputHandler.end('k_-1');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      inputHandler.end('k_1');
    }
  });


  // Intercept all touch/mousedown events globally when ranking modal is open
  ['touchstart', 'mousedown'].forEach(ev => {
    document.addEventListener(ev, (e: any) => {
      if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause')) return;

      if ($('rankingModal').style.display === 'flex') {
        if (ignoreNextTap) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        
        if (RankingAPI.isShowingResult) {
          e.preventDefault();
          e.stopPropagation();
          RankingAPI.showRanking(game.state);
          return;
        } else {
          // If viewing ranking list, only allow closing when tapping control area
          if (e.target.closest('#controlArea')) {
            e.preventDefault();
            e.stopPropagation();
            $('rankingModal').style.display = 'none';
            $('tapToStartMsg').style.display = 'none';
            if (game.state === 'clear' || game.state === 'gameover' || game.state === 'demo') {
              if (isAttractMode) {
                startRealGame();
              } else {
                let earned = game.scoreCoin;
                startAttractCycle();
                applyCoinCountUp(earned, 'COINS GET!', true, false);
              }
            } else if (game.isPaused) {
              $('tapToStartMsg').innerText = 'TAP TO RESUME';
              $('tapToStartMsg').style.display = 'block';
            }
          } else {
            // let the event propagate so we can scroll
          }
          return;
        }
      }

      if (game.isPaused) return;

      if (isAttractMode) {
        if (ignoreNextTap) return;
        if (e.target.closest('#pauseBtn')) return;
        e.preventDefault();
        e.stopPropagation();
        startRealGame();

        const targetIsCtrl = e.target && e.target.closest && e.target.closest('#controlArea');
        if ((e as TouchEvent).changedTouches && (e as TouchEvent).changedTouches.length > 0) {
          Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => {
            const dir = targetIsCtrl ? getCtrlDir(t.clientX) : (t.clientX < window.innerWidth / 2 ? -1 : 1);
            inputHandler.start('g_t_' + t.identifier, dir);
          });
        } else {
          const dir = targetIsCtrl ? getCtrlDir(e.clientX) : (e.clientX < window.innerWidth / 2 ? -1 : 1);
          inputHandler.start('g_m', dir);
        }
        return;
      }
    }, { capture: true, passive: false });
  });

  ['touchmove', 'mousemove'].forEach(ev => {
    document.addEventListener(ev, (e: any) => {
      if ((e as TouchEvent).changedTouches && (e as TouchEvent).changedTouches.length > 0) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => {
          const id = 'g_t_' + t.identifier;
          if (inputHandler.active.has(id)) {
            const targetIsCtrl = e.target && e.target.closest && e.target.closest('#controlArea');
            const dir = targetIsCtrl ? getCtrlDir(t.clientX) : (t.clientX < window.innerWidth / 2 ? -1 : 1);
            inputHandler.start(id, dir);
          }
        });
      } else {
        const id = 'g_m';
        if (inputHandler.active.has(id)) {
          const targetIsCtrl = e.target && e.target.closest && e.target.closest('#controlArea');
          const dir = targetIsCtrl ? getCtrlDir(e.clientX) : (e.clientX < window.innerWidth / 2 ? -1 : 1);
          inputHandler.start(id, dir);
        }
      }
    }, { passive: true });
  });

  ['touchend', 'touchcancel', 'mouseup'].forEach(ev => {
    document.addEventListener(ev, (e: any) => {
      if ((e as TouchEvent).changedTouches && (e as TouchEvent).changedTouches.length > 0) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => {
          inputHandler.end('g_t_' + t.identifier);
        });
      } else {
        inputHandler.end('g_m');
      }
    });
  });

  ['touchstart', 'mousedown'].forEach(function(ev) {
    pBtn.addEventListener(ev, togglePause, { passive: false });
    

    $('pauseScreen').addEventListener(ev, (e: any) => {
      if (e.target.closest('#btnInstagramPause')) return;
      if (e.target.closest('#btnRankingPause')) {
        e.preventDefault();
        e.stopPropagation();
        RankingAPI.showRanking('pause');
      } else if (e.target.closest('#btnResumePause')) {
        e.preventDefault();
        e.stopPropagation();
        togglePause();
      } else if (e.target.closest('#btnTitlePause')) {
        e.preventDefault();
        e.stopPropagation();
        $('pauseConfirmModal').style.display = 'flex';
      } else if (e.target.closest('#btnConfirmYes')) {
        e.preventDefault();
        e.stopPropagation();
        $('pauseConfirmModal').style.display = 'none';
        game.isPaused = false;
        $('pauseScreen').style.display = 'none';
        setIgnoreNextTap(true);
        setTimeout(() => setIgnoreNextTap(false), 500);
        startAttractCycle();
      } else if (e.target.closest('#btnConfirmNo')) {
        e.preventDefault();
        e.stopPropagation();
        $('pauseConfirmModal').style.display = 'none';
      } else if (e.target.closest('#pauseConfirmModal')) {
        e.preventDefault();
        e.stopPropagation();
      } else if (e.target.closest('#pausePlayerNameInput') || e.target.closest('#pauseEditIcon') || e.target.closest('#nameEditModal')) {
        e.stopPropagation();
      } else if (e.target.id === 'pauseScreen') {
        e.preventDefault();
        e.stopPropagation();
        togglePause();
      } else {
        e.stopPropagation();
      }
    }, { passive: false });
  });

  window.addEventListener('keydown', (e: any) => {
    if (e.repeat) return;
    if ($('rankingModal').style.display === 'flex') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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

  window.addEventListener('keyup', (e: any) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputHandler.end('k_l');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') inputHandler.end('k_r');
  });

  ['touchstart', 'mousedown'].forEach(ev => {
    document.addEventListener(ev, (e: any) => {
      if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause')) return;
      if (game.isPaused) {
        e.stopPropagation();
        if (!e.target.closest('#pauseBtn') && !e.target.closest('#pauseScreen') && !e.target.closest('#nameEditModal') && !e.target.closest('#rankingModal')) togglePause();
        return;
      }
    }, { passive: false });
    
    let dc = $('demoRankingContainer');
    if (dc) {
      dc.addEventListener(ev, (e: any) => {
        if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause')) return;
          if (game.isPaused) return;
        if (isAttractMode) {
          if (ignoreNextTap) return;
          if (e.target.closest('#pauseBtn')) return;
          e.preventDefault();
          startRealGame();
        }
      }, { passive: false });
    }
  });

  ['touchstart', 'mousedown'].forEach(ev => {
    ctrlArea.addEventListener(ev, (e: any) => {
      if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause')) return;
      e.preventDefault();
      if ($('nameEditModal').style.display === 'flex') {
        e.stopPropagation();
        return;
      }
      if (game.isPaused) {
        e.stopPropagation();
        togglePause();
        return;
      }
      if (isAttractMode) {
        if (e.target.closest('#pauseBtn')) return;
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
          let earned = game.scoreCoin;
          startAttractCycle();
          applyCoinCountUp(earned, 'COINS GET!', true, false);
        }
        return;
      }
      if (game.demoMode && game.aiActive) setAuto(false);
      if ((e as TouchEvent).changedTouches) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => inputHandler.start('c_' + t.identifier, getCtrlDir(t.clientX)));
      } else {
        inputHandler.start('c_m', getCtrlDir(e.clientX));
      }
    }, { passive: false });
  });

  ['touchmove', 'mousemove'].forEach(ev => {
    ctrlArea.addEventListener(ev, (e: any) => {
      if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause')) return;
      if (e.cancelable) e.preventDefault();
      if (isAttractMode) return;
      if (game.demoMode && game.aiActive) return;
      if ((e as TouchEvent).changedTouches) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => {
          if (inputHandler.active.has('c_' + t.identifier)) inputHandler.start('c_' + t.identifier, getCtrlDir(t.clientX));
        });
      } else {
        if (inputHandler.active.has('c_m')) inputHandler.start('c_m', getCtrlDir(e.clientX));
      }
    }, { passive: false });
  });

  ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
    ctrlArea.addEventListener(ev, (e: any) => {
      if ((e as TouchEvent).changedTouches) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => inputHandler.end('c_' + t.identifier));
      } else {
        inputHandler.end('c_m');
      }
    });
  });

  ['touchstart', 'mousedown'].forEach(ev => {
    tOv.addEventListener(ev, (e: any) => {
      if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause')) return;
      e.preventDefault();
      if (game.isPaused) {
        e.stopPropagation();
        togglePause();
        return;
      }
      if (game.demoMode && game.aiActive) return;
      if ((e as TouchEvent).changedTouches) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => {
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
    tOv.addEventListener(ev, (e: any) => {
      if (e.cancelable) e.preventDefault();
      if (game.demoMode && game.aiActive) return;
      let proc = (id, cx) => {
        if (inputHandler.active.has(id) && tOrgs.has(id)) {
          let b = tOrgs.get(id);
          let thr = 12 * (window as any).gameScale;
          if (cx > b + thr) b = cx - thr;
          else if (cx < b - thr) b = cx + thr;
          tOrgs.set(id, b);
          let df = cx - b;
          inputHandler.start(id, df > 2 * (window as any).gameScale ? 1 : (df < -2 * (window as any).gameScale ? -1 : 0));
        }
      };
      if ((e as TouchEvent).changedTouches) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => proc('sc_' + t.identifier, t.clientX));
      } else {
        proc('sc_m', e.clientX);
      }
    }, { passive: false });
  });

  ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
    tOv.addEventListener(ev, (e: any) => {
      if ((e as TouchEvent).changedTouches) {
        Array.from((e as TouchEvent).changedTouches).forEach((t: Touch) => {
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
    btn.addEventListener('click', function(this: HTMLElement, e: Event) {
      e.preventDefault();
      e.stopPropagation();
      themeBtn.forEach(b => (b as HTMLElement).style.borderColor = '#555');
      this.style.borderColor = '#0f0';
      let th = 'neo';
      if (this.id === 'th_cls') th = 'classic';
      else if (this.id === 'th_vin') th = 'vintage';
      const ca = $('controlArea');
      if (ca) ca.setAttribute('data-theme', th);
    });
  });

  ['touchstart', 'mousedown'].forEach(ev => {
    
  });

  // Also bind dev control buttons
  document.addEventListener('click', (e: any) => {
    const t = (e.target as HTMLElement).closest('button');
    if (t) {
      if (t.id === 'closeRankBtn') $('rankingModal').style.display = 'none';
      if (t.id === 'btnShopCancel' || t.id === 'btnShopOk') {
        startAttractCycle();
      }
    }
  });
}

// Placeholder clearAttractTimer to be imported from game.js
import { clearAttractTimer } from './game.js';
