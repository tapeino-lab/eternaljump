import { describe, it, expect, vi } from 'vitest';
import { flush } from './helpers';

async function loadIdentity() {
  return await import('../src/identity');
}

function cookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

describe('total coins persistence', () => {
  it('starts at 0 on a brand-new device', async () => {
    const id = await loadIdentity();
    expect(id.getStoredTotalCoinsSync()).toBe(0);
  });

  it('persists to localStorage, cookie and IndexedDB', async () => {
    const id = await loadIdentity();
    id.persistTotalCoins(4930);
    await flush();
    expect(id.getStoredTotalCoinsSync()).toBe(4930);
    expect(cookie('ej_total_coins')).toBe('4930');
    expect(await id.getIndexedDBValue('JUMP_TOTAL_COINS')).toBe('4930');
  });

  it('never decreases (monotonic guard)', async () => {
    const id = await loadIdentity();
    id.persistTotalCoins(5000);
    id.persistTotalCoins(10);
    await flush();
    expect(id.getStoredTotalCoinsSync()).toBe(5000);
    expect(await id.getIndexedDBValue('JUMP_TOTAL_COINS')).toBe('5000');
  });

  it('recovers coins from the cookie when localStorage was wiped', async () => {
    document.cookie = 'ej_total_coins=777; path=/';
    const id = await loadIdentity();
    expect(id.getStoredTotalCoinsSync()).toBe(777);
  });

  it('recovers coins from IndexedDB when localStorage and cookie were wiped', async () => {
    let id = await loadIdentity();
    await id.setIndexedDBValue('JUMP_TOTAL_COINS', '1234');
    id = await loadIdentity();
    expect(await id.resolveTotalCoinsAsync()).toBe(1234);
    expect(id.getStoredTotalCoinsSync()).toBe(1234);
  });

  it('infers a lower bound from unlocked shop items using real prices', async () => {
    const { secureStorage } = await import('../src/secureStorage');
    secureStorage.setItem('JUMP_INVENTORY', { autocruise2: true });
    const id = await loadIdentity();
    expect(await id.resolveTotalCoinsAsync({ autocruise2: 50000, lithuanian: 100000 })).toBe(50000);
  });

  it('does not inflate coins when inventory is empty', async () => {
    const id = await loadIdentity();
    id.persistTotalCoins(321);
    expect(await id.resolveTotalCoinsAsync({ autocruise2: 50000 })).toBe(321);
  });
});

describe('player identifier', () => {
  it('generates exactly one PID for concurrent callers on an empty device', async () => {
    const id = await loadIdentity();
    const pids = await Promise.all([1, 2, 3, 4, 5].map(() => id.resolvePlayerIdentifier()));
    expect(new Set(pids).size).toBe(1);
    expect(pids[0]).toMatch(/^p_[0-9a-f]{16}$/);
    await flush();
    expect(localStorage.getItem('LL_PID')).toBe(pids[0]);
    expect(cookie('ej_ll_pid')).toBe(pids[0]);
    expect(await id.getIndexedDBValue('LL_PID')).toBe(pids[0]);
  });

  it('restores the PID from the cookie', async () => {
    document.cookie = 'ej_ll_pid=p_cookiepid00001; path=/';
    const id = await loadIdentity();
    expect(await id.resolvePlayerIdentifier()).toBe('p_cookiepid00001');
    expect(localStorage.getItem('LL_PID')).toBe('p_cookiepid00001');
  });

  it('restores the PID from IndexedDB when localStorage and cookie are gone', async () => {
    let id = await loadIdentity();
    await id.setIndexedDBValue('LL_PID', 'p_idbpid000000001');
    id = await loadIdentity();
    expect(await id.resolvePlayerIdentifier()).toBe('p_idbpid000000001');
  });

  it('flags recovery mode when progress exists but the PID was lost', async () => {
    const { secureStorage } = await import('../src/secureStorage');
    secureStorage.setItem('EternalJumper_PB', { alt: 50000, coins: 10, time: 60000 });
    const id = await loadIdentity();
    await id.resolvePlayerIdentifier();
    expect(localStorage.getItem('LL_IS_DUPLICATE_BUG')).toBe('true');
  });
});

