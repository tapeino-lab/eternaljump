import { game } from './state.js';
import { isAttractMode, setIgnoreNextTap } from './lifecycle.js';
import { RankingAPI } from './ranking.js';
import { applyCoinCountUp } from './ui-effects.js';
import { secureStorage } from './secureStorage.js';
import { safeStorage } from './safeStorage.js';
import { $, getPlayerName } from './utils.js';
import { isPasskeySupported, isPasskeySaved, savePasskey, readPasskeyPid, adoptPlayerIdentifier } from './passkey.js';
import {
  isPasswordBackupEnabled, canSaveToPasswordManager, isPasswordSaved, markSaveSubmitted, consumeSaveRedirect,
  parseRestoredLogin, markPasswordSaved, PASSWORD_USERNAME_PREFIX,
} from './password-backup.js';
import { getStoredPlayerIdentifierSync } from './identity.js';

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

/** Backed up by either method. */
function isDataSaved(): boolean {
  return isPasskeySaved() || isPasswordSaved();
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
  return $('savePrompt')?.style.display === 'flex' ||
    $('pwSavePrompt')?.style.display === 'flex' || $('pwLoadPrompt')?.style.display === 'flex';
}

function closePwModal(id: string) {
  const p = $(id);
  if (p) p.style.display = 'none';
  setIgnoreNextTap(true);
  setTimeout(() => setIgnoreNextTap(false), 300);
}

/**
 * Opens the login-form save prompt, or falls back to the passkey flow when the form cannot be used.
 * Submitting the form reloads the page, so it is never offered in the middle of a run.
 */
function openSave(): boolean {
  const midRun = !isAttractMode && game.state !== 'gameover' && game.state !== 'clear';
  if (!midRun && isPasswordBackupEnabled() && canSaveToPasswordManager()) {
    const pid = getStoredPlayerIdentifierSync();
    const p = $('pwSavePrompt');
    if (!p || !pid) return false;
    ($('pwSaveUser') as HTMLInputElement).value = PASSWORD_USERNAME_PREFIX + getPlayerName();
    ($('pwSavePass') as HTMLInputElement).value = pid;
    p.style.display = 'flex';
    return true;
  }
  return false;
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
  if (isDataSaved()) return;
  if (openSave()) return;
  const p = $('savePrompt');
  if (!p) return;
  p.style.display = 'flex';
}

/** Offers the backup once a player has something worth keeping (first 1,000 coins or a clear). */
export async function maybeOfferSave(state: string) {
  if (promptedThisSession || game.demoMode || isAttractMode || isDataSaved()) return;
  if (!((game.totalCoins || 0) >= 1000 || state === 'clear')) return;
  const shown = parseInt(safeStorage.getItem(PROMPTS_KEY) || '0', 10) || 0;
  if (shown >= MAX_PROMPTS) return;
  if (!(isPasswordBackupEnabled() && canSaveToPasswordManager()) && !(await isPasskeySupported())) return;
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
  const pw = isPasswordBackupEnabled();
  const show = (pw || supported) && !busy && isAttractMode && !game.isPaused &&
    game.state !== 'shop' && !document.body.classList.contains('showing-ranking') &&
    (pw ? !isDataSaved() : !hasLocalProgress());
  const display = show ? 'block' : 'none';
  if (btn.style.display !== display) btn.style.display = display;
}

async function finishRestore(pid: string) {
  const gained = await adoptPlayerIdentifier(pid);
  const tn = $('gamePlayerName');
  if (tn) tn.innerText = 'ID: ' + getPlayerName();
  if (gained > 0) applyCoinCountUp(gained, 'WELCOME BACK!', false, true);
  else showMessage('WELCOME BACK!');
  // Pull personal bests and refresh cached rankings for the restored account
  RankingAPI.syncPersonalBest(true);
  RankingAPI.prefetchScores(true);
  RankingAPI.prefetchTAScores(true);
}

function openLoadModal() {
  const p = $('pwLoadPrompt');
  if (!p) return;
  ($('pwLoadUser') as HTMLInputElement).value = '';
  ($('pwLoadPass') as HTMLInputElement).value = '';
  p.style.display = 'flex';
}

