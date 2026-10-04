import { safeStorage } from './safeStorage.js';
import { getStoredPlayerIdentifierSync, persistPlayerIdentifier, getStoredTotalCoinsSync } from './identity.js';
import { LootLockerAPI } from './lootlocker.js';

/**
 * Player-key backup in a passkey.
 *
 * The player identifier (LL_PID) is the only key to a player's cloud records, and it lives in
 * browser storage that iOS wipes (7-day ITP), that a home-screen app does not share with Safari,
 * and that is lost on a new phone. We store it as the WebAuthn user handle of a passkey, which
 * lives in the OS keychain (iCloud Keychain / Google Password Manager) instead.
 * No server is involved: we only need the user handle back, so the signature is never verified.
 */

/** Value of LL_PID that was last stored in a passkey on this device. */
const SAVED_KEY = 'EJ_PASSKEY_PID';
/** After a restore, take the name stored on LootLocker instead of pushing the local random one. */
export const ADOPT_SERVER_NAME_KEY = 'EJ_ADOPT_SERVER_NAME';

const PID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

let supportPromise: Promise<boolean> | null = null;

/** True when this device has a built-in authenticator (Face ID / Touch ID / fingerprint). */
export function isPasskeySupported(): Promise<boolean> {
  if (!supportPromise) {
    supportPromise = (async () => {
      try {
        const PKC = (window as any).PublicKeyCredential;
        if (!PKC || !navigator.credentials) return false;
        return !!(await PKC.isUserVerifyingPlatformAuthenticatorAvailable());
      } catch (e) {
        return false;
      }
    })();
  }
  return supportPromise;
}

/** True when the current player key is already backed up in a passkey from this device. */
export function isPasskeySaved(): boolean {
  const pid = getStoredPlayerIdentifierSync();
  return !!pid && safeStorage.getItem(SAVED_KEY) === pid;
}

function randomChallenge(): Uint8Array {
  const c = new Uint8Array(32);
  crypto.getRandomValues(c);
  return c;
}

export type PasskeyResult = 'ok' | 'cancelled' | 'failed';

/** Stores the current player key in a new passkey. Must be called from a click handler. */
export async function savePasskey(displayName: string): Promise<PasskeyResult> {
  const pid = getStoredPlayerIdentifierSync();
  if (!pid) return 'failed';
  try {
    await navigator.credentials.create({
      publicKey: {
        rp: { name: 'FOLLOW ME!' },
        user: {
          id: new TextEncoder().encode(pid),
          name: `FOLLOW ME! ${displayName}`,
          displayName: displayName,
        },
        challenge: randomChallenge(),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
        timeout: 60000,
      },
    });
    safeStorage.setItem(SAVED_KEY, pid);
    return 'ok';
  } catch (e: any) {
    return e && e.name === 'NotAllowedError' ? 'cancelled' : 'failed';
  }
}

/** Asks the OS for a saved passkey and returns the player key stored in it. */
export async function readPasskeyPid(): Promise<{ result: PasskeyResult; pid: string | null }> {
  try {
    const cred: any = await navigator.credentials.get({
      publicKey: { challenge: randomChallenge(), userVerification: 'preferred', timeout: 60000 },
    });
    const handle = cred && cred.response && cred.response.userHandle;
    if (!handle) return { result: 'failed', pid: null };
    const pid = new TextDecoder().decode(handle);
    if (!PID_PATTERN.test(pid)) return { result: 'failed', pid: null };
    return { result: 'ok', pid };
  } catch (e: any) {
    return { result: e && e.name === 'NotAllowedError' ? 'cancelled' : 'failed', pid: null };
  }
}

/**
 * Switches this device to the given player key and pulls that player's coins back from the cloud.
 * Local progress is never reduced: coins only move up (existing monotonic guards).
 * Returns how many coins the local total increased by.
 */
export async function adoptPlayerIdentifier(pid: string): Promise<number> {
  const before = getStoredTotalCoinsSync();

  persistPlayerIdentifier(pid);
  safeStorage.setItem(SAVED_KEY, pid);
  safeStorage.removeItem('LL_SYS_PLAYER_ID');
  safeStorage.setItem(ADOPT_SERVER_NAME_KEY, '1');

  const api: any = LootLockerAPI;
  api.playerIdentifier = pid;
  api.playerId = null;
  api.sessionToken = null;
  api.knownRemoteCoins = null;
  api._initPromise = null;
  api._persistedPid = pid;

  await LootLockerAPI.syncTotalCoins();
  return Math.max(0, getStoredTotalCoinsSync() - before);
}