describe('player name', () => {
  it('keeps a valid LANG XX name', async () => {
    Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });
    localStorage.setItem('JUMP_PLAYER_NAME', 'JPN YN');
    const { getPlayerName } = await import('../src/utils');
    expect(getPlayerName()).toBe('JPN YN');
    expect(getPlayerName()).toBe('JPN YN');
  });

  it('keeps the name stable for unmapped languages (--- prefix)', async () => {
    Object.defineProperty(navigator, 'language', { value: 'sq-AL', configurable: true });
    const { getPlayerName } = await import('../src/utils');
    const first = getPlayerName();
    expect(first).toMatch(/^--- [A-Z0-9]{2}$/);
    expect(getPlayerName()).toBe(first);
    expect(getPlayerName()).toBe(first);
  });

  it('updates only the country prefix when the device language changes', async () => {
    Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });
    localStorage.setItem('JUMP_PLAYER_NAME', 'USA AB');
    const { getPlayerName } = await import('../src/utils');
    expect(getPlayerName()).toBe('JPN AB');
  });
});

describe('reset diagnostics', () => {
  it('records the old member ID when a new identifier is generated, without exposing identifiers', async () => {
    localStorage.setItem('LL_SYS_PLAYER_ID', '63616356');
    const id = await loadIdentity();
    const pid = await id.resolvePlayerIdentifier();
    const diag = id.getIdentityDiag();
    expect(diag).toContain('s=n;l=--;i=none;');
    expect(diag).toMatch(/o=\d+\|63616356\|0\|0\|none\|[a-z]+\.[a-z]+\.(app|tab);f=$/);
    expect(diag).not.toContain(pid);
  });

  it('reports the layer that supplied an existing identifier and keeps the origin stable', async () => {
    localStorage.setItem('LL_PID', 'p_existing');
    const id = await loadIdentity();
    await id.resolvePlayerIdentifier();
    await flush();
    expect(id.getIdentityDiag()).toContain('s=l;l=l-;i=none;');
    expect(id.getIdentityDiag()).toMatch(/o=;f=$/);
  });

  it('keeps a different identifier found in IndexedDB instead of overwriting it', async () => {
    const first = await loadIdentity();
    await first.setIndexedDBValue('LL_PID', 'p_older');
    localStorage.setItem('LL_PID', 'p_current');
    vi.resetModules();
    const id = await loadIdentity();
    await id.resolvePlayerIdentifier();
    await flush(30);
    expect(id.getIdentityDiag()).toContain('i=diff;');
    expect(id.getIdentityDiag()).toMatch(/f=\d+$/);
    expect(await id.getIndexedDBValue('LL_PID_PREV')).toBe('p_older');
    expect(await id.getIndexedDBValue('LL_PID')).toBe('p_current');
  });

  it('retries a failed IndexedDB read before generating a new identifier', async () => {
    const first = await loadIdentity();
    await first.setIndexedDBValue('LL_PID', 'p_survivor');
    vi.resetModules();
    const realOpen = indexedDB.open.bind(indexedDB);
    let failures = 1;
    vi.spyOn(indexedDB, 'open').mockImplementation((...args: [string, number?]) => {
      if (failures-- > 0) throw new Error('transient');
      return realOpen(...args);
    });
    const id = await loadIdentity();
    expect(await id.resolvePlayerIdentifier()).toBe('p_survivor');
    expect(id.getIdentityDiag()).toContain('s=i;');
  });

  it('asks for persistent storage silently, but never on Firefox', async () => {
    const persist = vi.fn(async () => true);
    Object.defineProperty(navigator, 'storage', { value: { persisted: async () => false, persist }, configurable: true });
    const id = await loadIdentity();
    await id.requestPersistentStorage();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(id.getIdentityDiag()).toContain('p=1;');

    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/130.0');
    persist.mockClear();
    await id.requestPersistentStorage();
    expect(persist).not.toHaveBeenCalled();
    ua.mockRestore();
    delete (navigator as any).storage;
  });
});
