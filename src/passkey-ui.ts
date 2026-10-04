import { game } from './state.js';
import { isAttractMode, setIgnoreNextTap } from './lifecycle.js';
import { RankingAPI } from './ranking.js';
import { applyCoinCountUp } from './ui-effects.js';
import { secureStorage } from './secureStorage.js';
import { safeStorage } from './safeStorage.js';
import { $, getPlayerName } from './utils.js';
import { isPasskeySupported, isPasskeySaved, savePasskey, readPasskeyPid, adoptPlayerIdentifier } from './passkey.js';

// UI for the passkey backup: "SAVE YOUR DATA?" prompt, title "LOAD DATA" button, pause-box SAVE / lock.
// Buttons use 'click' because WebAuthn requires a user activation (touchstart does not count on iOS).

const PROMPTS_KEY = 'EJ_SAVE_PROMPTS';
const MAX_PROMPTS = 2;
const LOCK_SVG = '<svg viewBox="0 0 8 8" width="14" height="14" shape-rendering="crispEdges" style="display:block"><rect x="2" y="0" width="4" height="1" fill="#ffd700"/><rect x="1" y="1" width="1" height="3" fill="#ffd700"/><rect x="6" y="1" width="1" height="3" fill="#ffd700"/><rect x="0" y="3" width="8" height="5" fill="#ffd700"/><rect x="3" y="5" width="2" height="2" fill="#000"/></svg>';

let supported = false;
let promptedThisSession = false;
let busy = false;

function hasLocalProgress(): boolean {
  const pb = secureStorage.getItem<any>('EternalJumper_PB', null); // RankingAPI.pbKey
  return !!(pb && typeof pb.alt === 'number' && pb.alt > 0) || isPasskeySaved();
}

function showMessage(title: string, withLockName = false) {
  const wrap = $('canvasWrapper');
  if (!wrap) return;
  $('passkeyMessage')?.remove();
  const box = document.createElement('div');
  box.id = 'passkeyMessage';
  box.className = 'passkey-message';
  box.innerHTML = `<div class="passkey-message-title">${title}</div>` +
    (withLockName ? `<div class="passkey-message-sub">${LOCK_SVG}<span></span></div>` : '');
  const nameSpan = box.querySelector('.passkey-message-sub span');
  if (nameSpan) nameSpan.textContent = getPlayerName();
  wrap.appendChild(box);
  setTimeout(() => box.remove(), 1800);
}

// ---------- SAVE YOUR DATA? prompt ----------

function closeSavePrompt() {
  const p = $('savePrompt');
  if (p) p.style.display = 'none';
  setIgnoreNextTap(true);
  setTimeout(() => setIgnoreNextTap(false), 300);
}

export function isSavePromptOpen(): boolean {
  return $('savePrompt')?.style.display === 'flex';
}

async function doSave() {
  if (busy) return;
  busy = true;
  try {
    const result = await savePasskey(getPlayerName());
    if (result === 'ok') {
      showMessage('DATA SAVED!', true);
      updatePauseSaveUI();
    }
  } finally {
    busy = false;
  }
}

function showSavePrompt() {
  const p = $('savePrompt');
  if (!p || isPasskeySaved()) return;
  p.style.display = 'flex';
}

/** Offers the backup once a player has something worth keeping (first 1,000 coins or a clear). */
export async function maybeOfferSave(state: string) {
  if (promptedThisSession || game.demoMode || isAttractMode || isPasskeySaved()) return;
  if (!((game.totalCoins || 0) >= 1000 || state === 'clear')) return;
  const shown = parseInt(safeStorage.getItem(PROMPTS_KEY) || '0', 10) || 0;
  if (shown >= MAX_PROMPTS) return;
  if (!(await isPasskeySupported())) return;
  promptedThisSession = true;
  safeStorage.setItem(PROMPTS_KEY, String(shown + 1));
  setTimeout(() => {
    if (RankingAPI.isShowingResult) showSavePrompt();
  }, 900);
}

// ---------- LOAD DATA (title screen, only without local progress) ----------

