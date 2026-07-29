import { $, getPlayerName } from "./utils.js";
import { LootLockerAPI } from "./lootlocker.js";
import { safeStorage } from "./safeStorage.js";

let tempNameVal = '';
let originalNameVal = '';

export function initVirtualKeyboard() {
  const lettersContainer = $('kbLetters');
  const numbersContainer = $('kbNumbers');
  const symbolsContainer = $('kbSymbols');
  
  if (!lettersContainer || !numbersContainer || !symbolsContainer) return;
  
  lettersContainer.innerHTML = '';
  numbersContainer.innerHTML = '';
  symbolsContainer.innerHTML = '';
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const numbers = '1234567890'.split('');
  const symbols = '.-_!?'.split('');
  
  const handleCharClick = (char) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (tempNameVal.length === 2) {
      tempNameVal = tempNameVal[1] + char;
    } else {
      tempNameVal += char;
    }
    $('nameEditVal').innerText = tempNameVal.padEnd(2, '_');
  };

  const createBtn = (char) => {
    const btn = document.createElement('button');
    btn.className = 'modal-btn';
    btn.style.cssText = 'padding:12px 0; font-size:14px; font-family:"Press Start 2P", sans-serif; background:#222; color:#fff; border:2px solid #555; border-radius:4px; cursor:pointer; text-align:center;';
    btn.innerText = char;
    btn.addEventListener('click', handleCharClick(char));
    return btn;
  };

  letters.forEach(char => lettersContainer.appendChild(createBtn(char)));
  numbers.forEach(char => numbersContainer.appendChild(createBtn(char)));
  symbols.forEach(char => symbolsContainer.appendChild(createBtn(char)));
}

export function openNameEditModal() {
  let fullName = getPlayerName();
  let parts = fullName.split(' ');
  let lang = parts[0] || '---';
  let name = parts[1] || '??';
  
  originalNameVal = name;
  tempNameVal = name;
  
  const langEl = $('nameEditLang');
  if (langEl) langEl.innerText = lang;
  
  $('nameEditVal').innerText = tempNameVal.padEnd(2, '_');
  
  const tabLetters = $('tabLetters');
  if (tabLetters) tabLetters.click();
  $('nameEditModal').style.display = 'flex';
}

export function setupKeyboardUI() {
  const tabLetters = $('tabLetters');
  const tabNumbers = $('tabNumbers');
  const tabSymbols = $('tabSymbols');
  
  if (tabLetters && tabNumbers && tabSymbols) {
    tabLetters.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      $('kbLetters').style.display = 'grid';
      $('kbNumbers').style.display = 'none';
      $('kbSymbols').style.display = 'none';
      tabLetters.style.borderBottom = '2px solid #fff';
      tabLetters.style.color = '#fff';
      tabNumbers.style.borderBottom = 'none';
      tabNumbers.style.color = '#888';
      tabSymbols.style.borderBottom = 'none';
      tabSymbols.style.color = '#888';
    });
    tabNumbers.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      $('kbLetters').style.display = 'none';
      $('kbNumbers').style.display = 'grid';
      $('kbSymbols').style.display = 'none';
      tabLetters.style.borderBottom = 'none';
      tabLetters.style.color = '#888';
      tabNumbers.style.borderBottom = '2px solid #fff';
      tabNumbers.style.color = '#fff';
      tabSymbols.style.borderBottom = 'none';
      tabSymbols.style.color = '#888';
    });
    tabSymbols.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      $('kbLetters').style.display = 'none';
      $('kbNumbers').style.display = 'none';
      $('kbSymbols').style.display = 'grid';
      tabLetters.style.borderBottom = 'none';
      tabLetters.style.color = '#888';
      tabNumbers.style.borderBottom = 'none';
      tabNumbers.style.color = '#888';
      tabSymbols.style.borderBottom = '2px solid #fff';
      tabSymbols.style.color = '#fff';
    });
  }

  initVirtualKeyboard();

  const btnNameReset = $('btnNameReset');
  if (btnNameReset) {
    btnNameReset.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      tempNameVal = originalNameVal;
      $('nameEditVal').innerText = tempNameVal.padEnd(2, '_');
    });
  }
  
  const btnNameRandom = $('btnNameRandom');
  if (btnNameRandom) {
    btnNameRandom.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      tempNameVal = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
      $('nameEditVal').innerText = tempNameVal;
    });
  }
  
  const btnNameCancel = $('btnNameCancel');
  if (btnNameCancel) {
    btnNameCancel.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      $('nameEditModal').style.display = 'none';
    });
  }
  
  const btnNameConfirm = $('btnNameConfirm');
  if (btnNameConfirm) {
    btnNameConfirm.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tempNameVal.length < 2) {
        if (tempNameVal.length === 1) {
          tempNameVal += 'A';
        } else {
          tempNameVal = '??';
        }
      }
      
      let fullName = getPlayerName();
      let parts = fullName.split(' ');
      let lang = parts[0] || '---';
      let newFullName = `${lang} ${tempNameVal}`;
      
      safeStorage.setItem('JUMP_PLAYER_NAME', newFullName);
      
      LootLockerAPI.setPlayerName(newFullName);
      
      const tn = document.getElementById('gamePlayerName');
      if (tn) tn.innerText = 'ID: ' + newFullName;
      
      const pNameInput = document.getElementById('pausePlayerNameInput') as HTMLInputElement;
      if (pNameInput) pNameInput.value = tempNameVal;
      
      $('nameEditModal').style.display = 'none';
    });
  }

  const pauseNameInput = $('pausePlayerNameInput');
  if (pauseNameInput) {
    pauseNameInput.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openNameEditModal();
    });
    
    const pauseEditIcon = $('pauseEditIcon');
    if (pauseEditIcon) {
      pauseEditIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openNameEditModal();
      });
    }
  }
}
