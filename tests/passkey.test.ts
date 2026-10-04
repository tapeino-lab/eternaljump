import { describe, it, expect, vi } from 'vitest';
import { installFakeLootLocker, flush } from './helpers';

/** Fake OS keychain: create() stores the user handle, get() returns it (or throws). */
function installFakeKeychain(opts: { available?: boolean; cancel?: boolean } = {}) {
  const stored: Uint8Array[] = [];
  (window as any).PublicKeyCredential = {
    isUserVerifyingPlatformAuthenticatorAvailable: async () => opts.available ?? true,
  };
  const cancelled = () => Object.assign(new Error('cancelled'), { name: 'NotAllowedError' });
  (navigator as any).credentials = {
    create: vi.fn(async ({ publicKey }: any) => {
      if (opts.cancel) throw cancelled();
      stored.push(new Uint8Array(publicKey.user.id));
      return { id: 'cred' };
    }),
    get: vi.fn(async () => {
      if (opts.cancel || stored.length === 0) throw cancelled();
      return { response: { userHandle: stored[stored.length - 1].buffer } };
    }),
  };
  return { stored };
}

async function load() {
  const identity = await import('../src/identity');
  const passkey = await import('../src/passkey');
  const { LootLockerAPI } = await import('../src/lootlocker');
  const utils = await import('../src/utils');
  return { identity, passkey, LootLockerAPI, utils };
}

describe('passkey backup', () => {
  it('reports support only when a platform authenticator exists', async () => {
    installFakeKeychain({ available: false });
    const { passkey } = await load();
    expect(await passkey.isPasskeySupported()).toBe(false);
  });

  it('stores the current player key as the passkey user handle', async () => {
    const keychain = installFakeKeychain();
    const { identity, passkey } = await load();
    const pid = await identity.resolvePlayerIdentifier();
    expect(passkey.isPasskeySaved()).toBe(false);
    expect(await passkey.savePasskey('JPN YN')).toBe('ok');
    expect(new TextDecoder().decode(keychain.stored[0])).toBe(pid);
    expect(passkey.isPasskeySaved()).toBe(true);
  });

  it('does not mark as saved when the user cancels', async () => {
    installFakeKeychain({ cancel: true });
    const { identity, passkey } = await load();
    await identity.resolvePlayerIdentifier();
    expect(await passkey.savePasskey('JPN YN')).toBe('cancelled');
    expect(passkey.isPasskeySaved()).toBe(false);
  });

  it('reports no save when the keychain has nothing', async () => {
    installFakeKeychain();
    const { passkey } = await load();
    expect((await passkey.readPasskeyPid()).pid).toBeNull();
  });
});

describe('restore on a wiped or new device', () => {
  it('brings back the original key, cloud coins and name', async () => {
    const original = 'p_5ee744ae31e0046d';
    const keychain = installFakeKeychain();
    keychain.stored.push(new TextEncoder().encode(original));
    const ll = installFakeLootLocker({ playerId: 63534284, remoteCoins: 148062, playerName: 'JPN YN' });
    Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });

    // The new device already generated its own random identity and a few demo coins.
    const { identity, passkey, LootLockerAPI, utils } = await load();
    const tempPid = await identity.resolvePlayerIdentifier();
    identity.persistTotalCoins(30);
    localStorage.setItem('LL_SYS_PLAYER_ID', '99999999');

    const { pid } = await passkey.readPasskeyPid();
    expect(pid).toBe(original);
    const gained = await passkey.adoptPlayerIdentifier(pid!);
    await flush(20);

    expect(gained).toBe(148062 - 30);
    expect(identity.getStoredTotalCoinsSync()).toBe(148062);
    expect(localStorage.getItem('LL_PID')).toBe(original);
    expect(await identity.getIndexedDBValue('LL_PID')).toBe(original);
    expect(LootLockerAPI.playerIdentifier).toBe(original);
    expect(ll.state.sessionIdentifiers).toEqual([original]);
    expect(ll.state.sessionIdentifiers).not.toContain(tempPid);
    expect(passkey.isPasskeySaved()).toBe(true);
    // The real name was adopted locally and was not overwritten on the server.
    expect(utils.getPlayerName()).toBe('JPN YN');
    expect(ll.state.playerName).toBe('JPN YN');
    // Coins are never pushed lower than the cloud value.
    expect(ll.submits('cointtl')).toHaveLength(0);
  });

  it('keeps higher local coins and submits them to the restored account', async () => {
    const keychain = installFakeKeychain();
    keychain.stored.push(new TextEncoder().encode('p_aaaaaaaaaaaaaaaa'));
    const ll = installFakeLootLocker({ remoteCoins: 100, playerName: 'USA AB' });
    const { identity, passkey } = await load();
    identity.persistTotalCoins(500);
    const { pid } = await passkey.readPasskeyPid();
    expect(await passkey.adoptPlayerIdentifier(pid!)).toBe(0);
    expect(identity.getStoredTotalCoinsSync()).toBe(500);
    expect(ll.submits('cointtl').map(c => c.body.score)).toEqual([500]);
  });

  it('rejects a malformed user handle', async () => {
    const keychain = installFakeKeychain();
    keychain.stored.push(new TextEncoder().encode('<script>'));
    const { passkey } = await load();
    expect((await passkey.readPasskeyPid()).pid).toBeNull();
  });
});

describe('restore while a login for the temporary identity is still in flight', () => {
  it('never sends anything as the temporary account after the switch', async () => {
    const original = 'p_5ee744ae31e0046d';
    const keychain = installFakeKeychain();
    keychain.stored.push(new TextEncoder().encode(original));
    const { identity, passkey, LootLockerAPI } = await load();
    const tempPid = await identity.resolvePlayerIdentifier();
    const ll = installFakeLootLocker({
      players: {
        // The temporary identity's login answers last, like the real-world race
        [tempPid]: { playerId: 99999, coins: null, delayMs: 80 },
        [original]: { playerId: 63534284, name: 'JPN YN', coins: 148062 },
      },
    });
    // The title screen starts a login for the temporary identity...
    const staleLogin = LootLockerAPI.init();
    // ...and the player presses LOAD DATA before it answers.
    const { pid } = await passkey.readPasskeyPid();
    await passkey.adoptPlayerIdentifier(pid!);
    await staleLogin;
    await LootLockerAPI.syncTotalCoins();
    await LootLockerAPI.submitCoinScore(0, 'JPN');
    await flush(20);

    expect(LootLockerAPI.playerId).toBe(63534284);
    const sentAsTemp = ll.calls.filter(c => c.playerId === 99999 && !c.path.includes('/session/guest'));
    expect(sentAsTemp.filter(c => c.path.endsWith('/submit'))).toHaveLength(0);
    expect(identity.getStoredTotalCoinsSync()).toBe(148062);
  });
});
