import { safeStorage } from './safeStorage.js';
import { getStoredPlayerIdentifierSync } from './identity.js';
import { PID_PATTERN } from './passkey.js';

// Second backup method: the player key is saved as a login in the browser's password manager
// (iCloud Keychain) and restored with password autofill. Behind a test flag for now.

const FLAG_KEY = 'EJ_PWSAVE_TEST';
const SAVED_KEY = 'EJ_PW_SAVED';
const PENDING_KEY = 'EJ_PW_PENDING';
/** The host is shared with other games, so saved logins are labelled with the game name. */
export const PASSWORD_USERNAME_PREFIX = 'ETERNAL JUMP · ';

/** ?pwsave=1 turns the feature on (and remembers it); ?pwsave=0 turns it off. */
export function isPasswordBackupEnabled(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('pwsave');
    if (q === '1') safeStorage.setItem(FLAG_KEY, '1');
    else if (q === '0') { safeStorage.removeItem(FLAG_KEY); return false; }
  } catch (e) { /* ignore */ }
  return safeStorage.getItem(FLAG_KEY) === '1';
}

/** Without a controlling service worker the form POST would reach GitHub Pages, which must never happen. */
export function canSaveToPasswordManager(): boolean {
  return isPasswordBackupEnabled() && !!navigator.serviceWorker?.controller;
}

export function isPasswordSaved(): boolean {
  const pid = getStoredPlayerIdentifierSync();
  return !!pid && safeStorage.getItem(SAVED_KEY) === pid;
}

export function markPasswordSaved(pid: string) {
  safeStorage.setItem(SAVED_KEY, pid);
}

/** Called right before the save form submits; confirmed on the redirect back (consumeSaveRedirect). */
export function markSaveSubmitted() {
  const pid = getStoredPlayerIdentifierSync();
  if (pid) safeStorage.setItem(PENDING_KEY, pid);
}

/** Boot: handles the ?pwsaved=1 return from the form POST. True when a save was just confirmed. */
export function consumeSaveRedirect(): boolean {
  const params = new URLSearchParams(location.search);
  if (!params.has('pwsaved')) return false;
  if (params.get('pwsaved') !== '1') return false;
  params.delete('pwsaved');
  const qs = params.toString();
  try {
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  } catch (e) { /* ignore */ }
  const pid = getStoredPlayerIdentifierSync();
  if (pid && safeStorage.getItem(PENDING_KEY) === pid) {
    markPasswordSaved(pid);
    safeStorage.removeItem(PENDING_KEY);
    return true;
  }
  return false;
}

/** Returns the player key from an autofilled login, or null unless it is one of ours. */
export function parseRestoredLogin(username: string, password: string): string | null {
  if (!username.startsWith(PASSWORD_USERNAME_PREFIX)) return null;
  return PID_PATTERN.test(password) ? password : null;
}
