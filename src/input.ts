import { applyCoinCountUp } from './ui-effects.js';
import { game, demoState } from './state.js';
import { ctrlCenterX } from './display.js';
import { isAttractMode, ignoreNextTap, setIgnoreNextTap, startRealGame, startAttractCycle, initGame, togglePause, setAuto, clearAttractTimer } from './lifecycle.js';

import { config } from './config.js';
import { RankingAPI } from './ranking.js';
import { FLR, MAX, MIN, $ } from './utils.js';
import { getPl } from './entities/index.js';

export class InputManager {
  public active = new Map<string, number>();
  private tOrgs = new Map<string, number>();

  constructor() {
    this.update = this.update.bind(this);
    this.start = this.start.bind(this);
    this.end = this.end.bind(this);
  }

  public update() {
    if (game.aiActive) return;
    let d = 0;
    this.active.forEach(v => { d = v; });
    game.player.inputDir = d;
    $('btnLeft')?.classList.toggle('active-visual', d === -1);
    $('btnRight')?.classList.toggle('active-visual', d === 1);
  }

  public start(id: string, d: number) {
    if (game.state === 'gameover' || game.state === 'clear') return;
    this.active.set(id, d);
    this.update();
  }

  public end(id: string) {
    this.active.delete(id);
    this.update();
  }

  public getCtrlDir(cx: number) {
    return (cx - ctrlCenterX < 0) ? -1 : 1;
  }

  public init() {
    this.bindKeyboardEvents();
    this.bindGlobalTouchEvents();
    this.bindControlAreaEvents();
    this.bindTouchOverlayEvents();
    this.bindUIEvents();
  }

  private handleGlobalCapture(e: any): boolean {
    if (e.target.closest('#bottomToast')) return false;
    if (e.target.closest('#autoCruiseBtn')) return false;
    if ($('nameEditModal')?.style.display === 'flex') return false;

    if ($('rankingModal')?.style.display === 'flex' || $('langStatsModal')?.style.display === 'flex') {
      if (ignoreNextTap) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
      
      if ($('langStatsModal')?.style.display === 'flex') {
        if (e.target.closest('#controlArea')) {
          e.preventDefault();
          e.stopPropagation();
          $('langStatsModal')!.style.display = 'none';
          $('tapToStartMsg')!.style.display = 'none';
          if (game.isPaused) {
            $('tapToStartMsg')!.innerText = isAttractMode ? 'TAP TO CLOSE' : 'TAP TO RESUME';
            $('tapToStartMsg')!.style.display = 'block';
          }
        }
        return true;
      }
      
      if (RankingAPI.isShowingResult) {
        e.preventDefault();
        e.stopPropagation();
        RankingAPI.openedFromLangStats = false;
        RankingAPI.showRanking(game.state, 'height', '');
        return true;
      } else {
        if (e.target.closest('#controlArea')) {
          e.preventDefault();
          e.stopPropagation();

          if (RankingAPI.openedFromLangStats) {
            RankingAPI.openedFromLangStats = false;
            $('rankingModal')!.style.display = 'none';
            document.body.classList.remove('showing-ranking');
            RankingAPI.showLangStats();
            return true;
          }

          $('rankingModal')!.style.display = 'none';
          document.body.classList.remove('showing-ranking');
          $('tapToStartMsg')!.style.display = 'none';

          if (game.state === 'clear' || game.state === 'gameover' || game.state === 'demo') {
            if (isAttractMode) {
              startRealGame();
            } else {
              let earned = game.scoreCoin;
              if (game.state === 'clear') earned *= 2;
              startAttractCycle();
              applyCoinCountUp(earned, 'COINS GET!', true, false);
            }
          } else if (game.isPaused) {
            $('tapToStartMsg')!.innerText = isAttractMode ? 'TAP TO CLOSE' : 'TAP TO RESUME';
            $('tapToStartMsg')!.style.display = 'block';
          }
        }
        return true;
      }
    }

    if (game.isPaused) {
      if (!e.target.closest('#pauseBtn') && 
          !e.target.closest('#pauseScreen') && 
          !e.target.closest('#nameEditModal') && 
          !e.target.closest('#rankingModal')) {
        e.preventDefault();
        e.stopPropagation();
        togglePause(e);
      }
      return true;
    }

    if (isAttractMode) {
      if (ignoreNextTap) return true;
      if (e.target.closest('#pauseBtn')) return false;
      e.preventDefault();
      startRealGame();
      return true;
    }

    return false;
  }

  private handleControlTap(e: any): boolean {
    if ($('nameEditModal')?.style.display === 'flex') {
      e.stopPropagation();
      return true;
    }

    if (game.state === 'gameover' || game.state === 'clear') {
      if (ignoreNextTap) return true;
      let earned = game.scoreCoin;
      if (game.state === 'clear') earned *= 2;
      startAttractCycle();
      applyCoinCountUp(earned, 'COINS GET!', true, false);
      return true;
    }

    return false;
  }