export function updateLoadDataButton() {
  const btn = $('loadDataBtn');
  if (!btn) return;
  // Stays visible through the title demo too: the title alone is only shown for ~3 seconds per cycle
  const show = supported && !busy && isAttractMode && !game.isPaused &&
    game.state !== 'shop' && !document.body.classList.contains('showing-ranking') && !hasLocalProgress();
  const display = show ? 'block' : 'none';
  if (btn.style.display !== display) btn.style.display = display;
}

async function doLoad() {
  if (busy) return;
  busy = true;
  updateLoadDataButton();
  try {
    const { result, pid } = await readPasskeyPid();
    if (!pid) {
      if (result !== 'cancelled') showMessage('NO SAVE FOUND');
      return;
    }
    const gained = await adoptPlayerIdentifier(pid);
    const tn = $('gamePlayerName');
    if (tn) tn.innerText = 'ID: ' + getPlayerName();
    if (gained > 0) applyCoinCountUp(gained, 'WELCOME BACK!', false, true);
    else showMessage('WELCOME BACK!');
    // Pull personal bests and refresh cached rankings for the restored account
    RankingAPI.syncPersonalBest(true);
    RankingAPI.prefetchScores(true);
    RankingAPI.prefetchTAScores(true);
  } finally {
    busy = false;
    updateLoadDataButton();
  }
}

// ---------- Pause box: SAVE button / lock icon ----------

export function updatePauseSaveUI() {
  const btn = $('pauseSaveBtn');
  const lock = $('pauseNameLock');
  const box = document.querySelector('.pause-box');
  const saved = isPasskeySaved();
  if (lock) lock.style.display = saved ? 'inline-flex' : 'none';
  const showBtn = supported && !saved;
  if (btn) btn.style.display = showBtn ? 'inline-block' : 'none';
  if (box) box.classList.toggle('has-save-btn', showBtn);
}

export function initPasskeyUI() {
  const wrap = $('canvasWrapper');
  if (!wrap) return;

  const prompt = document.createElement('div');
  prompt.id = 'savePrompt';
  prompt.className = 'pause-confirm-modal save-prompt';
  prompt.innerHTML = `<div class="pause-confirm-box">
      <div class="pause-confirm-text">SAVE YOUR DATA?</div>
      <div class="pause-confirm-buttons">
        <button id="savePromptYes" class="modal-btn pause-confirm-btn-yes passkey-save-btn">SAVE</button>
        <button id="savePromptLater" class="modal-btn pause-confirm-btn-no">LATER</button>
      </div></div>`;
  wrap.appendChild(prompt);
  $('savePromptYes')!.addEventListener('click', (e) => { e.stopPropagation(); closeSavePrompt(); doSave(); });
  $('savePromptLater')!.addEventListener('click', (e) => { e.stopPropagation(); closeSavePrompt(); });

  const load = document.createElement('button');
  load.id = 'loadDataBtn';
  load.className = 'modal-btn load-data-btn';
  load.textContent = 'LOAD DATA';
  load.style.display = 'none';
  wrap.appendChild(load);
  load.addEventListener('click', (e) => { e.stopPropagation(); doLoad(); });

  const nameLabel = document.querySelector('.pause-divider .pause-label');
  if (nameLabel) {
    nameLabel.classList.add('pause-name-label');
    const lock = document.createElement('span');
    lock.id = 'pauseNameLock';
    lock.className = 'pause-name-lock';
    lock.innerHTML = LOCK_SVG;
    lock.style.display = 'none';
    nameLabel.appendChild(lock);
  }
  const divider = document.querySelector('.pause-divider');
  if (divider) {
    const save = document.createElement('button');
    save.id = 'pauseSaveBtn';
    save.className = 'modal-btn pause-save-btn passkey-save-btn';
    save.textContent = 'SAVE';
    save.style.display = 'none';
    divider.appendChild(save);
    save.addEventListener('click', (e) => { e.stopPropagation(); doSave(); });
  }

  isPasskeySupported().then((ok) => {
    supported = ok;
    updateLoadDataButton();
    updatePauseSaveUI();
  });
}
