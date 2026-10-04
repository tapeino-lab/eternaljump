import { describe, it, expect } from 'vitest';
import { installFakeLootLocker, flush } from './helpers';

async function load() {
  const identity = await import('../src/identity');
  const { LootLockerAPI } = await import('../src/lootlocker');
  const { game } = await import('../src/state');
  return { identity, LootLockerAPI, game };
}

describe('coin submission guard', () => {
  it('does not submit when the cloud total cannot be confirmed', async () => {
    const ll = installFakeLootLocker({ remoteCoins: 'error' });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(5000);
    await LootLockerAPI.submitCoinScore(5000, 'JPN');
    expect(ll.submits('cointtl')).toHaveLength(0);
  });

  it('pulls local coins up instead of submitting when the cloud is higher', async () => {
    const ll = installFakeLootLocker({ remoteCoins: 200000 });
    const { identity, LootLockerAPI, game } = await load();
    identity.persistTotalCoins(4930);
    game.totalCoins = 4930;
    await LootLockerAPI.submitCoinScore(4930, 'JPN');
    expect(ll.submits('cointtl')).toHaveLength(0);
    expect(identity.getStoredTotalCoinsSync()).toBe(200000);
    expect(game.totalCoins).toBe(200000);
  });

  it('submits the local total when the cloud is lower, then reuses the confirmed value', async () => {
    const ll = installFakeLootLocker({ remoteCoins: 1000 });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(5000);
    await LootLockerAPI.submitCoinScore(5000, 'JPN');
    await LootLockerAPI.submitCoinScore(5000, 'JPN');
    expect(ll.submits('cointtl').map(c => c.body.score)).toEqual([5000, 5000]);
    const memberReads = ll.calls.filter(c => c.path.includes('/cointtl/member/'));
    expect(memberReads).toHaveLength(1);
  });

  it('submits when the player has no cloud entry yet (404)', async () => {
    const ll = installFakeLootLocker({ remoteCoins: null });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(42);
    await LootLockerAPI.submitCoinScore(42, 'JPN');
    expect(ll.submits('cointtl').map(c => c.body.score)).toEqual([42]);
  });

  it('never submits zero coins', async () => {
    const ll = installFakeLootLocker({ remoteCoins: null });
    const { LootLockerAPI } = await load();
    await LootLockerAPI.submitCoinScore(0, 'JPN');
    expect(ll.submits('cointtl')).toHaveLength(0);
  });

  it('never sends a value lower than the stored total', async () => {
    const ll = installFakeLootLocker({ remoteCoins: 10 });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(9000);
    await LootLockerAPI.submitCoinScore(5, 'JPN');
    expect(ll.submits('cointtl').map(c => c.body.score)).toEqual([9000]);
  });
});

describe('startup coin sync', () => {
  it('does nothing for a visitor who never played', async () => {
    const ll = installFakeLootLocker({ remoteCoins: null });
    const { LootLockerAPI } = await load();
    await LootLockerAPI.syncTotalCoins();
    expect(ll.state.sessionsCreated).toBe(0);
  });

  it('does not submit when the cloud read fails', async () => {
    const ll = installFakeLootLocker({ remoteCoins: 'error' });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(300);
    await LootLockerAPI.syncTotalCoins();
    expect(ll.submits('cointtl')).toHaveLength(0);
  });

  it('restores coins from the cloud when it is higher', async () => {
    installFakeLootLocker({ remoteCoins: 77777 });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(100);
    await LootLockerAPI.syncTotalCoins();
    expect(identity.getStoredTotalCoinsSync()).toBe(77777);
  });
});

describe('rescue grants', () => {
  async function bootAs(playerId: number, coins: number, pb?: any, ta?: any) {
    const ll = installFakeLootLocker({ playerId, remoteCoins: coins });
    const ctx = await load();
    const { secureStorage } = await import('../src/secureStorage');
    ctx.identity.persistTotalCoins(coins);
    ctx.game.totalCoins = coins;
    if (pb) secureStorage.setItem('EternalJumper_PB', pb);
    if (ta) secureStorage.setItem('8bitJump_TAPB', ta);
    ctx.identity.markBootCoinsRestored();
    await ctx.LootLockerAPI.init();
    await flush(30);
    return { ll, ...ctx, secureStorage };
  }

  it('adds the lost coins once for the rescued account', async () => {
    const { identity, game, LootLockerAPI } = await bootAs(63590557, 4930);
    expect(identity.getStoredTotalCoinsSync()).toBe(4930 + 148062);
    expect(game.totalCoins).toBe(4930 + 148062);
    LootLockerAPI.sessionToken = null;
    await LootLockerAPI.init();
    await flush(30);
    expect(identity.getStoredTotalCoinsSync()).toBe(4930 + 148062);
  });

  it('restores and re-submits the lost personal best and time attack exactly', async () => {
    const { ll, secureStorage } = await bootAs(63590557, 158552,
      { alt: 144000, coins: 119, time: 160000 }, { time: 98250 });
    expect(secureStorage.getItem('EternalJumper_PB', null)).toEqual({ alt: 144000, coins: 148, time: 154665 });
    expect(secureStorage.getItem('8bitJump_TAPB', null)).toEqual({ time: 78822 });
    expect(ll.submits('hct2').map(c => c.body.score)).toEqual([144000148]);
    expect(ll.submits('tatk').map(c => c.body.score)).toEqual([999921178]);
  });

  it('does not touch other players', async () => {
    const { ll, identity } = await bootAs(11111111, 4930);
    expect(identity.getStoredTotalCoinsSync()).toBe(4930);
    expect(ll.submits('hct2')).toHaveLength(0);
    expect(ll.submits('tatk')).toHaveLength(0);
  });
});

describe('session expiry', () => {
  it('logs in again and retries when LootLocker rejects an expired token', async () => {
    const ll = installFakeLootLocker({ remoteCoins: 100 });
    const { identity, LootLockerAPI } = await load();
    identity.persistTotalCoins(5000);
    await LootLockerAPI.init();
    ll.expireSession();
    LootLockerAPI.knownRemoteCoins = null;
    await LootLockerAPI.submitCoinScore(5000, 'JPN');
    expect(ll.state.sessionsCreated).toBe(2);
    expect(ll.submits('cointtl').map(c => c.body.score)).toEqual([5000]);
  });
});