async function doPasswordLoad() {
  const u = $('pwLoadUser') as HTMLInputElement;
  const pw = $('pwLoadPass') as HTMLInputElement;
  const pid = parseRestoredLogin(u.value, pw.value);
  u.value = '';
  pw.value = '';
  closePwModal('pwLoadPrompt');
  if (!pid) { showMessage('NO SAVE FOUND'); return; }
  if (busy) return;
  busy = true;
  updateLoadDataButton();
  try {
    await finishRestore(pid);
    markPasswordSaved(pid);
    updatePauseSaveUI();
  } finally {
    busy = false;
    updateLoadDataButton();
  }
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
    await finishRestore(pid);
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
  const saved = isDataSaved();
  if (lock) lock.style.display = saved ? 'inline-flex' : 'none';
  const showBtn = (supported || (isPasswordBackupEnabled() && canSaveToPasswordManager())) && !saved;
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

  if (isPasswordBackupEnabled()) {
    // Real forms: Safari only offers "Save Password?" for a visible username/password form that submits natively
    // (the service worker answers the POST). Restoring uses autofill on the username field.
    const pwSave = document.createElement('div');
    pwSave.id = 'pwSavePrompt';
    pwSave.className = 'pause-confirm-modal save-prompt';
    pwSave.innerHTML = `<div class="pause-confirm-box">
      <form id="pwSaveForm" method="post" action="./save-data">
        <div class="pause-confirm-text">SAVE YOUR DATA?</div>
        <input id="pwSaveUser" class="pw-input" name="username" type="text" autocomplete="username">
        <input id="pwSavePass" class="pw-input" name="password" type="password" autocomplete="current-password">
        <div class="pause-confirm-buttons">
          <button type="submit" class="modal-btn pause-confirm-btn-yes passkey-save-btn">SAVE</button>
          <button type="button" id="pwSaveLater" class="modal-btn pause-confirm-btn-no">LATER</button>
        </div>
      </form></div>`;
    wrap.appendChild(pwSave);
    $('pwSaveForm')!.addEventListener('submit', () => { markSaveSubmitted(); });
    $('pwSaveLater')!.addEventListener('click', (e) => { e.stopPropagation(); closePwModal('pwSavePrompt'); });
    pwSave.addEventListener('click', (e) => e.stopPropagation());

    const pwLoad = document.createElement('div');
    pwLoad.id = 'pwLoadPrompt';
    pwLoad.className = 'pause-confirm-modal save-prompt';
    pwLoad.innerHTML = `<div class="pause-confirm-box">
      <form id="pwLoadForm">
        <div class="pause-confirm-text">LOAD YOUR DATA</div>
        <input id="pwLoadUser" class="pw-input" name="username" type="text" autocomplete="username" placeholder="NAME">
        <input id="pwLoadPass" class="pw-input" name="password" type="password" autocomplete="current-password" placeholder="KEY">
        <div class="pause-confirm-buttons">
          <button type="submit" class="modal-btn pause-confirm-btn-yes passkey-save-btn">LOAD</button>
          <button type="button" id="pwLoadCancel" class="modal-btn pause-confirm-btn-no">CANCEL</button>
        </div>
        <button type="button" id="pwLoadPasskey" class="modal-btn pw-passkey-btn" style="display:none">USE PASSKEY</button>
      </form></div>`;
    wrap.appendChild(pwLoad);
    $('pwLoadForm')!.addEventListener('submit', (e) => { e.preventDefault(); doPasswordLoad(); });
    $('pwLoadCancel')!.addEventListener('click', (e) => {
      e.stopPropagation();
      ($('pwLoadUser') as HTMLInputElement).value = '';
      ($('pwLoadPass') as HTMLInputElement).value = '';
      closePwModal('pwLoadPrompt');
    });
    $('pwLoadPasskey')!.addEventListener('click', (e) => {
      e.stopPropagation();
      closePwModal('pwLoadPrompt');
      doLoad();
    });
    pwLoad.addEventListener('click', (e) => e.stopPropagation());
  }

  const load = document.createElement('button');
  load.id = 'loadDataBtn';
  load.className = 'modal-btn load-data-btn';
  load.textContent = 'LOAD DATA';
  load.style.display = 'none';
  wrap.appendChild(load);
  load.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPasswordBackupEnabled()) openLoadModal();
    else doLoad();
  });

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
    save.addEventListener('click', (e) => { e.stopPropagation(); if (!openSave()) doSave(); });
  }

  isPasskeySupported().then((ok) => {
    supported = ok;
    const pk = $('pwLoadPasskey');
    if (pk) pk.style.display = ok ? 'block' : 'none';
    updateLoadDataButton();
    updatePauseSaveUI();
  });

  if (isPasswordBackupEnabled() && consumeSaveRedirect()) {
    setTimeout(() => {
      showMessage('DATA SAVED!', true);
      updatePauseSaveUI();
    }, 800);
  }
}