  private bindKeyboardEvents() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if ($('nameEditModal')?.style.display === 'flex') return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'KeyP') togglePause();
      
      const isDirKey = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd' || e.key === 'A' || e.key === 'D';
      
      if (game.isPaused && isDirKey) {
        e.stopPropagation();
        togglePause();
        return;
      }

      if (isDirKey) {
        e.preventDefault();
        
        if (isAttractMode) {
          startRealGame();
          let dir = (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? -1 : 1;
          this.start('k_' + dir, dir);
          return;
        }

        if (this.handleControlTap(e)) return;

        if (game.aiActive) setAuto(false);
        let dir = (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? -1 : 1;
        this.start('k_' + dir, dir);
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.end('k_-1');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.end('k_1');
      }
    });
  }

  private bindGlobalTouchEvents() {
    ['touchstart', 'mousedown'].forEach(ev => {
      document.addEventListener(ev, (e: any) => {
        if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause') || e.target.closest('#btnFullscreen')) return;
        this.handleGlobalCapture(e);
      }, { capture: true, passive: false });
    });

  }

  private bindControlAreaEvents() {
    const ctrlArea = $('controlArea');
    if (!ctrlArea) return;

    ['touchstart', 'mousedown'].forEach(ev => {
      ctrlArea.addEventListener(ev, (e: any) => {
        if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause') || e.target.closest('#btnFullscreen') || e.target.closest('#autoCruiseBtn') || e.target.closest('#pauseBtn')) return;
        e.preventDefault();
        
        if (this.handleControlTap(e)) return;

        if (game.aiActive) setAuto(false);
        if (e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
             this.start('c_' + e.changedTouches[i].identifier, this.getCtrlDir(e.changedTouches[i].clientX));
          }
        } else {
          this.start('c_m', this.getCtrlDir(e.clientX));
        }
      }, { passive: false });
    });

    ['touchmove', 'mousemove'].forEach(ev => {
      ctrlArea.addEventListener(ev, (e: any) => {
        if (e.target.closest('#btnInstagram') || e.target.closest('#btnInstagramPause') || e.target.closest('#btnFullscreen')) return;
        if (e.cancelable) e.preventDefault();
        if (isAttractMode) return;
        if (game.aiActive) return;
        if (e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (this.active.has('c_' + t.identifier)) this.start('c_' + t.identifier, this.getCtrlDir(t.clientX));
          }
        } else {
          if (this.active.has('c_m')) this.start('c_m', this.getCtrlDir(e.clientX));
        }
      }, { passive: false });
    });

    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
      ctrlArea.addEventListener(ev, (e: any) => {
        if (e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
             this.end('c_' + e.changedTouches[i].identifier);
          }
        } else {
          this.end('c_m');
        }
      });
    });
  }

  private bindTouchOverlayEvents() {
    ['touchstart', 'mousedown'].forEach(ev => {
      document.addEventListener(ev, (e: any) => {
        if (e.target.closest('#btnInstagram') || 
            e.target.closest('#btnInstagramPause') || 
            e.target.closest('#btnFullscreen') || 
            e.target.closest('#autoCruiseBtn') || 
            e.target.closest('#pauseBtn') || 
            e.target.closest('#controlArea') || 
            e.target.closest('#shopControlArea') || 
            e.target.closest('#nameEditModal') || 
            e.target.closest('#rankingModal') || 
            e.target.closest('#langStatsModal') || 
            e.target.closest('#pauseScreen')) return;
        
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;

        if (this.handleControlTap(e)) return;
        
        if (game.aiActive) return;
        if (e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            let id = 'sc_' + t.identifier;
            this.tOrgs.set(id, t.clientX);
            this.start(id, 0);
          }
        } else {
          this.tOrgs.set('sc_m', e.clientX);
          this.start('sc_m', 0);
        }
      }, { passive: false });
    });

    ['touchmove', 'mousemove'].forEach(ev => {
      document.addEventListener(ev, (e: any) => {
        if (game.aiActive) return;
        let proc = (id: string, cx: number) => {
          if (this.active.has(id) && this.tOrgs.has(id)) {
            let b = this.tOrgs.get(id)!;
            let thr = 12 * (window as any).gameScale;
            if (cx > b + thr) b = cx - thr;
            else if (cx < b - thr) b = cx + thr;
            this.tOrgs.set(id, b);
            let df = cx - b;
            this.start(id, df > 2 * (window as any).gameScale ? 1 : (df < -2 * (window as any).gameScale ? -1 : 0));
          }
        };
        if (e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
             proc('sc_' + e.changedTouches[i].identifier, e.changedTouches[i].clientX);
          }
        } else {
          proc('sc_m', e.clientX);
        }
      }, { passive: false });
    });

    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => {
      document.addEventListener(ev, (e: any) => {
        if (e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            let id = 'sc_' + t.identifier;
            this.end(id);
            this.tOrgs.delete(id);
          }
        } else {
          this.end('sc_m');
          this.tOrgs.delete('sc_m');
        }
      });
    });
  }

  private bindUIEvents() {
    const autoCruiseBtn = $('autoCruiseBtn');
    if (autoCruiseBtn) {
      ['touchstart', 'mousedown'].forEach(ev => {
        autoCruiseBtn.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          setAuto(!game.aiActive);
        }, { passive: false });
      });
    }
    const pBtn = $('pauseBtn');
    if (pBtn) {
      ['touchstart', 'mousedown'].forEach(ev => {
        pBtn.addEventListener(ev, togglePause, { passive: false });
      });
    }

    const btnFs = $('btnFullscreen');
    if (btnFs) {
      // Check iOS or lack of fullscreen support
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const docEl = document.documentElement as any;
      const doc = document as any;
      const canFullscreen = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen);

      if (isIOS || !canFullscreen) {
        // Hide fullscreen button on iOS/iPhone where Fullscreen API is unsupported or problematic
        btnFs.style.display = 'none';
        document.body.classList.add('no-fullscreen');
        document.body.classList.remove('has-fullscreen');
      } else {
        document.body.classList.add('has-fullscreen');
        document.body.classList.remove('no-fullscreen');
        const pathEnter = "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z";
        const pathExit = "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z";

        const updateFsIcon = () => {
          const fsElement = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
          const svgPath = btnFs.querySelector('path');
          if (svgPath) {
            svgPath.setAttribute('d', fsElement ? pathExit : pathEnter);
          }
        };

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
          document.addEventListener(event, updateFsIcon);
        });

        ['touchstart', 'mousedown'].forEach(ev => {
          btnFs.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            const fsElement = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
            if (!fsElement) {
              if (docEl.requestFullscreen) {
                docEl.requestFullscreen().catch((err: any) => console.warn("Fullscreen error", err));
              } else if (docEl.webkitRequestFullscreen) {
                docEl.webkitRequestFullscreen();
              }
            } else {
              if (doc.exitFullscreen) {
                doc.exitFullscreen();
              } else if (doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
              }
            }
          }, { passive: false });
        });
      }
    }

    const pauseScreen = $('pauseScreen');
    if (pauseScreen) {
      ['touchstart', 'mousedown'].forEach(ev => {
        pauseScreen.addEventListener(ev, (e: any) => {
          if (e.target.closest('#btnInstagramPause') || e.target.closest('#btnFullscreen')) return;
          if (e.target.closest('#btnRankingPause')) {
            e.preventDefault();
            e.stopPropagation();
            RankingAPI.openedFromLangStats = false;
            RankingAPI.showRanking('pause', 'height', '');
          } else if (e.target.closest('#btnLangStatsPause')) {
            e.preventDefault();
            e.stopPropagation();
            RankingAPI.openedFromLangStats = false;
            RankingAPI.showLangStats();
          } else if (e.target.closest('#btnResumePause')) {
            e.preventDefault();
            e.stopPropagation();
            togglePause(e);
          } else if (e.target.closest('#btnTitlePause')) {
            e.preventDefault();
            e.stopPropagation();
            $('pauseConfirmModal')!.style.display = 'flex';
          } else if (e.target.closest('#btnConfirmYes')) {
            e.preventDefault();
            e.stopPropagation();
            let earned = (!game.demoMode && game.scoreCoin) ? game.scoreCoin : 0;
            $('pauseConfirmModal')!.style.display = 'none';
            game.isPaused = false;
            $('pauseScreen')!.style.display = 'none';
            setIgnoreNextTap(true);
            setTimeout(() => setIgnoreNextTap(false), 500);
            startAttractCycle();
            if (earned > 0) {
              applyCoinCountUp(earned, 'COINS GET!', false, false);
            }
          } else if (e.target.closest('#btnConfirmNo')) {
            e.preventDefault();
            e.stopPropagation();
            $('pauseConfirmModal')!.style.display = 'none';
          } else if (e.target.closest('#pauseConfirmModal')) {
            e.preventDefault();
            e.stopPropagation();
          } else if (e.target.closest('#pausePlayerNameInput') || e.target.closest('#pauseEditIcon') || e.target.closest('#nameEditModal')) {
            e.stopPropagation();
          } else if (e.target.id === 'pauseScreen') {
            e.preventDefault();
            e.stopPropagation();
            togglePause(e);
          } else {
            e.stopPropagation();
          }
        }, { passive: false });
      });
    }

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

    document.addEventListener('click', (e: any) => {
      const t = (e.target as HTMLElement).closest('button');
      if (t) {
        if (t.id === 'closeRankBtn') { $('rankingModal')!.style.display = 'none'; document.body.classList.remove('showing-ranking'); }
        if (t.classList.contains('lang-filter-btn')) {
          const lang = t.getAttribute('data-lang');
          if (lang) {
            RankingAPI.openedFromLangStats = true;
            RankingAPI.showRanking('pause', 'height', lang);
          }
        }
      }
    });
  }
}

export const inputHandler = new InputManager();

export function setupInputListeners() {
  inputHandler.init();
}
